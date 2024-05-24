import { useEffect } from "preact/hooks"
import PlayerConfig from "@/models/PlayerConfig"
import style from "@/components/board/Troop.module.scss"
import mapStyle from "@/components/board/Map.module.scss"

export type TroopProps = {
  player: PlayerConfig,
  count: number,
  territory: string,
  x: number,
  y: number,
  width?: number,
}

export default (props: TroopProps) => {
  useEffect(() => {
    const edgeElements = document.querySelectorAll(`.${mapStyle.TerritoryEdge}[data-territory=${props.territory}]`) as NodeListOf<SVGElement>
    edgeElements.forEach((elt) => {
      elt.dataset.player = props.player.color
    })
  }, [])

  return <>
    <svg viewBox="0 0 160 150" class={style.Troop} x={props.x} y={props.y} width={props.width} data-player-color={props.player.color}>
      <ellipse cx="80" cy="60" rx="70" ry="50" />
      <text x="50%" y="45%">{props.count}</text>
    </svg>
  </>
}