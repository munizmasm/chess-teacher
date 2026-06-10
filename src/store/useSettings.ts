import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ClaudeModel } from '@/types'

interface SettingsState {
  apiKey: string
  model: ClaudeModel
  engineDepth: number
  setApiKey: (v: string) => void
  setModel: (v: ClaudeModel) => void
  setEngineDepth: (v: number) => void
}

export const MODEL_OPTIONS: { value: ClaudeModel; label: string; hint: string }[] = [
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', hint: 'Balanced (recommended)' },
  { value: 'claude-opus-4-8', label: 'Claude Opus 4.8', hint: 'Deeper explanations' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', hint: 'Faster and cheaper' },
]

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: '',
      model: 'claude-sonnet-4-6',
      engineDepth: 16,
      setApiKey: (v) => set({ apiKey: v.trim() }),
      setModel: (v) => set({ model: v }),
      setEngineDepth: (v) => set({ engineDepth: Math.max(10, Math.min(22, Math.round(v))) }),
    }),
    { name: 'chess-teacher-settings' },
  ),
)
