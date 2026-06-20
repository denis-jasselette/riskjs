import { useContext, useState } from 'react'

import ActionMenu from '@/components/actionMenu/ActionMenu'
import Map from '@/components/board/Map'
import DiceResult, { DiceResultData } from '@/components/DiceResult'
import style from '@/components/Game.module.scss'
import GameContext from '@/components/GameContext'
import PlayerStatus from '@/components/playerStatus/PlayerStatus'
import GameController from '@/controllers/GameController'

const Game = () => {
  const [selectedTerritory, setSelectedTerritory] = useState<string | undefined>(undefined)
  const [attackDiceCount, setAttackDiceCount] = useState<number>(1)
  const [attackResult, setAttackResult] = useState<DiceResultData | null>(null)
  const { gameState, setGameState } = useContext(GameContext)
  const gameController = new GameController(gameState)

  const maxAttackDice = selectedTerritory && gameState.currentPhase === 'attack'
    ? Math.min(gameController.getTroopCount(selectedTerritory) - 1, 3)
    : 0

  const handleEndPhase = () => {
    setGameState(gameController.startNextPhase().gameState)
  }

  const handleClickOutside = () => {
    setSelectedTerritory(undefined)
  }

  const handleAttackDiceChange = (count: number) => {
    setAttackDiceCount(count)
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
      const newMax = Math.min(gameController.getTroopCount(territory) - 1, 3)
      setAttackDiceCount(Math.min(attackDiceCount, Math.max(newMax, 1)))
      return
    }
    if (gameState.currentPhase === 'attack') {
      if (gameController.mapController.getTerritoryOwner(territory) === gameState.currentPlayer) {
        setSelectedTerritory(territory)
        const newMax = Math.min(gameController.getTroopCount(territory) - 1, 3)
        setAttackDiceCount(Math.min(attackDiceCount, Math.max(newMax, 1)))
        return
      }
      const attackingTroops = gameController.getTroopCount(selectedTerritory) - 1
      const clampedDice = Math.min(attackDiceCount, Math.min(attackingTroops, 3))
      const updatedController = gameController.attack(attackingTroops, selectedTerritory, territory, clampedDice)
      setGameState(updatedController.gameState)
      if (updatedController.lastAttackResult) {
        setAttackResult(updatedController.lastAttackResult)
      }
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
      <ActionMenu
        handleEndPhase={handleEndPhase}
        attackDiceCount={attackDiceCount}
        maxAttackDice={maxAttackDice}
        onAttackDiceChange={handleAttackDiceChange}
      />
      <Map class={style.GameMap} selectedTerritory={selectedTerritory} handleClickTerritory={handleClickTerritory} />
      {attackResult && (
        <DiceResult result={attackResult} onDismiss={() => setAttackResult(null)} />
      )}
    </div>
  )
}

export default Game
