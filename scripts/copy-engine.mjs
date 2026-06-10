// Copies the Stockfish engine (lite single-threaded) from node_modules to public/engine.
// Runs on postinstall and via `npm run setup-engine`.
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
    console.warn('[copy-engine] node_modules/stockfish/bin not found — skipped the copy.')
    return
  }
  await mkdir(dest, { recursive: true })
  for (const f of FILES) {
    await copyFile(join(src, f), join(dest, f))
    console.log(`[copy-engine] ${f} -> public/engine/`)
  }
}

main().catch((err) => {
  console.error('[copy-engine] failed:', err)
  process.exitCode = 1
})
