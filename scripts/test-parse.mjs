// Verificação headless do parser de PGN usando o código-fonte real (bundle via esbuild).
import { build } from 'esbuild'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { rm } from 'node:fs/promises'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, '.tmp-parse-test.mjs')

const ENTRY = `
import { parsePgn } from '@/lib/pgn'
import { SAMPLE_PGN } from '@/lib/samplePgn'
import { classify } from '@/lib/concepts'

const parsed = parsePgn(SAMPLE_PGN)
console.log('gameId =', parsed.gameId)
console.log('hasAnnotations =', parsed.hasAnnotations)
console.log('moves:')
for (const m of parsed.moves) {
  console.log('  ' + m.ply + ' ' + m.color + ' ' + m.san + '  [' + (m.classification ?? '-') + ']')
}
const blackStudy = parsed.moves.filter(
  (m) => m.color === 'black' && m.classification && classify(m.classification)?.isStudy,
)
console.log('PONTOS DE ESTUDO (pretas):', blackStudy.map((m) => m.moveNumber + '...' + m.san + ' (' + m.classification + ')').join(', ') || '(nenhum)')
const whiteStudy = parsed.moves.filter(
  (m) => m.color === 'white' && m.classification && classify(m.classification)?.isStudy,
)
console.log('(controle) pontos brancas:', whiteStudy.map((m) => m.moveNumber + '.' + m.san + ' (' + m.classification + ')').join(', ') || '(nenhum)')
`

await build({
  stdin: { contents: ENTRY, resolveDir: root, loader: 'ts', sourcefile: 'entry.ts' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: out,
  alias: { '@': path.join(root, 'src') },
  logLevel: 'warning',
})

await import(pathToFileURL(out).href)
await rm(out)
