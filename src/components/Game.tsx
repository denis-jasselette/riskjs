import { useCallback, useContext, useEffect, useRef, useState } from 'react'

import { decideAction } from '@/bots/decideAction'
import ActionMenu from '@/components/actionMenu/ActionMenu'
import CardHand from '@/components/actionMenu/CardHand'
import Map from '@/components/board/Map'
import CapitalCounter from '@/components/capitalCounter/CapitalCounter'
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
  const [fortifyDestination, setFortifyDestination] = useState<string | undefined>(undefined)
  const [fortifyTroopCount, setFortifyTroopCount] = useState<number>(1)
  const [deployTroopCount, setDeployTroopCount] = useState<number>(1)
  const [postConquestTroopCount, setPostConquestTroopCount] = useState<number>(1)
  const [attackResult, setAttackResult] = useState<DiceResultData | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)
  const [turnChangeNotice, setTurnChangeNotice] = useState<TurnChangeBannerData | null>(null)
  const [eliminationNotice, setEliminationNotice] = useState<EliminationBannerData | null>(null)

  const handleScaleChange = useCallback((scale: number) => {
    setIsZoomed(scale > 1.5)
  }, [])
  const { gameState, setGameState, viewingPlayer } = useContext(GameContext)
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

  // Drives an automated seat's turn: whenever the current player is bot-
  // controlled (human === false), ask decideAction for its next move and
  // apply it through the identical gameController.<action>(...).gameState ->
  // setGameState(...) pipeline every human-triggered handler above already
  // uses. Depends on [gameState] (not just currentPlayer) so it re-fires
  // after each of the bot's own actions -- deploy, then however many
  // attacks, then fortify -- continuing to drive its turn across multiple
  // phases until control passes to a non-bot seat or the game ends.
  useEffect(() => {
    if (gameState.gameOver) return

    const currentPlayerConfig = gameState.playerConfigs.find(p => p.color === gameState.currentPlayer)
    if (!currentPlayerConfig || currentPlayerConfig.human) return

    const decision = decideAction(gameState, gameController.mapController, gameState.currentPlayer)
    if (!decision) return

    switch (decision.type) {
      case 'choose_capital':
        setGameState(gameController.chooseCapital(decision.territory).gameState)
        return
      case 'deploy':
        setGameState(gameController.deploy(decision.troops, decision.territory).gameState)
        return
      case 'attack': {
        const updatedController = gameController.attack(decision.attackingTroops, decision.attackingTerritory, decision.defendingTerritory)
        setGameState(updatedController.gameState)
        if (updatedController.lastAttackResult)
          setAttackResult(updatedController.lastAttackResult)
        return
      }
      case 'confirm_post_conquest_move':
        setGameState(gameController.confirmPostConquestMove(decision.troopsToMove).gameState)
        return
      case 'fortify':
        setGameState(gameController.fortify(decision.troops, decision.fromTerritory, decision.toTerritory).gameState)
        return
      case 'trade_cards':
        setGameState(gameController.tradeCards(decision.cardIndices, decision.bonusTerritory).gameState)
        return
      case 'end_phase':
        setGameState(gameController.startNextPhase().gameState)
    }
  }, [gameState])

  // Default the deploy picker to "place everything remaining" whenever the
  // remaining pool changes (a new turn, a trade-in bonus) — the player can
  // still reduce it before clicking a territory to split their deployment.
  useEffect(() => {
    setDeployTroopCount(gameState.troopsToDeploy)
  }, [gameState.troopsToDeploy])

  // Default the post-conquest troop-count picker to "move everyone"
  // (maxPostConquestTroops) whenever a new choice becomes pending (FR-005) --
  // the player can still reduce it before clicking Confirm.
  useEffect(() => {
    if (gameState.pendingPostConquestMove)
      setPostConquestTroopCount(maxPostConquestTroops)
  }, [gameState.pendingPostConquestMove])

  const maxAttackDice = selectedTerritory && gameState.currentPhase === 'attack'
    ? Math.min(gameController.getTroopCount(selectedTerritory) - 1, 3)
    : 0

  const maxFortifyTroops = selectedTerritory && gameState.currentPhase === 'fortify'
    ? gameController.getTroopCount(selectedTerritory) - 1
    : 0

  const maxDeployTroops = gameState.currentPhase === 'deploy' ? gameState.troopsToDeploy : 0

  // Post-conquest troop movement (024): the upper bound is never stored on
  // gameState -- it's always recomputable as the two territories' combined
  // post-combat troop pool minus 1 (their sum is fixed once combat ends;
  // only its split changes as the player adjusts the choice).
  const maxPostConquestTroops = gameState.pendingPostConquestMove
    ? gameController.getTroopCount(gameState.pendingPostConquestMove.sourceTerritory) + gameController.getTroopCount(gameState.pendingPostConquestMove.conqueredTerritory) - 1
    : 0

  const resetFortifySelection = () => {
    setFortifyDestination(undefined)
    setFortifyTroopCount(1)
  }

  const handleEndPhase = () => {
    setEliminationNotice(null)
    setSelectedTerritory(undefined)
    resetFortifySelection()
    setGameState(gameController.startNextPhase().gameState)
  }

  const handleClickOutside = () => {
    setSelectedTerritory(undefined)
    resetFortifySelection()
  }

  const handleResign = () => {
    setEliminationNotice(null)
    setGameState(gameController.resign(viewingPlayer).gameState)
  }

  const handleAttackDiceChange = (count: number) => {
    setAttackDiceCount(count)
  }

  const handleFortifyTroopCountChange = (count: number) => {
    const clamped = Math.min(Math.max(count, 1), Math.max(maxFortifyTroops, 1))
    setFortifyTroopCount(clamped)
  }

  const handleDeployTroopCountChange = (count: number) => {
    const clamped = Math.min(Math.max(count, 1), Math.max(maxDeployTroops, 1))
    setDeployTroopCount(clamped)
  }

  const handlePostConquestTroopCountChange = (count: number) => {
    const min = gameState.pendingPostConquestMove?.minTroopsToMove ?? 1
    const clamped = Math.min(Math.max(count, min), Math.max(maxPostConquestTroops, min))
    setPostConquestTroopCount(clamped)
  }

  const handlePostConquestConfirm = () => {
    setEliminationNotice(null)
    setGameState(gameController.confirmPostConquestMove(postConquestTroopCount).gameState)
  }

  const handleFortifyConfirm = () => {
    if (!selectedTerritory || !fortifyDestination)
      return

    setEliminationNotice(null)
    setGameState(gameController.fortify(fortifyTroopCount, selectedTerritory, fortifyDestination).gameState)
    setSelectedTerritory(undefined)
    resetFortifySelection()
  }

  const handleClickTerritory = (territory: string) => {
    if (!gameController.isSelectable(territory, selectedTerritory ?? null, viewingPlayer))
      return

    if (gameState.currentPhase === 'capitalDeploy') {
      setEliminationNotice(null)
      setGameState(gameController.chooseCapital(territory).gameState)
      return
    }
    if (gameState.currentPhase === 'deploy') {
      setEliminationNotice(null)
      const amount = Math.min(Math.max(deployTroopCount, 1), gameState.troopsToDeploy)
      setGameState(gameController.deploy(amount, territory).gameState)
      return
    }
    if (selectedTerritory === territory) {
      setSelectedTerritory(undefined)
      resetFortifySelection()
      return
    }
    if (!selectedTerritory) {
      setSelectedTerritory(territory)
      resetFortifySelection()
      const newMax = Math.min(gameController.getTroopCount(territory) - 1, 3)
      setAttackDiceCount(Math.max(newMax, 1))
      return
    }
    if (gameState.currentPhase === 'attack') {
      if (gameController.mapController.getTerritoryOwner(territory) === gameState.currentPlayer) {
        setSelectedTerritory(territory)
        const newMax = Math.min(gameController.getTroopCount(territory) - 1, 3)
        setAttackDiceCount(Math.max(newMax, 1))
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
      if (territory === fortifyDestination) {
        resetFortifySelection()
        return
      }
      if (maxFortifyTroops <= 1) {
        // Only one possible troop count (source has exactly 2 troops) —
        // nothing to choose, so move immediately instead of requiring a
        // separate Confirm.
        setEliminationNotice(null)
        setGameState(gameController.fortify(1, selectedTerritory, territory).gameState)
        setSelectedTerritory(undefined)
        resetFortifySelection()
        return
      }
      setFortifyDestination(territory)
      setFortifyTroopCount(maxFortifyTroops)
      return
    }
  }

  return (
    <div className={style.Game} onClick={handleClickOutside}>
      <PlayerStatus />
      <CapitalCounter />
      <CardHand />
      <ActionMenu
        handleEndPhase={handleEndPhase}
        attackDiceCount={attackDiceCount}
        maxAttackDice={maxAttackDice}
        onAttackDiceChange={handleAttackDiceChange}
        fortifyDestination={fortifyDestination}
        fortifyTroopCount={fortifyTroopCount}
        maxFortifyTroops={maxFortifyTroops}
        onFortifyTroopCountChange={handleFortifyTroopCountChange}
        onFortifyConfirm={handleFortifyConfirm}
        deployTroopCount={deployTroopCount}
        maxDeployTroops={maxDeployTroops}
        onDeployTroopCountChange={handleDeployTroopCountChange}
        postConquestTroopCount={postConquestTroopCount}
        onPostConquestTroopCountChange={handlePostConquestTroopCountChange}
        onPostConquestConfirm={handlePostConquestConfirm}
        onResign={handleResign}
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
