import type { View } from '@/store/useApp'

interface Props {
  view: View
  onNav: (v: View) => void
}

const TABS: { v: View; label: string; icon: string }[] = [
  { v: 'import', label: 'Import', icon: '➕' },
  { v: 'history', label: 'History', icon: '📊' },
  { v: 'settings', label: 'Settings', icon: '⚙️' },
]

export default function Header({ view, onNav }: Props) {
  return (
    <header className="sticky top-0 z-10 border-b border-white/5 bg-ink-900/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <button onClick={() => onNav('import')} className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-board-dark text-board-light">
            ♞
          </span>
          <span className="text-base font-semibold text-white">Chess Teacher</span>
        </button>
        <nav className="flex gap-1">
          {TABS.map((t) => {
            const active = view === t.v
            return (
              <button
                key={t.v}
                onClick={() => onNav(t.v)}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  active ? 'bg-accent/15 text-white' : 'text-ink-100/70 hover:bg-ink-700'
                }`}
              >
                <span className="mr-1">{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
