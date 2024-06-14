import { useContext, useState } from 'preact/hooks'

import ActionMenu from '@/components/actionMenu/ActionMenu'
import Map from '@/components/board/Map'
import style from '@/components/Game.module.scss'
import GameContext from '@/components/GameContext'
import PlayerStatus from '@/components/playerStatus/PlayerStatus'
import GameController from '@/controllers/GameController'

const Game = () => {
  const [selectedTerritory, setSelectedTerritory] = useState<string | undefined>(undefined)
  const { gameState, setGameState } = useContext(GameContext)
  const gameController = new GameController(gameState)

  const handleEndPhase = () => {
    setGameState(gameController.startNextPhase().gameState)
  }

  const handleClickOutside = () => {
    setSelectedTerritory(undefined)
  }

  const handleClickTerritory = (territory: string) => {
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
      if (gameController.mapController.getTerritoryOwner(territory) === gameState.currentPlayer) {
        setSelectedTerritory(territory)
        return
      }
      const attackingTroops = gameController.getTroopCount(selectedTerritory) - 1
      setGameState(gameController.attack(attackingTroops, selectedTerritory, territory).gameState)
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
    <div className={style.Game} onClick={handleClickOutside}>
      <PlayerStatus />
      <ActionMenu handleEndPhase={handleEndPhase} />
      <Map class={style.GameMap} selectedTerritory={selectedTerritory} handleClickTerritory={handleClickTerritory} />
    </div>
  )
}

export default Game
