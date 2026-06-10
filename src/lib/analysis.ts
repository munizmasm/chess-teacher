import { parsePgn } from '@/lib/pgn'
import { getEngine } from '@/lib/engine'
import { detectPhase, uciToLine } from '@/lib/chessUtils'
import { CONCEPT_TAGS, classify } from '@/lib/concepts'
import { analyzePatterns, generateLesson, triageInaccuracies } from '@/lib/anthropic'
import type {
  AnalyzedGame,
  ClaudeModel,
  Color,
  ErrorTag,
  ParsedGame,
  PatternAnalysis,
  StudyPoint,
} from '@/types'
import type { TagAggregate } from '@/lib/prompts'

export interface AnalyzeProgress {
  phase: 'parse' | 'triage' | 'engine' | 'tutor' | 'done'
  current: number
  total: number
  label: string
}

export interface AnalyzeParams {
  pgn: string
  userColor: Color
  apiKey: string
  model: ClaudeModel
  depth?: number
  onProgress?: (p: AnalyzeProgress) => void
}

export class AnalysisError extends Error {}

function buildStudyPoints(parsed: ParsedGame, userColor: Color): StudyPoint[] {
  const pts: StudyPoint[] = []
  for (const mv of parsed.moves) {
    if (mv.color !== userColor || !mv.classification) continue
    const cs = classify(mv.classification)
    if (!cs || !cs.isStudy) continue
    pts.push({
      id: `${parsed.gameId}-${mv.ply}`,
      ply: mv.ply,
      moveNumber: mv.moveNumber,
      color: mv.color,
      san: mv.san,
      from: mv.from,
      to: mv.to,
      category: cs.category,
      classification: mv.classification,
      fenBefore: mv.fenBefore,
      fenAfter: mv.fenAfter,
    })
  }
  return pts
}

async function runEngineForPoint(point: StudyPoint, depth: number): Promise<void> {
  const engine = getEngine()

  // Decision position: the user is to move → score is already the user's POV.
  const best = await engine.analyze(point.fenBefore, { depth })
  const line = uciToLine(point.fenBefore, best.pv, 10)
  point.evalBestCp = best.scoreCp
  point.evalBestMate = best.mate
  point.bestLine = {
    sanMoves: line.sanMoves,
    uciMoves: line.uciMoves,
    fens: line.fens,
    froms: line.froms,
    tos: line.tos,
    depth: best.depth,
    evalCp: best.scoreCp,
    mate: best.mate,
  }

  // After the played move: opponent to move → flip to the user's POV.
  const played = await engine.analyze(point.fenAfter, { depth })
  if (played.mate !== undefined) {
    point.evalPlayedMate = -played.mate
  } else if (played.scoreCp !== undefined) {
    point.evalPlayedCp = -played.scoreCp
  }

  if (point.evalBestCp !== undefined && point.evalPlayedCp !== undefined) {
    point.cpLoss = Math.max(0, point.evalBestCp - point.evalPlayedCp)
  }
}

async function forEachPool<T>(
  items: T[],
  limit: number,
  fn: (item: T, idx: number) => Promise<void>,
): Promise<void> {
  let i = 0
  const n = Math.max(1, Math.min(limit, items.length))
  const workers = Array.from({ length: n }, async () => {
    while (i < items.length) {
      const idx = i++
      await fn(items[idx], idx)
    }
  })
  await Promise.all(workers)
}

function buildErrorTags(points: StudyPoint[], userColor: Color): ErrorTag[] {
  const tags: ErrorTag[] = []
  for (const p of points) {
    if (!p.lesson) continue
    const phase = detectPhase(p.fenBefore, p.moveNumber)
    for (const tag of p.lesson.conceptTags) {
      tags.push({ tag, category: p.category, phase, color: userColor })
    }
  }
  return tags
}

export async function analyzeGame(params: AnalyzeParams): Promise<AnalyzedGame> {
  const { pgn, userColor, apiKey, model, depth = 16, onProgress } = params

  onProgress?.({ phase: 'parse', current: 0, total: 1, label: 'Reading the PGN…' })
  const parsed = parsePgn(pgn)

  if (!parsed.hasAnnotations) {
    throw new AnalysisError(
      'This PGN has no chess.com highlights (inaccuracy/mistake/blunder). Paste the PGN of the ALREADY ANALYZED game (with chess.com Game Review).',
    )
  }

  const allPoints = buildStudyPoints(parsed, userColor)

  // Triage: always keep Mistake/Blunder/Miss; filter out inaccuracies that are
  // only engine subtleties (no clear human concept), so we don't bore the user.
  const inaccuracies = allPoints.filter((p) => p.category === 'Inaccuracy')
  let points = allPoints
  if (inaccuracies.length > 0) {
    onProgress?.({
      phase: 'triage',
      current: 0,
      total: 1,
      label: 'Selecting the inaccuracies worth studying…',
    })
    const keep = await triageInaccuracies(
      apiKey,
      model,
      inaccuracies.map((p) => ({
        ply: p.ply,
        moveNumber: p.moveNumber,
        color: p.color,
        san: p.san,
        fenBefore: p.fenBefore,
      })),
      parsed.meta,
      userColor,
    )
    if (keep) {
      points = allPoints.filter((p) => p.category !== 'Inaccuracy' || keep.has(p.ply))
    }
  }

  // Engine (sequential — single worker)
  for (let k = 0; k < points.length; k++) {
    onProgress?.({
      phase: 'engine',
      current: k,
      total: points.length,
      label: `Calculating the best line (${k + 1}/${points.length})…`,
    })
    await runEngineForPoint(points[k], depth)
  }

  // Tutor (bounded concurrency)
  let done = 0
  await forEachPool(points, 3, async (p) => {
    try {
      p.lesson = await generateLesson(apiKey, model, p, parsed.meta, userColor)
    } catch (err) {
      p.lessonError = err instanceof Error ? err.message : String(err)
    } finally {
      done++
      onProgress?.({
        phase: 'tutor',
        current: done,
        total: points.length,
        label: `Tutor preparing the explanations (${done}/${points.length})…`,
      })
    }
  })

  onProgress?.({ phase: 'done', current: points.length, total: points.length, label: 'Done!' })

  return {
    id: parsed.gameId,
    importedAt: Date.now(),
    meta: parsed.meta,
    userColor,
    pgn,
    points,
    errorTags: buildErrorTags(points, userColor),
  }
}

// ─── Patterns ────────────────────────────────────────────────────────────────

export function aggregateTags(games: AnalyzedGame[]): TagAggregate[] {
  const map = new Map<string, TagAggregate>()
  for (const tag of CONCEPT_TAGS) {
    map.set(tag, {
      tag,
      total: 0,
      byColor: { white: 0, black: 0 },
      byPhase: { opening: 0, middlegame: 0, endgame: 0 },
    })
  }
  for (const g of games) {
    for (const t of g.errorTags) {
      const a = map.get(t.tag)
      if (!a) continue
      a.total++
      a.byColor[t.color]++
      a.byPhase[t.phase]++
    }
  }
  return [...map.values()]
}

export async function computePatterns(
  games: AnalyzedGame[],
  apiKey: string,
  model: ClaudeModel,
): Promise<PatternAnalysis> {
  const agg = aggregateTags(games)
  return analyzePatterns(apiKey, model, agg, games.length)
}
