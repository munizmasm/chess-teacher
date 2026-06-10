import { create } from 'zustand'
import type { AnalyzedGame, PatternAnalysis } from '@/types'

export type View = 'import' | 'analyzing' | 'study' | 'history' | 'settings'

interface AppState {
  view: View
  activeGame: AnalyzedGame | null
  currentPointIndex: number
  patterns: PatternAnalysis | null
  lastSaveDuplicate: boolean

  setView: (v: View) => void
  openGame: (game: AnalyzedGame, duplicate?: boolean) => void
  closeGame: () => void
  setPointIndex: (i: number) => void
  nextPoint: () => void
  prevPoint: () => void
  setPatterns: (p: PatternAnalysis | null) => void
}

export const useApp = create<AppState>((set, get) => ({
  view: 'import',
  activeGame: null,
  currentPointIndex: 0,
  patterns: null,
  lastSaveDuplicate: false,

  setView: (v) => set({ view: v }),
  openGame: (game, duplicate = false) =>
    set({ activeGame: game, currentPointIndex: 0, view: 'study', lastSaveDuplicate: duplicate }),
  closeGame: () => set({ activeGame: null, currentPointIndex: 0, view: 'import' }),
  setPointIndex: (i) => {
    const g = get().activeGame
    if (!g) return
    set({ currentPointIndex: Math.max(0, Math.min(i, g.pontos.length - 1)) })
  },
  nextPoint: () => {
    const { activeGame, currentPointIndex } = get()
    if (!activeGame) return
    set({ currentPointIndex: Math.min(currentPointIndex + 1, activeGame.pontos.length - 1) })
  },
  prevPoint: () => {
    const { currentPointIndex } = get()
    set({ currentPointIndex: Math.max(currentPointIndex - 1, 0) })
  },
  setPatterns: (p) => set({ patterns: p }),
}))
