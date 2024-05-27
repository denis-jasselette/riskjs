import { useContext, useState } from 'preact/hooks'

import { BridgesComponent } from '@/components/board/BridgesComponent'
import { ContinentsComponent } from '@/components/board/ContinentsComponent'
import style from '@/components/board/Map.module.scss'
import Territories from '@/components/board/Territories'
import GameContext from '@/components/GameContext'
import GameController from '@/controllers/GameController'

export type MapProps = {
  class?: string
}

const Map = (props: MapProps) => {
  const [selectedTerritory, setSelectedTerritory] = useState<string | undefined>(undefined)
  const { gameState, setGameState } = useContext(GameContext)
  const gameController = new GameController(gameState)

  const handleClick = (territory: string) => {
    if (!gameController.isSelectable(territory, selectedTerritory))
      return

    if (gameState.currentPhase === 'deploy') {
      setGameState(gameController.deploy(gameState.troopsToDeploy, territory).gameState)
      return
    }
    if (selectedTerritory === territory) {
      setSelectedTerritory(undefined)
      return
    }
    if (!selectedTerritory) {
      setSelectedTerritory(territory)
      return
    }
    if (gameState.currentPhase === 'attack') {
      if (gameController.getTerritoryOwner(territory) === gameState.currentPlayer) {
        setSelectedTerritory(territory)
        return
      }
      setGameState(gameController.attack(1, selectedTerritory, territory).gameState)
      setSelectedTerritory(territory)
      return
    }
    if (gameState.currentPhase === 'fortify') {
      setGameState(gameController.fortify(1, selectedTerritory, territory).gameState)
      setSelectedTerritory(undefined)
      return
    }
  }

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
          <Territories selectedTerritory={selectedTerritory} handleClick={handleClick} />
        </g>
        <g className={style.Bridges}>
          <BridgesComponent />
        </g>
      </svg>
    </>
  )
}

export default Map
