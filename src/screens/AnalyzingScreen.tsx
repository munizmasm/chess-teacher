import type { ReactNode } from 'react'
import type { AnalyzeProgress } from '@/lib/analysis'
import { Spinner } from '@/components/bits'

function pct(p: AnalyzeProgress | null): number {
  if (!p) return 0
  if (p.phase === 'parse') return 3
  if (p.phase === 'triage') return 5
  if (p.phase === 'engine') return 8 + (p.total ? (p.current / p.total) * 42 : 0)
  if (p.phase === 'tutor') return 50 + (p.total ? (p.current / p.total) * 50 : 0)
  return 100
}

export default function AnalyzingScreen({ progress }: { progress: AnalyzeProgress | null }) {
  const value = Math.round(pct(progress))
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <div className="card flex flex-col gap-5">
        <h1 className="text-xl font-semibold text-white">Analyzing your game…</h1>
        <Spinner label={progress?.label ?? 'Getting ready…'} />
        <div className="h-3 w-full overflow-hidden rounded-full bg-ink-700">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${value}%` }}
          />
        </div>
        <ol className="space-y-2 text-sm text-ink-100/70">
          <Step done={value >= 8} active={progress?.phase === 'parse' || progress?.phase === 'triage'}>
            Reading the PGN and selecting the moves worth studying
          </Step>
          <Step done={value >= 50} active={progress?.phase === 'engine'}>
            Calculating the best line with Stockfish
          </Step>
          <Step done={value >= 100} active={progress?.phase === 'tutor'}>
            Tutor preparing the explanations
          </Step>
        </ol>
        <p className="text-xs text-ink-100/50">
          The first analysis loads the engine (~7&nbsp;MB) — then it's cached and runs offline.
        </p>
      </div>
    </div>
  )
}

function Step({
  done,
  active,
  children,
}: {
  done: boolean
  active?: boolean
  children: ReactNode
}) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
          done ? 'bg-accent text-ink-900' : active ? 'bg-accent/30 text-white' : 'bg-ink-700'
        }`}
      >
        {done ? '✓' : '•'}
      </span>
      <span className={active ? 'text-white' : ''}>{children}</span>
    </li>
  )
}
