import { createContext, Dispatch, SetStateAction } from 'react'

import GameState from '@/models/GameState'

type GameStateContext = { gameState: GameState, setGameState: Dispatch<SetStateAction<GameState>> }
const GameContext = createContext<GameStateContext>({} as GameStateContext)

export default GameContext
