// ───────────────────────────────────────────────────────────────────────────
// Stockfish wrapper (WASM lite single-threaded) running in a Web Worker.
// UCI protocol. Analyses are serialized through an internal queue.
// ───────────────────────────────────────────────────────────────────────────

export interface AnalyzeOptions {
  depth?: number
}

export interface RawAnalysis {
  bestmove: string // UCI (e.g. "d2d4")
  pv: string[] // UCI sequence
  depth: number
  scoreCp?: number // POV of the side to move
  mate?: number // POV of the side to move
}

type LineListener = (line: string) => void

const ENGINE_URL = `${import.meta.env.BASE_URL}engine/stockfish-18-lite-single.js`

export class Engine {
  private worker: Worker | null = null
  private listeners: LineListener[] = []
  private ready = false
  private queue: Promise<unknown> = Promise.resolve()

  private send(cmd: string) {
    this.worker?.postMessage(cmd)
  }

  private on(fn: LineListener) {
    this.listeners.push(fn)
  }

  private off(fn: LineListener) {
    this.listeners = this.listeners.filter((l) => l !== fn)
  }

  private waitFor(predicate: (line: string) => boolean, timeoutMs = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(onLine)
        reject(new Error('Timed out waiting for the engine.'))
      }, timeoutMs)
      const onLine: LineListener = (line) => {
        if (predicate(line)) {
          clearTimeout(timer)
          this.off(onLine)
          resolve()
        }
      }
      this.on(onLine)
    })
  }

  async init(): Promise<void> {
    if (this.ready) return
    if (!this.worker) {
      this.worker = new Worker(ENGINE_URL)
      this.worker.onmessage = (e: MessageEvent) => {
        const data = e.data
        const line: string = typeof data === 'string' ? data : (data?.data ?? String(data))
        for (const l of [...this.listeners]) l(line)
      }
      this.worker.onerror = (e) => {
        console.error('[engine] worker error:', e.message)
      }
    }
    const uciok = this.waitFor((l) => l.includes('uciok'))
    this.send('uci')
    await uciok
    this.send('setoption name MultiPV value 1')
    const ready = this.waitFor((l) => l.includes('readyok'))
    this.send('isready')
    await ready
    this.ready = true
  }

  /** Runs `fn` under mutual exclusion (serializes `go` commands). */
  private runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn)
    this.queue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  analyze(fen: string, opts: AnalyzeOptions = {}): Promise<RawAnalysis> {
    return this.runExclusive(async () => {
      await this.init()
      const depth = opts.depth ?? 16
      let lastPv: string[] = []
      let lastDepth = 0
      let scoreCp: number | undefined
      let mate: number | undefined

      const result = new Promise<RawAnalysis>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.off(onLine)
          reject(new Error('Engine analysis timed out.'))
        }, 60000)

        const onLine: LineListener = (line) => {
          if (line.startsWith('info')) {
            const pvM = line.match(/ pv (.+)$/)
            if (!pvM) return // ignore lines without a PV (e.g. "currmove")
            const dM = line.match(/ depth (\d+)/)
            const cpM = line.match(/ score cp (-?\d+)/)
            const mateM = line.match(/ score mate (-?\d+)/)
            lastPv = pvM[1].trim().split(/\s+/)
            if (dM) lastDepth = parseInt(dM[1], 10)
            if (mateM) {
              mate = parseInt(mateM[1], 10)
              scoreCp = undefined
            } else if (cpM) {
              scoreCp = parseInt(cpM[1], 10)
              mate = undefined
            }
          } else if (line.startsWith('bestmove')) {
            clearTimeout(timer)
            this.off(onLine)
            const bm = line.split(/\s+/)[1] ?? ''
            resolve({
              bestmove: bm,
              pv: lastPv.length ? lastPv : bm ? [bm] : [],
              depth: lastDepth,
              scoreCp,
              mate,
            })
          }
        }
        this.on(onLine)
        this.send('position fen ' + fen)
        this.send(`go depth ${depth}`)
      })

      return result
    })
  }

  dispose() {
    try {
      this.send('quit')
    } catch {
      /* noop */
    }
    this.worker?.terminate()
    this.worker = null
    this.ready = false
    this.listeners = []
  }
}

// Shared singleton (loads the WASM once).
let singleton: Engine | null = null
export function getEngine(): Engine {
  if (!singleton) singleton = new Engine()
  return singleton
}
