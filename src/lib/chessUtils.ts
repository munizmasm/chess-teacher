import { Chess } from 'chess.js'
import type { Phase } from '@/types'

export interface ConvertedLine {
  sanMoves: string[]
  uciMoves: string[]
  fens: string[]
  froms: string[]
  tos: string[]
}

/**
 * Converte uma sequência de lances UCI (PV do motor) em SAN + FENs,
 * partindo de `fenBefore`. Limita a `maxPlies`.
 */
export function uciToLine(fenBefore: string, uciMoves: string[], maxPlies = 10): ConvertedLine {
  const chess = new Chess(fenBefore)
  const out: ConvertedLine = { sanMoves: [], uciMoves: [], fens: [], froms: [], tos: [] }
  for (const uci of uciMoves.slice(0, maxPlies)) {
    const from = uci.slice(0, 2)
    const to = uci.slice(2, 4)
    const promotion = uci.length > 4 ? uci[4] : undefined
    try {
      const m = chess.move({ from, to, promotion })
      out.sanMoves.push(m.san)
      out.uciMoves.push(uci)
      out.fens.push(chess.fen())
      out.froms.push(m.from)
      out.tos.push(m.to)
    } catch {
      break
    }
  }
  return out
}

/** Formata avaliação (POV do usuário) em texto curto: +1.2 / -0.4 / M3 / -M2. */
export function formatEval(cp?: number, mate?: number): string {
  if (mate !== undefined && mate !== null) {
    return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`
  }
  if (cp === undefined || cp === null) return '—'
  const v = cp / 100
  return (v >= 0 ? '+' : '') + v.toFixed(1)
}

export function pieceCount(fen: string): number {
  const board = fen.split(' ')[0]
  let n = 0
  for (const ch of board) {
    if (/[a-zA-Z]/.test(ch)) n++
  }
  return n
}

export function detectPhase(fen: string, moveNumber: number): Phase {
  if (moveNumber <= 12) return 'abertura'
  if (pieceCount(fen) <= 12) return 'final'
  return 'meio-jogo'
}

/** Descrição curta de magnitude da perda (para a UI). */
export function lossLabel(cpLoss?: number): string {
  if (cpLoss === undefined) return ''
  const p = Math.round(cpLoss) / 100
  if (p <= 0) return ''
  return `−${p.toFixed(1)}`
}
