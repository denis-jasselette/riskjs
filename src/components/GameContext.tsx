import { createContext } from 'preact'
import { Dispatch, StateUpdater } from 'preact/hooks'

import GameState from '@/models/GameState'

type GameStateContext = { gameState: GameState, setGameState: Dispatch<StateUpdater<GameState>> }
const GameContext = createContext<GameStateContext>({} as GameStateContext)

export default GameContext
