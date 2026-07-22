import { useCallback, useContext, useEffect, useRef, useState } from 'react'

import ActionMenu from '@/components/actionMenu/ActionMenu'
import Map from '@/components/board/Map'
import DiceResult, { DiceResultData } from '@/components/DiceResult'
import EliminationBanner, { EliminationBannerData } from '@/components/EliminationBanner'
import style from '@/components/Game.module.scss'
import GameContext from '@/components/GameContext'
import PlayerStatus from '@/components/playerStatus/PlayerStatus'
import TurnChangeBanner, { TurnChangeBannerData } from '@/components/TurnChangeBanner'
import GameController from '@/controllers/GameController'
import GameState from '@/models/GameState'

const Game = () => {
  const [selectedTerritory, setSelectedTerritory] = useState<string | undefined>(undefined)
  const [attackDiceCount, setAttackDiceCount] = useState<number>(1)
  const [attackResult, setAttackResult] = useState<DiceResultData | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)
  const [turnChangeNotice, setTurnChangeNotice] = useState<TurnChangeBannerData | null>(null)
  const [eliminationNotice, setEliminationNotice] = useState<EliminationBannerData | null>(null)

  const handleScaleChange = useCallback((scale: number) => {
    setIsZoomed(scale > 1.5)
  }, [])
  const { gameState, setGameState } = useContext(GameContext)
  const gameController = new GameController(gameState)

  const previousGameStateRef = useRef<GameState | null>(null)

  useEffect(() => {
    const previousGameState = previousGameStateRef.current
    previousGameStateRef.current = gameState

    // Skip comparisons across a fresh game start (previous game over, new one begun).
    if (!previousGameState || previousGameState.gameOver || gameState.gameOver)
      return

    if (previousGameState.currentPlayer !== gameState.currentPlayer) {
      const nextPlayer = gameState.playerConfigs.find(p => p.color === gameState.currentPlayer)
      if (nextPlayer)
        setTurnChangeNotice({ playerName: nextPlayer.name })
    }

    const previousController = new GameController(previousGameState)
    const currentController = new GameController(gameState)
    const newlyEliminated = gameState.playerConfigs.find(p =>
      !previousController.hasPlayerLost(p.color) && currentController.hasPlayerLost(p.color),
    )
    if (newlyEliminated)
      setEliminationNotice({ playerName: newlyEliminated.name })
  }, [gameState])

  const maxAttackDice = selectedTerritory && gameState.currentPhase === 'attack'
    ? Math.min(gameController.getTroopCount(selectedTerritory) - 1, 3)
    : 0

  const handleEndPhase = () => {
    setEliminationNotice(null)
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
      setEliminationNotice(null)
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
      setEliminationNotice(null)
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
      setEliminationNotice(null)
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
      {turnChangeNotice && (
        <TurnChangeBanner notice={turnChangeNotice} onDismiss={() => setTurnChangeNotice(null)} />
      )}
      {eliminationNotice && (
        <EliminationBanner notice={eliminationNotice} onDismiss={() => setEliminationNotice(null)} />
      )}
    </div>
  )
}

export default Game
