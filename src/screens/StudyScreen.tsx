import { useEffect, useMemo, useState } from 'react'
import type { AnalyzedGame, StudyPoint } from '@/types'
import Board, { type BoardArrow, type BoardSquareHighlight } from '@/components/Board'
import Markdown from '@/components/Markdown'
import { CategoryChip, EvalBadge, categoryStyle } from '@/components/bits'
import { highlightColor } from '@/lib/concepts'
import { lossLabel } from '@/lib/chessUtils'

interface Props {
  game: AnalyzedGame
  pointIndex: number
  duplicate: boolean
  onPrevPoint: () => void
  onNextPoint: () => void
  onSelectPoint: (i: number) => void
  onClose: () => void
}

export default function StudyScreen({
  game,
  pointIndex,
  duplicate,
  onPrevPoint,
  onNextPoint,
  onSelectPoint,
  onClose,
}: Props) {
  if (game.pontos.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card flex flex-col items-center gap-4 text-center">
          <div className="text-4xl">🎉</div>
          <h1 className="text-xl font-semibold text-white">Nenhum lance ruim seu neste jogo!</h1>
          <p className="text-sm text-ink-100/70">
            O chess.com não marcou imprecisões, erros, blunders nem chances perdidas das suas peças
            nesta partida. Mandou bem!
          </p>
          <button className="btn-primary" onClick={onClose}>
            Analisar outra partida
          </button>
        </div>
      </div>
    )
  }

  const point = game.pontos[pointIndex]
  return (
    <StudyPointView
      key={point.id}
      game={game}
      point={point}
      pointIndex={pointIndex}
      duplicate={duplicate}
      onPrevPoint={onPrevPoint}
      onNextPoint={onNextPoint}
      onSelectPoint={onSelectPoint}
      onClose={onClose}
    />
  )
}

