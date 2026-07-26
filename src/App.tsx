import '@/App.module.scss'

import { useState } from 'react'

import classicMapConfig from '@/assets/maps/classic/config.json'
import Game from '@/components/Game'
import GameContext from '@/components/GameContext'
import OnlineLobby from '@/components/lobby/OnlineLobby'
import GameOver, { HandleStartParams } from '@/components/menu/GameOver'
import ResultsModal from '@/components/menu/ResultsModal'
import GameController from '@/controllers/GameController'
import GameLogic from '@/controllers/GameLogic'
import { shuffle } from '@/lib/Random'
import GameState from '@/models/GameState'
import MapConfig from '@/models/MapConfig'
import PlayerConfig, { PlayerColorValues } from '@/models/PlayerConfig'

const mapConfig = classicMapConfig as MapConfig

export function App() {
  const [gameState, setGameState] = useState(GameLogic.defaultGameState(mapConfig))
  const [menu, setMenu] = useState<'local' | 'online'>('local')
  // In local hotseat play there is no fixed "viewing player" — whoever is
  // physically holding the device controls whichever player's turn it currently is,
  // so viewingPlayer tracks currentPlayer. Online play pins the viewing player to the
  // seat assigned when the game started, overriding that default.
  const [onlineViewingPlayer, setOnlineViewingPlayer] = useState<string | null>(null)
  const viewingPlayer = onlineViewingPlayer ?? gameState.currentPlayer

  // Whether the local viewer dismissed the mid-game personal elimination
  // view via "Spectate" -- lets them keep watching without the popup
  // reappearing on every render, while leaving the eventual final results
  // view (gated separately, below) completely unaffected by this dismissal.
  const [spectating, setSpectating] = useState(false)
  // Whether the local viewer asked to move on (Play again / Quit) from
  // whichever <ResultsModal> view they were looking at -- forces the current
  // game to an end (if it wasn't already) and hides the modal, revealing the
  // existing GameOver new-game menu underneath.
  const [movingOn, setMovingOn] = useState(false)

  const gameController = new GameController(gameState)
  const localPlayerConfig = gameState.playerConfigs.find(p => p.color === viewingPlayer)

  // gameOver alone is not a reliable "a real game just ended" signal -- it
  // doubles as GameState's pre-existing "no game currently in progress"
  // idle/reset default (e.g. before any game has been started), which has no
  // actual winner. getWinner() re-derives the winner fresh from live state,
  // so it's only defined once a win condition has genuinely been met.
  const winnerColor = gameState.gameOver ? gameController.getWinner() : undefined
  const isGameActuallyOver = winnerColor !== undefined
  const winner = isGameActuallyOver ? (gameState.playerConfigs.find(p => p.color === winnerColor) ?? null) : null

  const isEliminatedMidGame = !gameState.gameOver
    && gameController.hasPlayerLost(viewingPlayer)
    && !gameController.isResigned(viewingPlayer)
  const showResultsModal = !movingOn && localPlayerConfig != null
    && (isGameActuallyOver || (isEliminatedMidGame && !spectating))

  const standings = showResultsModal ? gameController.getStandings() : []

  const handleStart = ({ playerCount, blizzards, fog, cardBonus, capitalMode }: HandleStartParams) => {
    const availableColors = [...PlayerColorValues]
    shuffle(availableColors)
    const playerConfigs: PlayerConfig[] = []
    for (let i = 0; i < playerCount; i++) {
      const color = availableColors[i]
      playerConfigs.push({
        currentUser: false, name: color, color: color, human: true, position: i + 1,
      })
    }
    setOnlineViewingPlayer(null)
    setSpectating(false)
    setMovingOn(false)
    setGameState(GameLogic.initState(mapConfig, playerConfigs, blizzards, false, fog, cardBonus, capitalMode))
  }

  const handleGameStarted = (startedGameState: GameState, startedViewingPlayer: string) => {
    setGameState(startedGameState)
    setOnlineViewingPlayer(startedViewingPlayer)
    setSpectating(false)
    setMovingOn(false)
    setMenu('local')
  }

  const handleMoveOn = () => {
    setMovingOn(true)
    if (!gameState.gameOver)
      setGameState({ ...gameState, gameOver: true })
  }

  return (
    <GameContext.Provider value={{ gameState, setGameState, viewingPlayer }}>
      <Game />
      {showResultsModal && localPlayerConfig && (
        <ResultsModal
          winner={winner}
          standings={standings}
          localPlayer={localPlayerConfig}
          fogOfWar={gameState.fogEnabled}
          totalTurns={gameState.turnCount}
          onPlayAgain={handleMoveOn}
          onQuit={handleMoveOn}
          onSpectate={() => setSpectating(true)}
        />
      )}
      {gameState.gameOver && !showResultsModal && menu === 'local' && (
        <GameOver handleStart={params => handleStart(params)} onGoOnline={() => setMenu('online')} />
      )}
      {gameState.gameOver && !showResultsModal && menu === 'online' && (
        <OnlineLobby onGameStarted={handleGameStarted} onExit={() => setMenu('local')} />
      )}
    </GameContext.Provider>
  )
}
