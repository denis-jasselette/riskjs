import { BridgesComponent } from '@/components/board/BridgesComponent'
import { ContinentsComponent } from '@/components/board/ContinentsComponent'
import Territories from '@/components/board/Territories'
import style from '@/components/board/Map.module.scss'
import { useContext, useState } from 'preact/hooks'
import GameContext from '@/components/GameContext'
import GameController from '@/controllers/GameController'

export type MapProps = {
  class?: string
}

export default (props: MapProps) => {
  const [selectedTerritory, setSelectedTerritory] = useState<string | undefined>(undefined)
  const { gameState } = useContext(GameContext)
  const gameController = new GameController(gameState)

  const handleClick = (territory: string) => {
    if (!gameController.isSelectable(territory))
      return

    if (selectedTerritory === territory)
      setSelectedTerritory(undefined)
    else
      setSelectedTerritory(territory)
  }

  return <>
    <svg version="1.0" viewBox={`0 0 ${gameState.mapConfig.width} ${gameState.mapConfig.height}`} xmlns="http://www.w3.org/2000/svg" class={props.class}>
      <defs>
        <linearGradient id="BlizzardGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#aaa" />
          <stop offset="100%" stop-color="#f5f5f5" />
        </linearGradient>
      </defs>
      <g class={style.Continents}>
        <ContinentsComponent />
      </g>
      <g class={style.Territories}>
        <Territories selectedTerritory={selectedTerritory} handleClick={handleClick} />
      </g>
      <g class={style.Bridges}>
        <BridgesComponent />
      </g>
    </svg>
  </>
}