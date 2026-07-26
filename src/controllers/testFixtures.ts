import Card from '@/models/Card'
import { CardType } from '@/models/CardType'
import GameState from '@/models/GameState'
import MapConfig from '@/models/MapConfig'
import type PlayerConfig from '@/models/PlayerConfig'

// Shared fixture builders for GameController/MapController/bot tests --
// extracted to a plain module (not *.test.ts) so importing them doesn't
// re-execute another file's own test suite as a side effect.

// Builds a Card literal for test fixtures. Territory is omitted for wildcards.
export function card(type: CardType, territory?: string): Card {
  return { type, territory }
}

// Minimal 4-territory map:
//   A -- B -- C
//             |
//             D
// A, B owned by player1 ("red"); C, D owned by player2 ("blue")
export function buildMinimalMapConfig(): MapConfig {
  const config = new MapConfig()
  config.name = 'TestMap'
  config.width = 100
  config.height = 100
  config.troopSize = 20
  config.continents = {
    North: { bonusTroops: 3, path: '' },
    South: { bonusTroops: 2, path: '' },
  }
  config.territories = {
    A: { coords: { x: 0, y: 0 }, continent: 'North', path: '', adjacency: ['B'] },
    B: { coords: { x: 1, y: 0 }, continent: 'North', path: '', adjacency: ['A', 'C'] },
    C: { coords: { x: 2, y: 0 }, continent: 'South', path: '', adjacency: ['B', 'D'] },
    D: { coords: { x: 2, y: 1 }, continent: 'South', path: '', adjacency: ['C'] },
  }
  config.cards = { wildcards: 2, territories: {} }
  config.blizzards = 0
  return config
}

export const player1: PlayerConfig = {
  currentUser: true,
  name: 'Player 1',
  color: 'red',
  human: true,
  position: 0,
}

export const player2: PlayerConfig = {
  currentUser: false,
  name: 'Player 2',
  color: 'blue',
  human: false,
  position: 1,
}

export const player3: PlayerConfig = {
  currentUser: false,
  name: 'Player 3',
  color: 'green',
  human: false,
  position: 2,
}

export const player4: PlayerConfig = {
  currentUser: false,
  name: 'Player 4',
  color: 'purple',
  human: false,
  position: 3,
}

// Assigns the given territories to the given player in gameState.troops
// (1 troop each; troop count is irrelevant to reinforcement calculation).
export function ownTerritories(gs: GameState, player: PlayerConfig, territories: string[]) {
  for (const territory of territories) {
    gs.troops.push({ territory, count: 1, player })
  }
}

export function buildGameState(): GameState {
  const gs = new GameState()
  gs.gameOver = false
  gs.mapConfig = buildMinimalMapConfig()
  gs.playerConfigs = [player1, player2]
  gs.blizzards = []
  gs.currentPlayer = 'red'
  gs.currentPhase = 'deploy'
  gs.troopsToDeploy = 3
  gs.troops = [
    { territory: 'A', count: 3, player: player1 },
    { territory: 'B', count: 5, player: player1 },
    { territory: 'C', count: 4, player: player2 },
    { territory: 'D', count: 2, player: player2 },
  ]
  gs.deck = []
  gs.playerCards = { red: [], blue: [] }
  gs.conqueredTerritoryThisTurn = false
  gs.tradeCount = 0
  gs.cardBonusMode = 'fixed'
  return gs
}
