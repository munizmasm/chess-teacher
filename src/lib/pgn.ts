import { Chess } from 'chess.js'
import type { Classification, Color, GameMeta, ParsedGame, ParsedMove } from '@/types'

// ───────────────────────────────────────────────────────────────────────────
// Parser de PGN do chess.com (com destaques c_effect / NAGs)
// ───────────────────────────────────────────────────────────────────────────

const HEADER_LINE = /^\s*\[\s*\w+\s+"[^"]*"\s*\]\s*$/
const HEADER_RE = /\[\s*(\w+)\s+"([^"]*)"\s*\]/g

const NAG_TO_CLASS: Record<number, Classification> = {
  1: 'Excellent',
  2: 'Mistake',
  3: 'Brilliant',
  4: 'Blunder',
  6: 'Inaccuracy',
}

const KNOWN_CLASS = new Set<string>([
  'Brilliant',
  'Great',
  'Best',
  'Excellent',
  'Good',
  'Book',
  'Inaccuracy',
  'Mistake',
  'Blunder',
  'Miss',
])

export class PgnError extends Error {}

interface RawMove {
  san: string
  nag?: number
  comment?: string
}

/** Extrai os cabeçalhos `[Tag "valor"]`. */
function parseHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const m of pgn.matchAll(HEADER_RE)) {
    headers[m[1]] = m[2]
  }
  return headers
}

/** Remove as linhas de cabeçalho, devolvendo só o movetext. */
function extractMovetext(pgn: string): string {
  return pgn
    .split(/\r?\n/)
    .filter((line) => !HEADER_LINE.test(line))
    .join('\n')
    .trim()
}

/** Remove variações entre parênteses (não usamos as linhas alternativas do PGN). */
function stripVariations(movetext: string): string {
  let prev: string
  let cur = movetext
  do {
    prev = cur
    cur = cur.replace(/\([^()]*\)/g, ' ')
  } while (cur !== prev)
  return cur
}

const TOKEN_RE =
  /(\{[^}]*\})|(\$\d+)|(\d+\.(?:\.\.)?)|(1-0|0-1|1\/2-1\/2|\*)|([^\s{}()]+)/g

/** Tokeniza o movetext em lances com NAG e comentário associados. */
function tokenizeMovetext(movetext: string): RawMove[] {
  const clean = stripVariations(movetext)
  const moves: RawMove[] = []
  let cur: RawMove | null = null

  for (const m of clean.matchAll(TOKEN_RE)) {
    if (m[1]) {
      // comentário {...}
      if (cur) {
        const inner = m[1].slice(1, -1).trim()
        cur.comment = cur.comment ? `${cur.comment} ${inner}` : inner
      }
    } else if (m[2]) {
      // NAG $n
      if (cur && cur.nag === undefined) cur.nag = parseInt(m[2].slice(1), 10)
    } else if (m[3] || m[4]) {
      // número do lance ou resultado → ignora
      continue
    } else if (m[5]) {
      const san = m[5].replace(/[!?]+$/, '').trim()
      if (!san || san === '...') continue
      cur = { san }
      moves.push(cur)
    }
  }
  return moves
}

/** Lê todos os efeitos `[%c_effect ...]` de um comentário → mapa casa → tipo. */
function parseCEffect(comment?: string): Map<string, Classification> {
  const out = new Map<string, Classification>()
  if (!comment) return out
  const m = comment.match(/\[%c_effect\s+([^\]]+)\]/)
  if (!m) return out
  for (const entry of m[1].split(',')) {
    const tokens = entry.split(';').map((t) => t.trim())
    const square = tokens[0]
    const typeIdx = tokens.indexOf('type')
    const type = typeIdx >= 0 ? tokens[typeIdx + 1] : undefined
    if (square && type && KNOWN_CLASS.has(type)) {
      out.set(square, type as Classification)
    }
  }
  return out
}

/** Deriva a classificação do lance a partir do c_effect (preferencial) ou NAG. */
function deriveClassification(raw: RawMove, toSquare: string): Classification | undefined {
  const effects = parseCEffect(raw.comment)
  const bySquare = effects.get(toSquare)
  if (bySquare) return bySquare
  // Se houver exatamente um efeito, assume que é o do lance.
  if (effects.size === 1) return [...effects.values()][0]
  if (raw.nag !== undefined && NAG_TO_CLASS[raw.nag]) return NAG_TO_CLASS[raw.nag]
  return undefined
}

/** Hash estável (FNV-1a) para fallback de ID. */
function fnv1a(str: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return 'h' + (h >>> 0).toString(36)
}

function deriveGameId(headers: Record<string, string>, movetext: string): string {
  const link = headers.Link ?? headers.link
  if (link) {
    const num = link.match(/(\d{5,})/)
    if (num) return num[1]
  }
  const basis = `${headers.White ?? ''}|${headers.Black ?? ''}|${headers.Date ?? ''}|${movetext}`
  return fnv1a(basis)
}

function buildMeta(h: Record<string, string>): GameMeta {
  return {
    event: h.Event,
    white: h.White ?? 'Brancas',
    black: h.Black ?? 'Pretas',
    date: h.Date ?? h.UTCDate,
    eco: h.ECO,
    ecoUrl: h.ECOUrl,
    result: h.Result,
    link: h.Link,
    whiteElo: h.WhiteElo,
    blackElo: h.BlackElo,
    timeControl: h.TimeControl,
  }
}

/**
 * Faz o parse completo do PGN: cabeçalhos, lances (com FEN antes/depois),
 * classificações e ID do jogo.
 */
export function parsePgn(pgn: string): ParsedGame {
  const trimmed = pgn.trim()
  if (!trimmed) throw new PgnError('Cole um PGN para analisar.')

  const headers = parseHeaders(trimmed)
  const movetext = extractMovetext(trimmed)
  if (!movetext) throw new PgnError('Não encontrei lances no PGN.')

  const rawMoves = tokenizeMovetext(movetext)
  if (rawMoves.length === 0) throw new PgnError('Não consegui ler os lances deste PGN.')

  const chess = new Chess()
  const moves: ParsedMove[] = []
  let hasAnnotations = false

  rawMoves.forEach((raw, i) => {
    const fenBefore = chess.fen()
    let mv
    try {
      mv = chess.move(raw.san)
    } catch {
      throw new PgnError(
        `Lance inválido no PGN: "${raw.san}" (lance ${Math.ceil((i + 1) / 2)}). Verifique se colou o PGN completo.`,
      )
    }
    const classification = deriveClassification(raw, mv.to)
    if (classification) hasAnnotations = true
    moves.push({
      ply: i + 1,
      moveNumber: Math.ceil((i + 1) / 2),
      color: mv.color === 'w' ? 'white' : 'black',
      san: mv.san,
      from: mv.from,
      to: mv.to,
      nag: raw.nag,
      comment: raw.comment,
      classification,
      fenBefore,
      fenAfter: chess.fen(),
    })
  })

  return {
    meta: buildMeta(headers),
    moves,
    gameId: deriveGameId(headers, movetext),
    hasAnnotations,
  }
}

/** Tenta inferir a cor do usuário pelo nome (compara com White/Black). */
export function guessUserColor(meta: GameMeta, username?: string): Color | undefined {
  if (!username) return undefined
  const u = username.trim().toLowerCase()
  if (meta.white.toLowerCase() === u) return 'white'
  if (meta.black.toLowerCase() === u) return 'black'
  return undefined
}
