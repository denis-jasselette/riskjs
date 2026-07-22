import { useCallback, useContext, useEffect, useRef, useState } from 'react'

import ActionMenu from '@/components/actionMenu/ActionMenu'
import Map from '@/components/board/Map'
import DiceResult, { DiceResultData } from '@/components/DiceResult'
import style from '@/components/Game.module.scss'
import GameContext from '@/components/GameContext'
import Notification, { NotificationData } from '@/components/Notification'
import PlayerStatus from '@/components/playerStatus/PlayerStatus'
import GameController from '@/controllers/GameController'

const Game = () => {
  const [selectedTerritory, setSelectedTerritory] = useState<string | undefined>(undefined)
  const [attackDiceCount, setAttackDiceCount] = useState<number>(1)
  const [attackResult, setAttackResult] = useState<DiceResultData | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)
  const [notification, setNotification] = useState<NotificationData | null>(null)

  const handleScaleChange = useCallback((scale: number) => {
    setIsZoomed(scale > 1.5)
  }, [])
  const { gameState, setGameState } = useContext(GameContext)
  const gameController = new GameController(gameState)

  const prevPlayerRef = useRef<string | null>(null)
  const prevTerritoryCountsRef = useRef<Record<string, number>>({})

  useEffect(() => {
    const prevPlayer = prevPlayerRef.current
    const currentPlayer = gameState.currentPlayer

    // Build a map of territory counts per player
    const territoryCounts: Record<string, number> = {}
    for (const playerConfig of gameState.playerConfigs) {
      territoryCounts[playerConfig.color] = gameController.getPlayerTerritoryTotal(playerConfig.color)
    }

    // Detect eliminations: any player that had territories before but now has 0
    const prevCounts = prevTerritoryCountsRef.current
    for (const playerConfig of gameState.playerConfigs) {
      const prev = prevCounts[playerConfig.color]
      const current = territoryCounts[playerConfig.color]
      if (prev !== undefined && prev > 0 && current === 0) {
        setNotification({
          message: `${playerConfig.name} has been eliminated!`,
          type: 'elimination',
          playerColor: playerConfig.color,
        })
        prevTerritoryCountsRef.current = territoryCounts
        prevPlayerRef.current = currentPlayer
        return
      }
    }

    prevTerritoryCountsRef.current = territoryCounts

    // Detect turn change (only after the game state is initialised — prevPlayer is set)
    if (prevPlayer !== null && prevPlayer !== currentPlayer) {
      const playerConfig = gameState.playerConfigs.find(p => p.color === currentPlayer)
      if (playerConfig) {
        setNotification({
          message: `It's ${playerConfig.name}'s turn`,
          type: 'turn',
          playerColor: playerConfig.color,
        })
      }
    }

    prevPlayerRef.current = currentPlayer
  }, [gameState.currentPlayer, gameState.troops])

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
      <Map
        class={isZoomed ? style.GameMapFullscreen : style.GameMapSafeArea}
        selectedTerritory={selectedTerritory}
        handleClickTerritory={handleClickTerritory}
        onScaleChange={handleScaleChange}
      />
      {attackResult && (
        <DiceResult result={attackResult} onDismiss={() => setAttackResult(null)} />
      )}
      {notification && (
        <Notification
          notification={notification}
          onDismiss={() => setNotification(null)}
        />
      )}
    </div>
  )
}

export default Game
