import { useContext, useRef } from 'preact/hooks'

import { BridgesComponent } from '@/components/board/BridgesComponent'
import { ContinentsComponent } from '@/components/board/ContinentsComponent'
import style from '@/components/board/Map.module.scss'
import Territories from '@/components/board/Territories'
import GameContext from '@/components/GameContext'
import { usePanZoom } from '@/hooks/usePanZoom'

export type MapProps = {
  selectedTerritory?: string
  handleClickTerritory?: (territory: string) => void
  class?: string
}

const TAP_MOVE_THRESHOLD = 5

const Map = (props: MapProps) => {
  const { gameState } = useContext(GameContext)
  const svgRef = useRef<SVGSVGElement>(null)

  const { transform, handlers, resetTransform } = usePanZoom({
    resetKey: gameState.currentPlayer,
    svgRef,
  })

  // Track pointer movement to distinguish tap from drag
  const pointerStartPos = useRef<{ x: number, y: number } | null>(null)
  const pointerMoveTotal = useRef<number>(0)

  const handlePointerDown = (e: PointerEvent) => {
    pointerStartPos.current = { x: e.clientX, y: e.clientY }
    pointerMoveTotal.current = 0
    handlers.onPointerDown(e)
  }

  const handlePointerMove = (e: PointerEvent) => {
    if (pointerStartPos.current) {
      const dx = e.clientX - pointerStartPos.current.x
      const dy = e.clientY - pointerStartPos.current.y
      pointerMoveTotal.current = Math.sqrt(dx * dx + dy * dy)
    }
    handlers.onPointerMove(e)
  }

  const handlePointerUp = (e: PointerEvent) => {
    handlers.onPointerUp(e)
  }

  const handlePointerCancel = (e: PointerEvent) => {
    pointerStartPos.current = null
    pointerMoveTotal.current = 0
    handlers.onPointerCancel(e)
  }

  // Wrap click handler to suppress if pointer moved more than threshold (drag, not tap)
  const handleClickTerritory = props.handleClickTerritory
    ? (territory: string) => {
        if (pointerMoveTotal.current >= TAP_MOVE_THRESHOLD) return
        props.handleClickTerritory!(territory)
      }
    : undefined

  const transformAttr = `translate(${transform.x}, ${transform.y}) scale(${transform.scale})`

  const containerClass = [style.MapContainer, props.class].filter(Boolean).join(' ')

  return (
    <div className={containerClass}>
      <svg
        ref={svgRef}
        version="1.0"
        viewBox={`0 0 ${gameState.mapConfig.width} ${gameState.mapConfig.height}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <defs>
          <linearGradient id="BlizzardGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#aaa" />
            <stop offset="100%" stopColor="#f5f5f5" />
          </linearGradient>
        </defs>
        <g transform={transformAttr}>
          <g className={style.Continents}>
            <ContinentsComponent />
          </g>
          <g className={style.Territories}>
            <Territories selectedTerritory={props.selectedTerritory} handleClick={handleClickTerritory} />
          </g>
          <g className={style.Bridges}>
            <BridgesComponent />
          </g>
        </g>
      </svg>
      {transform.scale > 1 && (
        <button
          className={style.ResetZoomButton}
          onClick={resetTransform}
          title="Reset zoom"
          type="button"
        >
          &#x26F6;
        </button>
      )}
    </div>
  )
}

export default Map
