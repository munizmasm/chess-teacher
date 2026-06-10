import { useState } from 'react'
import type { ClaudeModel } from '@/types'
import { MODEL_OPTIONS } from '@/store/useSettings'
import { pingApiKey } from '@/lib/anthropic'

interface Props {
  apiKey: string
  model: ClaudeModel
  engineDepth: number
  setApiKey: (v: string) => void
  setModel: (v: ClaudeModel) => void
  setEngineDepth: (v: number) => void
  onClearData: () => void
}

export default function SettingsScreen({
  apiKey,
  model,
  engineDepth,
  setApiKey,
  setModel,
  setEngineDepth,
  onClearData,
}: Props) {
  const [test, setTest] = useState<{ state: 'idle' | 'loading' | 'ok' | 'err'; msg?: string }>({
    state: 'idle',
  })

  async function handleTest() {
    setTest({ state: 'loading' })
    try {
      await pingApiKey(apiKey, model)
      setTest({ state: 'ok', msg: 'Chave válida! ✅' })
    } catch (err) {
      setTest({ state: 'err', msg: err instanceof Error ? err.message : 'Falhou.' })
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="card flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-white">Configurações</h1>

        {/* Chave da API */}
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-100/80">
            Chave de API do Claude (Anthropic)
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value)
              setTest({ state: 'idle' })
            }}
            placeholder="sk-ant-…"
            autoComplete="off"
            className="w-full rounded-lg border border-white/10 bg-ink-900 p-2.5 font-mono text-sm text-ink-100 outline-none focus:border-accent"
          />
          <div className="mt-1 flex items-center gap-3">
            <button
              className="btn-ghost text-xs"
              disabled={!apiKey || test.state === 'loading'}
              onClick={handleTest}
            >
              {test.state === 'loading' ? 'Testando…' : 'Testar chave'}
            </button>
            {test.msg && (
              <span className={`text-xs ${test.state === 'ok' ? 'text-accent-soft' : 'text-mark-missed'}`}>
                {test.msg}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-100/50">
            Pegue sua chave em{' '}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer"
              className="text-accent-soft underline"
            >
              console.anthropic.com
            </a>
            . Ela fica salva <strong>só neste aparelho</strong> (localStorage) e nunca sai daqui a
            não ser para a própria API da Anthropic.
          </p>
        </div>

        {/* Modelo */}
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-100/80">Modelo do Tutor</label>
          <div className="flex flex-col gap-2">
            {MODEL_OPTIONS.map((m) => (
              <label
                key={m.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 ${
                  model === m.value ? 'border-accent bg-accent/10' : 'border-white/10 bg-ink-700'
                }`}
              >
                <input
                  type="radio"
                  name="model"
                  checked={model === m.value}
                  onChange={() => setModel(m.value)}
                  className="accent-accent"
                />
                <span className="text-sm text-white">{m.label}</span>
                <span className="ml-auto text-xs text-ink-100/50">{m.hint}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Profundidade do motor */}
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-100/80">
            Profundidade do Stockfish: <span className="font-mono text-accent-soft">{engineDepth}</span>
          </label>
          <input
            type="range"
            min={10}
            max={22}
            value={engineDepth}
            onChange={(e) => setEngineDepth(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <p className="text-xs text-ink-100/50">
            Mais profundidade = análise mais precisa, porém mais lenta (especialmente no celular).
          </p>
        </div>
      </div>

      <div className="card flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-white">Apagar histórico</div>
          <div className="text-xs text-ink-100/50">Remove os jogos e padrões salvos neste aparelho.</div>
        </div>
        <button
          className="btn-ghost text-sm text-mark-missed"
          onClick={() => {
            if (confirm('Apagar todos os jogos e padrões salvos neste aparelho?')) onClearData()
          }}
        >
          Apagar tudo
        </button>
      </div>
    </div>
  )
}
