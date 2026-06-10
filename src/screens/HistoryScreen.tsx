import type { AnalyzedGame, Category, PatternAnalysis } from '@/types'
import { CategoryChip, Spinner } from '@/components/bits'
import { conceptLabel } from '@/lib/concepts'
import Markdown from '@/components/Markdown'

interface Props {
  games: AnalyzedGame[]
  patterns: PatternAnalysis | null
  patternsLoading: boolean
  apiKeyMissing: boolean
  onOpen: (game: AnalyzedGame) => void
  onDelete: (id: string) => void
  onRefreshPatterns: () => void
}

const STUDY_CATS: Category[] = ['Inaccuracy', 'Mistake', 'Blunder', 'Miss']

export default function HistoryScreen({
  games,
  patterns,
  patternsLoading,
  apiKeyMissing,
  onOpen,
  onDelete,
  onRefreshPatterns,
}: Props) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {/* Improvement focuses */}
      <div className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white">🎯 Your improvement focuses</h1>
          <button
            className="btn-ghost text-xs"
            disabled={patternsLoading || apiKeyMissing || games.length === 0}
            onClick={onRefreshPatterns}
          >
            {patternsLoading ? 'Analyzing…' : 'Recalculate'}
          </button>
        </div>

        {patternsLoading ? (
          <Spinner label="Cross-referencing the patterns across your games…" />
        ) : patterns && patterns.focuses.length > 0 ? (
          <div className="flex flex-col gap-3">
            {patterns.summary && <p className="text-sm text-ink-100/80">{patterns.summary}</p>}
            {patterns.focuses.map((f, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-ink-900/60 p-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{f.title}</span>
                  {f.color && f.color !== 'both' && (
                    <span className="chip bg-ink-700 text-ink-100/70">
                      {f.color === 'white' ? '⚪ white' : '⚫ black'}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm text-ink-100/80">
                  <Markdown>{f.description}</Markdown>
                </div>
                {f.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {f.tags.map((t) => (
                      <span key={t} className="chip bg-accent/10 text-accent-soft">
                        {conceptLabel(t)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <p className="text-[11px] text-ink-100/40">
              Based on your last {patterns.basedOnGames} analyzed games.
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-100/60">
            {games.length === 0
              ? 'Analyze your first game to start building your diagnosis.'
              : 'No patterns computed yet. Click “Recalculate”.'}
          </p>
        )}
      </div>

      {/* Game list */}
      <div className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-medium uppercase tracking-wide text-ink-100/50">
          Analyzed games ({games.length}/30)
        </h2>
        {games.length === 0 && (
          <div className="card text-sm text-ink-100/60">No games analyzed yet.</div>
        )}
        {games.map((g) => (
          <GameRow key={g.id} game={g} onOpen={() => onOpen(g)} onDelete={() => onDelete(g.id)} />
        ))}
      </div>
    </div>
  )
}

function GameRow({
  game,
  onOpen,
  onDelete,
}: {
  game: AnalyzedGame
  onOpen: () => void
  onDelete: () => void
}) {
  const counts = STUDY_CATS.map((c) => ({
    c,
    n: game.points.filter((p) => p.category === c).length,
  })).filter((x) => x.n > 0)
  const opponent = game.userColor === 'white' ? game.meta.black : game.meta.white

  return (
    <div className="card flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-white">vs {opponent || '—'}</span>
          <span className="chip bg-ink-700 text-ink-100/70">
            {game.userColor === 'white' ? '⚪' : '⚫'}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-ink-100/50">
          {game.meta.date ?? ''} · {game.meta.eco ?? '—'} · {game.points.length} point(s)
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {counts.map((x) => (
            <span key={x.c} className="flex items-center gap-1">
              <CategoryChip category={x.c} size="sm" />
              <span className="text-xs text-ink-100/60">×{x.n}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5">
        <button className="btn-primary px-3 py-1.5 text-xs" onClick={onOpen}>
          Open
        </button>
        <button
          className="btn-ghost px-3 py-1.5 text-xs text-mark-missed"
          onClick={onDelete}
          title="Remove from history"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
