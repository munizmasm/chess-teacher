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
      setTest({ state: 'ok', msg: 'Valid key! ✅' })
    } catch (err) {
      setTest({ state: 'err', msg: err instanceof Error ? err.message : 'Failed.' })
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="card flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-white">Settings</h1>

        {/* API key */}
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-100/80">
            Claude API key (Anthropic)
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
              {test.state === 'loading' ? 'Testing…' : 'Test key'}
            </button>
            {test.msg && (
              <span className={`text-xs ${test.state === 'ok' ? 'text-accent-soft' : 'text-mark-missed'}`}>
                {test.msg}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-100/50">
            Get your key at{' '}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer"
              className="text-accent-soft underline"
            >
              console.anthropic.com
            </a>
            . It is stored <strong>only on this device</strong> (localStorage) and never leaves it
            except to Anthropic's own API.
          </p>
        </div>

        {/* Model */}
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-100/80">Tutor model</label>
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

        {/* Engine depth */}
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-100/80">
            Stockfish depth: <span className="font-mono text-accent-soft">{engineDepth}</span>
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
            More depth = more accurate analysis, but slower (especially on mobile).
          </p>
        </div>
      </div>

      <div className="card flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-white">Clear history</div>
          <div className="text-xs text-ink-100/50">Removes the games and patterns saved on this device.</div>
        </div>
        <button
          className="btn-ghost text-sm text-mark-missed"
          onClick={() => {
            if (confirm('Clear all games and patterns saved on this device?')) onClearData()
          }}
        >
          Clear all
        </button>
      </div>
    </div>
  )
}
