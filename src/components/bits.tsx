import type { Category } from '@/types'
import { formatEval } from '@/lib/chessUtils'

const CATEGORY_STYLE: Record<Category, { marcador: string; cor: string }> = {
  Imprecisão: { marcador: '?!', cor: '#f5c542' },
  Erro: { marcador: '?', cor: '#e8862e' },
  Capivarada: { marcador: '??', cor: '#b33430' },
  'Chance perdida': { marcador: 'X', cor: '#e06666' },
  Excelente: { marcador: '!', cor: '#5b9bd5' },
}

export function categoryStyle(c: Category) {
  return CATEGORY_STYLE[c]
}

export function CategoryChip({ category, size = 'md' }: { category: Category; size?: 'sm' | 'md' }) {
  const s = CATEGORY_STYLE[category]
  return (
    <span
      className={`chip ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}
      style={{ backgroundColor: `${s.cor}22`, color: s.cor, border: `1px solid ${s.cor}55` }}
    >
      <span className="font-mono font-bold">{s.marcador}</span>
      {category}
    </span>
  )
}

export function Legend() {
  const items: Category[] = ['Excelente', 'Imprecisão', 'Erro', 'Chance perdida', 'Capivarada']
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((c) => (
        <CategoryChip key={c} category={c} size="sm" />
      ))}
    </div>
  )
}

export function EvalBadge({
  cp,
  mate,
  label,
  tone = 'neutral',
}: {
  cp?: number
  mate?: number
  label?: string
  tone?: 'good' | 'bad' | 'neutral'
}) {
  const txt = formatEval(cp, mate)
  const color =
    tone === 'good' ? 'text-accent-soft' : tone === 'bad' ? 'text-mark-missed' : 'text-ink-100'
  return (
    <div className="flex flex-col items-center rounded-lg bg-ink-700 px-3 py-1.5">
      {label && <span className="text-[10px] uppercase tracking-wide text-ink-100/60">{label}</span>}
      <span className={`font-mono text-sm font-semibold ${color}`}>{txt}</span>
    </div>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-ink-100/80">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}
