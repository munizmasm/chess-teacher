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
          <h1 className="text-xl font-semibold text-white">Importar partida</h1>
          <p className="mt-1 text-sm text-ink-100/70">
            Cole o PGN da partida <strong>já analisada</strong> pelo chess.com (com a Revisão). O
            Tutor vai te explicar o <em>porquê</em> de cada lance ruim seu.
          </p>
        </div>

        {apiKeyMissing && (
          <div className="rounded-lg border border-mark-inaccuracy/40 bg-mark-inaccuracy/10 p-3 text-sm">
            ⚠️ Você ainda não configurou a chave de API do Claude.{' '}
            <button className="font-semibold text-accent-soft underline" onClick={onGoSettings}>
              Abrir Configurações
            </button>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-100/80">PGN da partida</label>
          <textarea
            value={pgn}
            onChange={(e) => setPgn(e.target.value)}
            spellCheck={false}
            placeholder="Cole aqui o PGN exportado do chess.com…"
            className="h-44 w-full resize-y rounded-lg border border-white/10 bg-ink-900 p-3 font-mono text-xs text-ink-100 outline-none focus:border-accent"
          />
          <button
            className="mt-1 text-xs text-accent-soft underline"
            onClick={() => {
              setPgn(SAMPLE_PGN)
              setColor('black')
            }}
          >
            Usar PGN de exemplo
          </button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-100/80">
            Você jogou de qual cor?
          </label>
          <div className="flex gap-2">
            <ColorButton active={color === 'white'} onClick={() => setColor('white')}>
              ⚪ Brancas
            </ColorButton>
            <ColorButton active={color === 'black'} onClick={() => setColor('black')}>
              ⚫ Pretas
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
          Analisar partida
        </button>
      </div>

      <div className="card">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-100/50">
          Legenda dos destaques
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
