// Copia o motor Stockfish (lite single-threaded) de node_modules para public/engine.
// Roda no postinstall e via `npm run setup-engine`.
import { mkdir, copyFile, access } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const src = join(root, 'node_modules', 'stockfish', 'bin')
const dest = join(root, 'public', 'engine')

const FILES = ['stockfish-18-lite-single.js', 'stockfish-18-lite-single.wasm']

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  if (!(await exists(src))) {
    console.warn('[copy-engine] node_modules/stockfish/bin não encontrado — pulei a cópia.')
    return
  }
  await mkdir(dest, { recursive: true })
  for (const f of FILES) {
    await copyFile(join(src, f), join(dest, f))
    console.log(`[copy-engine] ${f} -> public/engine/`)
  }
}

main().catch((err) => {
  console.error('[copy-engine] falhou:', err)
  process.exitCode = 1
})
