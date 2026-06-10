import { Chess } from 'chess.js'
import type { Classification, Color, GameMeta, ParsedGame, ParsedMove } from '@/types'

// ───────────────────────────────────────────────────────────────────────────
// chess.com PGN parser (with c_effect highlights / NAGs)
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

/** Extracts the `[Tag "value"]` headers. */
function parseHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const m of pgn.matchAll(HEADER_RE)) {
    headers[m[1]] = m[2]
  }
  return headers
}

/** Removes the header lines, returning only the movetext. */
function extractMovetext(pgn: string): string {
  return pgn
    .split(/\r?\n/)
    .filter((line) => !HEADER_LINE.test(line))
    .join('\n')
    .trim()
}

/** Removes parenthesized variations (we don't use the PGN's alternative lines). */
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

/** Tokenizes the movetext into moves with their associated NAG and comment. */
function tokenizeMovetext(movetext: string): RawMove[] {
  const clean = stripVariations(movetext)
  const moves: RawMove[] = []
  let cur: RawMove | null = null

  for (const m of clean.matchAll(TOKEN_RE)) {
    if (m[1]) {
      // comment {...}
      if (cur) {
        const inner = m[1].slice(1, -1).trim()
        cur.comment = cur.comment ? `${cur.comment} ${inner}` : inner
      }
    } else if (m[2]) {
      // NAG $n
      if (cur && cur.nag === undefined) cur.nag = parseInt(m[2].slice(1), 10)
    } else if (m[3] || m[4]) {
      // move number or result → ignore
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

/** Reads all `[%c_effect ...]` entries from a comment → map of square → type. */
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

/** Derives the move classification from c_effect (preferred) or NAG. */
function deriveClassification(raw: RawMove, toSquare: string): Classification | undefined {
  const effects = parseCEffect(raw.comment)
  const bySquare = effects.get(toSquare)
  if (bySquare) return bySquare
  // If there is exactly one effect, assume it belongs to this move.
  if (effects.size === 1) return [...effects.values()][0]
  if (raw.nag !== undefined && NAG_TO_CLASS[raw.nag]) return NAG_TO_CLASS[raw.nag]
  return undefined
}

/** Stable hash (FNV-1a) for the id fallback. */
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
    white: h.White ?? 'White',
    black: h.Black ?? 'Black',
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
 * Full PGN parse: headers, moves (with fen before/after), classifications and
 * game id.
 */
export function parsePgn(pgn: string): ParsedGame {
  const trimmed = pgn.trim()
  if (!trimmed) throw new PgnError('Paste a PGN to analyze.')

  const headers = parseHeaders(trimmed)
  const movetext = extractMovetext(trimmed)
  if (!movetext) throw new PgnError('No moves found in the PGN.')

  const rawMoves = tokenizeMovetext(movetext)
  if (rawMoves.length === 0) throw new PgnError("Couldn't read the moves from this PGN.")

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
        `Invalid move in PGN: "${raw.san}" (move ${Math.ceil((i + 1) / 2)}). Make sure you pasted the full PGN.`,
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

/** Tries to infer the user's color from the username (matches White/Black). */
export function guessUserColor(meta: GameMeta, username?: string): Color | undefined {
  if (!username) return undefined
  const u = username.trim().toLowerCase()
  if (meta.white.toLowerCase() === u) return 'white'
  if (meta.black.toLowerCase() === u) return 'black'
  return undefined
}