function StudyPointView({
  game,
  point,
  pointIndex,
  duplicate,
  onPrevPoint,
  onNextPoint,
  onSelectPoint,
  onClose,
}: {
  game: AnalyzedGame
  point: StudyPoint
  pointIndex: number
} & Omit<Props, 'game' | 'pointIndex'>) {
  const line = point.bestLine
  const L = line?.sanMoves.length ?? 0
  const totalStages = 1 + L
  const [stage, setStage] = useState(0)
  useEffect(() => setStage(0), [point.id])

  const lesson = point.lesson
  const catColor = categoryStyle(point.category).cor

  const board = useMemo(() => {
    let fen = point.fenBefore
    let arrows: BoardArrow[] = []
    let highlights: BoardSquareHighlight[] = []
    let lastMove: { from: string; to: string } | undefined

    if (stage === 0) {
      // Lição: mostra o lance jogado + os destaques do Tutor
      const setas =
        lesson?.destaques
          .filter((d) => d.tipo === 'seta')
          .map((d) => ({ from: (d as any).de, to: (d as any).para, color: highlightColor(d.cor) })) ?? []
      arrows = [{ from: point.from, to: point.to, color: catColor }, ...setas]
      highlights =
        lesson?.destaques
          .filter((d) => d.tipo === 'casa')
          .map((d) => ({ square: (d as any).casa, color: highlightColor(d.cor) })) ?? []
    } else if (line) {
      const j = stage - 1
      fen = line.fens[j]
      lastMove = { from: line.froms[j], to: line.tos[j] }
      arrows = [{ from: line.froms[j], to: line.tos[j], color: 'rgba(122,170,80,0.95)' }]
    }
    return { fen, arrows, highlights, lastMove }
  }, [stage, point, line, lesson, catColor])

  const stageLabel = stage === 0 ? '💡 Lição' : `♟️ Linha melhor (${stage}/${L})`

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      {/* Cabeçalho do jogo */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-white">
            {game.meta.white} <span className="text-ink-100/40">vs</span> {game.meta.black}
          </h1>
          <p className="text-xs text-ink-100/60">
            Você de {game.corUsuario === 'white' ? 'Brancas ⚪' : 'Pretas ⚫'}
            {game.meta.eco ? ` · ${game.meta.eco}` : ''}
            {game.meta.result ? ` · ${game.meta.result}` : ''}
          </p>
        </div>
        <button className="btn-ghost text-sm" onClick={onClose}>
          ✕ Sair
        </button>
      </div>

      {duplicate && (
        <div className="rounded-lg border border-mark-excellent/30 bg-mark-excellent/10 p-2.5 text-xs text-mark-excellent">
          ℹ️ Esta partida já tinha sido analisada — abri o estudo salvo (não contabilizei de novo).
        </div>
      )}

      {/* Faixa de pontos */}
      <PointStrip points={game.pontos} current={pointIndex} onSelect={onSelectPoint} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start">
        {/* Coluna tabuleiro — principal e fixa no desktop */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-16 lg:self-start">
          <div className="mx-auto w-full max-w-[600px]">
            <Board
              fen={board.fen}
              orientation={game.corUsuario}
              arrows={board.arrows}
              highlights={board.highlights}
              lastMove={board.lastMove}
              maxWidth={600}
            />
          </div>

          {/* Avaliações */}
          <div className="flex items-center justify-center gap-2">
            <EvalBadge
              cp={point.evalPlayedCp}
              mate={point.evalPlayedMate}
              label="Seu lance"
              tone="bad"
            />
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wide text-ink-100/50">perda</div>
              <div className="font-mono text-sm font-semibold text-mark-missed">
                {lossLabel(point.cpLoss) || '—'}
              </div>
            </div>
            <EvalBadge
              cp={point.evalBestCp}
              mate={point.evalBestMate}
              label="Melhor"
              tone="good"
            />
          </div>

          {/* Controles de estágio */}
          <div className="flex items-center justify-between gap-2">
            <button
              className="btn-ghost"
              disabled={stage === 0}
              onClick={() => setStage((s) => Math.max(0, s - 1))}
            >
              ◀
            </button>
            <span className="text-sm font-medium text-ink-100/80">{stageLabel}</span>
            <button
              className="btn-ghost"
              disabled={stage >= totalStages - 1}
              onClick={() => setStage((s) => Math.min(totalStages - 1, s + 1))}
            >
              ▶
            </button>
          </div>
        </div>

        {/* Coluna Tutor */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CategoryChip category={point.category} />
            <span className="text-sm text-ink-100/70">
              Lance {point.moveNumber}: você jogou <strong className="text-white">{point.san}</strong>
            </span>
          </div>

          <TutorPanel stage={stage} point={point} L={L} onShowLine={() => setStage(1)} />

          {line && line.sanMoves.length > 0 && (
            <BestLineMoves
              sanMoves={line.sanMoves}
              startMoveNumber={point.moveNumber}
              startColor={game.corUsuario}
              activeIndex={stage >= 1 ? stage - 1 : -1}
              onPick={(i) => setStage(i + 1)}
            />
          )}

          {/* Navegação entre pontos */}
          <div className="mt-1 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
            <button className="btn-ghost text-sm" disabled={pointIndex === 0} onClick={onPrevPoint}>
              ◀ Ponto anterior
            </button>
            <span className="text-xs text-ink-100/50">
              {pointIndex + 1} / {game.pontos.length}
            </span>
            <button
              className="btn-primary text-sm"
              disabled={pointIndex >= game.pontos.length - 1}
              onClick={onNextPoint}
            >
              Próximo ponto ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TutorPanel({
  stage,
  point,
  L,
  onShowLine,
}: {
  stage: number
  point: StudyPoint
  L: number
  onShowLine: () => void
}) {
  const lesson = point.lesson

  if (!lesson) {
    return (
      <div className="card text-sm">
        <p className="text-mark-missed">
          ⚠️ Não consegui gerar a explicação do Tutor para este lance
          {point.lessonError ? `: ${point.lessonError}` : '.'}
        </p>
        {point.bestLine && (
          <p className="mt-2 text-ink-100/70">
            Mas você ainda pode navegar pela linha melhor do motor com os controles ◀ ▶.
          </p>
        )}
      </div>
    )
  }

  if (stage === 0) {
    return (
      <div className="card flex flex-col gap-3">
        <Markdown>{lesson.resposta}</Markdown>
        {L > 0 && (
          <button className="btn-primary self-start text-sm" onClick={onShowLine}>
            Ver a linha melhor ▶
          </button>
        )}
      </div>
    )
  }

  // Estágio de variação
  const j = stage - 1
  const step = lesson.variacao[j]
  const nota = step?.nota || `Lance ${point.bestLine?.sanMoves[j] ?? ''}.`
  return (
    <div className="card flex flex-col gap-2">
      <div className="text-sm font-semibold text-accent-soft">
        {point.bestLine?.sanMoves[j] ?? step?.lance}
      </div>
      <Markdown>{nota}</Markdown>
    </div>
  )
}

function PointStrip({
  points,
  current,
  onSelect,
}: {
  points: StudyPoint[]
  current: number
  onSelect: (i: number) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {points.map((p, i) => {
        const s = categoryStyle(p.category)
        const active = i === current
        return (
          <button
            key={p.id}
            onClick={() => onSelect(i)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
              active ? 'border-accent bg-accent/15 text-white' : 'border-white/10 bg-ink-700 text-ink-100/70'
            }`}
          >
            <span className="font-mono font-bold" style={{ color: s.cor }}>
              {s.marcador}
            </span>
            <span>
              {p.moveNumber}. {p.san}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function BestLineMoves({
  sanMoves,
  startMoveNumber,
  startColor,
  activeIndex,
  onPick,
}: {
  sanMoves: string[]
  startMoveNumber: number
  startColor: 'white' | 'black'
  activeIndex: number
  onPick: (i: number) => void
}) {
  // Numeração dos lances a partir da posição do erro.
  let moveNum = startMoveNumber
  let whiteToMove = startColor === 'white'
  const tokens = sanMoves.map((san, i) => {
    let prefix = ''
    if (whiteToMove) prefix = `${moveNum}.`
    else if (i === 0) prefix = `${moveNum}...`
    const node = { i, prefix, san }
    if (!whiteToMove) moveNum++
    whiteToMove = !whiteToMove
    return node
  })

  return (
    <div className="card">
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-100/50">
        Linha melhor
      </div>
      <div className="flex flex-wrap gap-x-1 gap-y-1 text-sm">
        {tokens.map((t) => (
          <span key={t.i} className="flex items-center gap-1">
            {t.prefix && <span className="text-ink-100/40">{t.prefix}</span>}
            <button
              onClick={() => onPick(t.i)}
              className={`rounded px-1.5 py-0.5 font-mono transition-colors ${
                t.i === activeIndex ? 'bg-accent text-ink-900' : 'hover:bg-ink-700 text-ink-100'
              }`}
            >
              {t.san}
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
