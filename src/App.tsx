import { useState } from 'preact/hooks'
import './App.module.scss'
import GameOver, { HandleStartParams } from '@/components/menu/GameOver'
import Game from './components/Game'
import MapConfig from './models/MapConfig'
import PlayerConfig, { PlayerColorValues } from './models/PlayerConfig'
import classicMapConfig from './assets/maps/classic/config.json'
import GameLogic from './controllers/GameLogic'
import GameContext from './components/GameContext'
import { shuffle } from './lib/Random'

const mapConfig = classicMapConfig as MapConfig

export function App() {
  const [gameState, setGameState] = useState(GameLogic.defaultGameState(mapConfig))

  const handleStart = ({ playerCount, blizzards }: HandleStartParams) => {
    let availableColors = [...PlayerColorValues]
    shuffle(availableColors)
    let playerConfigs: PlayerConfig[] = []
    for (let i = 0; i < playerCount; i++) {
      const color = availableColors[i]
      playerConfigs.push({
        currentUser: false, name: color, color: color, human: true, position: i + 1
      })
    }
    setGameState(GameLogic.initState(mapConfig, playerConfigs, blizzards))
  }

  return <>
    <GameContext.Provider value={{ gameState, setGameState }}>
      <Game />
      {gameState.gameOver && <GameOver handleStart={(params) => handleStart(params)} />}
    </GameContext.Provider>
  </>
}
