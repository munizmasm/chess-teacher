import type { Category, Classification } from '@/types'

// ───────────────────────────────────────────────────────────────────────────
// Fixed concept taxonomy (used for error tags and pattern analysis)
// ───────────────────────────────────────────────────────────────────────────

export interface ConceptDef {
  tag: string
  label: string
  group: string
}

export const CONCEPTS: ConceptDef[] = [
  // Opening
  { tag: 'development', label: 'Piece development', group: 'Opening' },
  { tag: 'center_control', label: 'Center control', group: 'Opening' },
  { tag: 'king_safety', label: 'King safety / castling', group: 'Opening' },
  { tag: 'move_order', label: 'Move order', group: 'Opening' },
  // Tactics
  { tag: 'fork', label: 'Fork', group: 'Tactics' },
  { tag: 'pin', label: 'Pin', group: 'Tactics' },
  { tag: 'x_ray', label: 'X-ray / skewer', group: 'Tactics' },
  { tag: 'discovered_attack', label: 'Discovered attack', group: 'Tactics' },
  { tag: 'hanging_piece', label: 'Hanging piece', group: 'Tactics' },
  { tag: 'deflection', label: 'Deflection / decoy', group: 'Tactics' },
  { tag: 'in_between_move', label: 'In-between move (zwischenzug)', group: 'Tactics' },
  // Positional
  { tag: 'pawn_structure', label: 'Pawn structure', group: 'Positional' },
  { tag: 'isolated_passed_pawn', label: 'Isolated / passed pawn', group: 'Positional' },
  { tag: 'weak_squares', label: 'Weak squares / holes', group: 'Positional' },
  { tag: 'bishop_pair', label: 'Bishop pair', group: 'Positional' },
  { tag: 'open_file', label: 'Open file', group: 'Positional' },
  { tag: 'space', label: 'Space', group: 'Positional' },
  { tag: 'bad_piece', label: 'Bad piece (bad bishop, etc.)', group: 'Positional' },
  { tag: 'initiative', label: 'Initiative / tempo', group: 'Positional' },
  // Defense
  { tag: 'defend_piece', label: 'Defending an attacked piece', group: 'Defense' },
  { tag: 'prophylaxis', label: 'Prophylaxis', group: 'Defense' },
  { tag: 'simplify_under_pressure', label: 'Simplify under pressure', group: 'Defense' },
  { tag: 'positional_defense', label: 'Positional defense', group: 'Defense' },
  // Endgames
  { tag: 'opposition', label: 'Opposition', group: 'Endgames' },
  { tag: 'active_king', label: 'Active king in the endgame', group: 'Endgames' },
  { tag: 'square_rule', label: 'Rule of the square', group: 'Endgames' },
  { tag: 'rook_behind_passed_pawn', label: 'Rook behind the passed pawn', group: 'Endgames' },
  // Calculation
  { tag: 'count_attackers_defenders', label: 'Count attackers vs defenders', group: 'Calculation' },
  { tag: 'check_captures_threats', label: 'Check checks/captures/threats', group: 'Calculation' },
]

export const CONCEPT_TAGS = CONCEPTS.map((c) => c.tag)

const CONCEPT_BY_TAG = new Map(CONCEPTS.map((c) => [c.tag, c]))

export function conceptLabel(tag: string): string {
  return CONCEPT_BY_TAG.get(tag)?.label ?? tag
}

// ───────────────────────────────────────────────────────────────────────────
// Classification (chess.com) → display category + visual style
// ───────────────────────────────────────────────────────────────────────────

export interface CategoryStyle {
  category: Category
  marker: string // ?!, ?, ??, X, !
  color: string // hex (Tailwind mark.*)
  isStudy: boolean
}

const POSITIVE: Classification[] = ['Brilliant', 'Great', 'Best', 'Excellent']

export function classify(c: Classification): CategoryStyle | null {
  switch (c) {
    case 'Inaccuracy':
      return { category: 'Inaccuracy', marker: '?!', color: '#f5c542', isStudy: true }
    case 'Mistake':
      return { category: 'Mistake', marker: '?', color: '#e8862e', isStudy: true }
    case 'Blunder':
      return { category: 'Blunder', marker: '??', color: '#b33430', isStudy: true }
    case 'Miss':
      return { category: 'Miss', marker: 'X', color: '#e06666', isStudy: true }
    default:
      if (POSITIVE.includes(c)) {
        return { category: 'Excellent', marker: '!', color: '#5b9bd5', isStudy: false }
      }
      return null // Good / Book → ignored
  }
}

/** Color (rgba) by the friendly name used by the Tutor in highlights. */
export function highlightColor(name?: string): string {
  switch ((name ?? '').toLowerCase()) {
    case 'green':
      return 'rgba(122, 170, 80, 0.9)'
    case 'blue':
      return 'rgba(91, 155, 213, 0.9)'
    case 'yellow':
      return 'rgba(245, 197, 66, 0.9)'
    case 'orange':
      return 'rgba(232, 134, 46, 0.95)'
    case 'red':
      return 'rgba(179, 52, 48, 0.95)'
    default:
      return 'rgba(122, 170, 80, 0.9)'
  }
}
