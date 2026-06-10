import { useEffect, useRef, useState, type ComponentProps, type CSSProperties } from 'react'
import { Chessboard } from 'react-chessboard'
import type { Color } from '@/types'

type BoardProps = ComponentProps<typeof Chessboard>
type ArrowsType = NonNullable<BoardProps['customArrows']>
type SquareStylesType = NonNullable<BoardProps['customSquareStyles']>

export interface BoardArrow {
  from: string
  to: string
  color?: string
}
export interface BoardSquareHighlight {
  square: string
  color?: string
}

interface Props {
  fen: string
  orientation: Color
  arrows?: BoardArrow[]
  highlights?: BoardSquareHighlight[]
  lastMove?: { from: string; to: string }
  maxWidth?: number
}

const LIGHT = '#EEEED2'
const DARK = '#769656'
const LASTMOVE = 'rgba(245, 197, 66, 0.45)'

function useResizeWidth(max: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(360)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const apply = (cw: number) => setW(Math.max(160, Math.min(max, Math.floor(cw))))
    const ro = new ResizeObserver((entries) => apply(entries[0].contentRect.width))
    ro.observe(el)
    apply(el.clientWidth)
    return () => ro.disconnect()
  }, [max])
  return { ref, w }
}

export default function Board({
  fen,
  orientation,
  arrows = [],
  highlights = [],
  lastMove,
  maxWidth = 560,
}: Props) {
  const { ref, w } = useResizeWidth(maxWidth)

  const customArrows = arrows.map((a) => [a.from, a.to, a.color]) as unknown as ArrowsType

  const squareStyles: Record<string, CSSProperties> = {}
  if (lastMove) {
    squareStyles[lastMove.from] = { backgroundColor: LASTMOVE }
    squareStyles[lastMove.to] = { backgroundColor: LASTMOVE }
  }
  for (const h of highlights) {
    squareStyles[h.square] = {
      background: h.color
        ? `radial-gradient(circle, ${h.color} 36%, transparent 40%)`
        : `radial-gradient(circle, rgba(122,170,80,0.85) 36%, transparent 40%)`,
      borderRadius: '50%',
    }
  }

  return (
    <div ref={ref} className="w-full">
      <Chessboard
        position={fen}
        boardOrientation={orientation}
        boardWidth={w}
        arePiecesDraggable={false}
        areArrowsAllowed={false}
        showBoardNotation
        customArrows={customArrows}
        customSquareStyles={squareStyles as SquareStylesType}
        customLightSquareStyle={{ backgroundColor: LIGHT }}
        customDarkSquareStyle={{ backgroundColor: DARK }}
        customBoardStyle={{ borderRadius: '10px', boxShadow: '0 8px 30px rgba(0,0,0,0.35)' }}
        customArrowColor="rgba(122,170,80,0.95)"
      />
    </div>
  )
}
