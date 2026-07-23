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
}

const Troop = (props: TroopProps) => {
  return (
    <>
      <svg viewBox="0 0 160 150" className={style.Troop} x={props.x} y={props.y} width={props.width} data-player-color={props.isInFog ? undefined : props.player.color}>
        <ellipse cx="80" cy="60" rx="70" ry="50" />
        <text x="50%" y="45%">{props.label !== undefined ? props.label : props.count}</text>
      </svg>
    </>
  )
}

export default Troop
