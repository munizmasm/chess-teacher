import { createStore, get, set, del } from 'idb-keyval'
import type { AnalyzedGame, PatternAnalysis } from '@/types'

// ───────────────────────────────────────────────────────────────────────────
// Persistência local (IndexedDB). Sem backend, sem DB pago.
// ───────────────────────────────────────────────────────────────────────────

const store = createStore('chess-teacher', 'kv')
const GAMES_KEY = 'games'
const PATTERNS_KEY = 'patterns'

export const MAX_GAMES = 30

export async function getGames(): Promise<AnalyzedGame[]> {
  return (await get<AnalyzedGame[]>(GAMES_KEY, store)) ?? []
}

export async function getGame(id: string): Promise<AnalyzedGame | undefined> {
  const games = await getGames()
  return games.find((g) => g.id === id)
}

export interface SaveResult {
  duplicate: boolean
  game: AnalyzedGame
}

/**
 * Salva um jogo no ring buffer (máx. 30, mais recente primeiro).
 * Se o ID já existir, NÃO recontabiliza — devolve o jogo existente.
 */
export async function saveGame(game: AnalyzedGame): Promise<SaveResult> {
  const games = await getGames()
  const existing = games.find((g) => g.id === game.id)
  if (existing) return { duplicate: true, game: existing }
  const next = [game, ...games].slice(0, MAX_GAMES)
  await set(GAMES_KEY, next, store)
  return { duplicate: false, game }
}

export async function deleteGame(id: string): Promise<void> {
  const games = await getGames()
  await set(
    GAMES_KEY,
    games.filter((g) => g.id !== id),
    store,
  )
}

export async function clearAll(): Promise<void> {
  await del(GAMES_KEY, store)
  await del(PATTERNS_KEY, store)
}

export async function getPatterns(): Promise<PatternAnalysis | null> {
  return (await get<PatternAnalysis>(PATTERNS_KEY, store)) ?? null
}

export async function setPatterns(p: PatternAnalysis): Promise<void> {
  await set(PATTERNS_KEY, p, store)
}
