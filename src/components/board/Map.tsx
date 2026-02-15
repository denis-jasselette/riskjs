import { useContext } from 'preact/hooks'

import { BridgesComponent } from '@/components/board/BridgesComponent'
import { ContinentsComponent } from '@/components/board/ContinentsComponent'
import style from '@/components/board/Map.module.scss'
import Territories from '@/components/board/Territories'
import GameContext from '@/components/GameContext'

export type MapProps = {
  selectedTerritory?: string
  handleClickTerritory?: (territory: string) => void
  class?: string
}

const Map = (props: MapProps) => {
  const { gameState } = useContext(GameContext)

  return (
    <>
      <svg version="1.0" viewBox={`0 0 ${gameState.mapConfig.width} ${gameState.mapConfig.height}`} xmlns="http://www.w3.org/2000/svg" className={props.class}>
        <defs>
          <linearGradient id="BlizzardGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#aaa" />
            <stop offset="100%" stopColor="#f5f5f5" />
          </linearGradient>
        </defs>
        <g className={style.Continents}>
          <ContinentsComponent />
        </g>
        <g className={style.Territories}>
          <Territories selectedTerritory={props.selectedTerritory} handleClick={props.handleClickTerritory} />
        </g>
        <g className={style.Bridges}>
          <BridgesComponent />
        </g>
      </svg>
    </>
  )
}

export default Map
