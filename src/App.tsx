import '@/App.module.scss'

import { useState } from 'react'

import classicMapConfig from '@/assets/maps/classic/config.json'
import Game from '@/components/Game'
import GameContext from '@/components/GameContext'
import OnlineLobby from '@/components/lobby/OnlineLobby'
import GameOver, { HandleStartParams } from '@/components/menu/GameOver'
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

  const handleStart = ({ playerCount, blizzards, fog, cardBonus }: HandleStartParams) => {
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
    setGameState(GameLogic.initState(mapConfig, playerConfigs, blizzards, false, fog, cardBonus))
  }

  const handleGameStarted = (startedGameState: GameState, startedViewingPlayer: string) => {
    setGameState(startedGameState)
    setOnlineViewingPlayer(startedViewingPlayer)
    setMenu('local')
  }

  return (
    <GameContext.Provider value={{ gameState, setGameState, viewingPlayer }}>
      <Game />
      {gameState.gameOver && menu === 'local' && (
        <GameOver handleStart={params => handleStart(params)} onGoOnline={() => setMenu('online')} />
      )}
      {gameState.gameOver && menu === 'online' && (
        <OnlineLobby onGameStarted={handleGameStarted} onExit={() => setMenu('local')} />
      )}
    </GameContext.Provider>
  )
}
