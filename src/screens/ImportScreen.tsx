import { useState, type ReactNode } from 'react'
import type { Color } from '@/types'
import { SAMPLE_PGN } from '@/lib/samplePgn'
import { Legend } from '@/components/bits'

interface Props {
  apiKeyMissing: boolean
  error: string | null
  onAnalyze: (pgn: string, color: Color) => void
  onGoSettings: () => void
}

export default function ImportScreen({ apiKeyMissing, error, onAnalyze, onGoSettings }: Props) {
  const [pgn, setPgn] = useState('')
  const [color, setColor] = useState<Color>('white')

  const canAnalyze = pgn.trim().length > 0 && !apiKeyMissing

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="card flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Import game</h1>
          <p className="mt-1 text-sm text-ink-100/70">
            Paste the PGN of a game <strong>already reviewed</strong> on chess.com (with Game
            Review). The Tutor will explain the <em>why</em> behind each of your bad moves.
          </p>
        </div>

        {apiKeyMissing && (
          <div className="rounded-lg border border-mark-inaccuracy/40 bg-mark-inaccuracy/10 p-3 text-sm">
            ⚠️ You haven't set your Claude API key yet.{' '}
            <button className="font-semibold text-accent-soft underline" onClick={onGoSettings}>
              Open Settings
            </button>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-100/80">Game PGN</label>
          <textarea
            value={pgn}
            onChange={(e) => setPgn(e.target.value)}
            spellCheck={false}
            placeholder="Paste the PGN exported from chess.com here…"
            className="h-44 w-full resize-y rounded-lg border border-white/10 bg-ink-900 p-3 font-mono text-xs text-ink-100 outline-none focus:border-accent"
          />
          <button
            className="mt-1 text-xs text-accent-soft underline"
            onClick={() => {
              setPgn(SAMPLE_PGN)
              setColor('black')
            }}
          >
            Use sample PGN
          </button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-100/80">
            Which color did you play?
          </label>
          <div className="flex gap-2">
            <ColorButton active={color === 'white'} onClick={() => setColor('white')}>
              ⚪ White
            </ColorButton>
            <ColorButton active={color === 'black'} onClick={() => setColor('black')}>
              ⚫ Black
            </ColorButton>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-mark-blunder/50 bg-mark-blunder/10 p-3 text-sm text-mark-missed">
            {error}
          </div>
        )}

        <button
          className="btn-primary w-full text-base"
          disabled={!canAnalyze}
          onClick={() => onAnalyze(pgn, color)}
        >
          Analyze game
        </button>
      </div>

      <div className="card">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-100/50">
          Highlights legend
        </p>
        <Legend />
      </div>
    </div>
  )
}

function ColorButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'border-accent bg-accent/15 text-white'
          : 'border-white/10 bg-ink-700 text-ink-100/80 hover:bg-ink-600'
      }`}
    >
      {children}
    </button>
  )
}
