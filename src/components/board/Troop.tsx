import style from '@/components/board/Troop.module.scss'
import PlayerConfig from '@/models/PlayerConfig'

export type TroopProps = {
  player: PlayerConfig
  count: number
  territory: string
  x: number
  y: number
  width?: number
  label?: string
  isInFog?: boolean
  isCapital?: boolean
}

// A capital's marker is a crenellated castle-wall silhouette instead of the
// plain ellipse every other territory uses, so a capital reads as visually
// distinct on the map at a glance (not just via the separate global leader
// counter). Same 130-wide, 100-tall footprint as the ellipse it replaces,
// but shifted up slightly (top edge at the viewBox's top rather than
// vertically centered on it) so it sits a bit higher than the ellipse would.
const CAPITAL_MARKER_PATH = 'M 15,100 L 15,0 L 33.57,0 L 33.57,25 L 52.14,25 L 52.14,0 L 70.71,0 L 70.71,25 L 89.29,25 L 89.29,0 L 107.86,0 L 107.86,25 L 126.43,25 L 126.43,0 L 145,0 L 145,100 Z'

const Troop = (props: TroopProps) => {
  return (
    <>
      <svg viewBox="0 0 160 150" className={style.Troop} x={props.x} y={props.y} width={props.width} data-player-color={props.isInFog ? undefined : props.player.color}>
        {props.isCapital
          ? <path className={style.CapitalMarker} d={CAPITAL_MARKER_PATH} />
          : <ellipse cx="80" cy="60" rx="70" ry="50" />}
        <text x="50%" y="45%">{props.label !== undefined ? props.label : props.count}</text>
      </svg>
    </>
  )
}

export default Troop
