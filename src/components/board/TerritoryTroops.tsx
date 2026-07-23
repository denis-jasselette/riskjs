import { useContext } from 'react'

import style from '@/components/board/Map.module.scss'
import Troop from '@/components/board/Troop'
import GameContext from '@/components/GameContext'
import GameController from '@/controllers/GameController'

// Rendered as its own, later pass in Map.tsx (after Bridges) so troop-count
// markers always draw above every other map layer — otherwise a bridge's
// connector dot can sit on top of a small/coastal territory's own count
// (e.g. Madagascar, Japan, Iceland).
export const TerritoryTroops = () => {
  const { gameState, viewingPlayer } = useContext(GameContext)
  const gameController = new GameController(gameState)
  const visibleTerritories = gameState.fogEnabled
    ? gameController.mapController.getVisibleTerritories(viewingPlayer)
    : undefined
  const troopSize = gameState.mapConfig.troopSize

  return (
    <>
      {Object.entries(gameState.mapConfig.territories).map(([territory, territoryConfig]) => {
        const troopState = gameController.mapController.getTroopState(territory)
        if (!troopState)
          return null

        const isInFog = visibleTerritories !== undefined && !visibleTerritories.includes(territory)

        return (
          <g key={territory} className={style.Troops} data-territory={territory}>
            <Troop
              player={troopState.player}
              count={troopState.count}
              territory={territory}
              x={territoryConfig.coords.x - troopSize * (80 / 160)}
              y={territoryConfig.coords.y - troopSize * (60 / 150)}
              width={troopSize}
              label={isInFog ? '?' : undefined}
              isInFog={isInFog}
            />
          </g>
        )
      })}
    </>
  )
}
