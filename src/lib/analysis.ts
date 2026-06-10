import { parsePgn } from '@/lib/pgn'
import { getEngine } from '@/lib/engine'
import { detectPhase, uciToLine } from '@/lib/chessUtils'
import { classify } from '@/lib/concepts'
import { analyzePatterns, generateLesson, triageInaccuracies } from '@/lib/anthropic'
import { CONCEPT_TAGS } from '@/lib/concepts'
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

  // Posição da decisão: o usuário está para jogar → score já é POV do usuário.
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

  // Após o lance jogado: adversário a mover → inverte para POV do usuário.
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
    const fase = detectPhase(p.fenBefore, p.moveNumber)
    for (const tag of p.lesson.tags_conceito) {
      tags.push({ tag, categoria: p.category, fase, cor: userColor })
    }
  }
  return tags
}

export async function analyzeGame(params: AnalyzeParams): Promise<AnalyzedGame> {
  const { pgn, userColor, apiKey, model, depth = 16, onProgress } = params

  onProgress?.({ phase: 'parse', current: 0, total: 1, label: 'Lendo o PGN…' })
  const parsed = parsePgn(pgn)

  if (!parsed.hasAnnotations) {
    throw new AnalysisError(
      'Este PGN não tem os destaques do chess.com (imprecisão/erro/blunder). Cole o PGN da partida JÁ ANALISADA (com a Revisão do chess.com).',
    )
  }

  const allPoints = buildStudyPoints(parsed, userColor)

  // Triagem: mantém Erro/Capivarada/Chance perdida; filtra imprecisões que são
  // só sutilezas de motor (sem conceito humano claro), para não cansar o aluno.
  const inaccuracies = allPoints.filter((p) => p.category === 'Imprecisão')
  let points = allPoints
  if (inaccuracies.length > 0) {
    onProgress?.({
      phase: 'triage',
      current: 0,
      total: 1,
      label: 'Selecionando imprecisões que valem estudo…',
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
      points = allPoints.filter((p) => p.category !== 'Imprecisão' || keep.has(p.ply))
    }
  }

  // Motor (sequencial — worker único)
  for (let k = 0; k < points.length; k++) {
    onProgress?.({
      phase: 'engine',
      current: k,
      total: points.length,
      label: `Calculando a linha melhor (${k + 1}/${points.length})…`,
    })
    await runEngineForPoint(points[k], depth)
  }

  // Tutor (concorrência limitada)
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
        label: `Tutor preparando as explicações (${done}/${points.length})…`,
      })
    }
  })

  onProgress?.({ phase: 'done', current: points.length, total: points.length, label: 'Pronto!' })

  return {
    id: parsed.gameId,
    importadoEm: Date.now(),
    meta: parsed.meta,
    corUsuario: userColor,
    pgn,
    pontos: points,
    tagsErro: buildErrorTags(points, userColor),
  }
}

// ─── Padrões ─────────────────────────────────────────────────────────────────

export function aggregateTags(games: AnalyzedGame[]): TagAggregate[] {
  const map = new Map<string, TagAggregate>()
  for (const tag of CONCEPT_TAGS) {
    map.set(tag, {
      tag,
      total: 0,
      porCor: { white: 0, black: 0 },
      porFase: { abertura: 0, 'meio-jogo': 0, final: 0 },
    })
  }
  for (const g of games) {
    for (const t of g.tagsErro) {
      const a = map.get(t.tag)
      if (!a) continue
      a.total++
      a.porCor[t.cor]++
      a.porFase[t.fase]++
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
