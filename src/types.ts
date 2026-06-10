// ───────────────────────────────────────────────────────────────────────────
// Tipos centrais do Chess Teacher
// ───────────────────────────────────────────────────────────────────────────

export type Color = 'white' | 'black'

/** Classificação crua vinda do chess.com (c_effect type / NAG). */
export type Classification =
  | 'Brilliant'
  | 'Great'
  | 'Best'
  | 'Excellent'
  | 'Good'
  | 'Book'
  | 'Inaccuracy'
  | 'Mistake'
  | 'Blunder'
  | 'Miss'

/** Categoria exibida ao usuário (PT-BR). */
export type Category = 'Imprecisão' | 'Erro' | 'Capivarada' | 'Chance perdida' | 'Excelente'

export type Phase = 'abertura' | 'meio-jogo' | 'final'

/** Lance individual extraído do PGN. */
export interface ParsedMove {
  ply: number // 1-based
  moveNumber: number // número do lance completo
  color: Color
  san: string
  from: string
  to: string
  nag?: number
  comment?: string
  classification?: Classification
  fenBefore: string
  fenAfter: string
}

export interface ParsedGame {
  meta: GameMeta
  moves: ParsedMove[]
  gameId: string
  hasAnnotations: boolean
}

export interface GameMeta {
  event?: string
  white: string
  black: string
  date?: string
  eco?: string
  ecoUrl?: string
  result?: string
  link?: string
  whiteElo?: string
  blackElo?: string
  timeControl?: string
}

/** Linha (PV) calculada pelo motor a partir da posição do erro. */
export interface EngineLine {
  sanMoves: string[]
  uciMoves: string[]
  fens: string[] // fen após cada ply da linha (mesmo tamanho de sanMoves)
  froms: string[]
  tos: string[]
  depth: number
  evalCp?: number // centésimos de peão, POV do usuário
  mate?: number // POV do usuário (>0 = usuário dá mate)
}

export interface LessonVariationStep {
  lance: string // SAN
  nota: string
}

export type LessonHighlight =
  | { tipo: 'seta'; de: string; para: string; cor?: string }
  | { tipo: 'casa'; casa: string; cor?: string }

/** Lição estruturada gerada pelo Tutor (Claude). */
export interface Lesson {
  categoria: string
  tags_conceito: string[]
  resposta: string
  variacao: LessonVariationStep[]
  destaques: LessonHighlight[]
}

/** Um ponto de estudo (lance ruim do usuário). */
export interface StudyPoint {
  id: string
  ply: number
  moveNumber: number
  color: Color
  san: string // lance que o usuário jogou (ruim)
  from: string
  to: string
  category: Category
  classification: Classification
  fenBefore: string
  fenAfter: string
  bestLine?: EngineLine
  evalBestCp?: number // POV do usuário
  evalBestMate?: number
  evalPlayedCp?: number // POV do usuário
  evalPlayedMate?: number
  cpLoss?: number
  lesson?: Lesson
  lessonError?: string
}

export interface ErrorTag {
  tag: string
  categoria: Category
  fase: Phase
  cor: Color
}

export interface AnalyzedGame {
  id: string
  importadoEm: number
  meta: GameMeta
  corUsuario: Color
  pgn: string
  pontos: StudyPoint[]
  tagsErro: ErrorTag[]
}

export interface PatternFocus {
  titulo: string
  descricao: string
  tags: string[]
  cor?: Color | 'ambas'
}

export interface PatternAnalysis {
  geradoEm: number
  baseadoEmJogos: number
  resumo: string
  focos: PatternFocus[]
}

export type ClaudeModel = 'claude-sonnet-4-6' | 'claude-opus-4-8' | 'claude-haiku-4-5-20251001'
