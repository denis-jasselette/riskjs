import { beforeEach, describe, expect, it } from 'vitest'

import { getAttackableTerritories, getOwnedTerritories, getTroopCount, isBorderTerritory } from '@/bots/BotUtils'
import GameController from '@/controllers/GameController'
import GameState from '@/models/GameState'
import MapConfig from '@/models/MapConfig'
import type PlayerConfig from '@/models/PlayerConfig'

// A -- B -- C -- D
// A, B owned by red (player1); C, D owned by blue (player2)
// A is interior (only adjacent to B, same owner); B is a border territory (adjacent to enemy C)
function buildMapConfig(): MapConfig {
  const config = new MapConfig()
  config.name = 'TestMap'
  config.width = 100
  config.height = 100
  config.troopSize = 20
  config.continents = { Land: { bonusTroops: 1, path: '' } }
  config.territories = {
    A: { coords: { x: 0, y: 0 }, continent: 'Land', path: '', adjacency: ['B'] },
    B: { coords: { x: 1, y: 0 }, continent: 'Land', path: '', adjacency: ['A', 'C'] },
    C: { coords: { x: 2, y: 0 }, continent: 'Land', path: '', adjacency: ['B', 'D'] },
    D: { coords: { x: 3, y: 0 }, continent: 'Land', path: '', adjacency: ['C'] },
  }
  config.cards = { wildcards: 2, territories: {} }
  config.blizzards = 0
  return config
}

const player1: PlayerConfig = { currentUser: true, name: 'Player 1', color: 'red', human: false, botSkill: 'easy', position: 0 }
const player2: PlayerConfig = { currentUser: false, name: 'Player 2', color: 'blue', human: false, botSkill: 'easy', position: 1 }

function buildGameState(): GameState {
  const gs = new GameState()
  gs.gameOver = false
  gs.mapConfig = buildMapConfig()
  gs.playerConfigs = [player1, player2]
  gs.blizzards = []
  gs.currentPlayer = 'red'
  gs.userPlayer = 'red'
  gs.currentPhase = 'attack'
  gs.troopsToDeploy = 0
  gs.troops = [
    { territory: 'A', count: 5, player: player1 },
    { territory: 'B', count: 3, player: player1 },
    { territory: 'C', count: 4, player: player2 },
    { territory: 'D', count: 2, player: player2 },
  ]
  return gs
}

describe('BotUtils', () => {
  let gameState: GameState
  let controller: GameController

  beforeEach(() => {
    gameState = buildGameState()
    controller = new GameController(gameState)
  })

  describe('getOwnedTerritories()', () => {
    it('returns only territories owned by the given player', () => {
      expect(getOwnedTerritories(gameState, 'red').sort()).toEqual(['A', 'B'])
      expect(getOwnedTerritories(gameState, 'blue').sort()).toEqual(['C', 'D'])
    })
  })

  describe('getTroopCount()', () => {
    it('returns the troop count for a territory', () => {
      expect(getTroopCount(gameState, 'A')).toBe(5)
    })

    it('returns 0 for an unknown territory', () => {
      expect(getTroopCount(gameState, 'Nowhere')).toBe(0)
    })
  })

  describe('getAttackableTerritories()', () => {
    it('returns adjacent enemy territories', () => {
      expect(getAttackableTerritories(gameState, controller, 'B')).toEqual(['C'])
    })

    it('returns nothing for a territory with no adjacent enemies', () => {
      expect(getAttackableTerritories(gameState, controller, 'A')).toEqual([])
    })
  })

  describe('isBorderTerritory()', () => {
    it('is true for a territory adjacent to an enemy', () => {
      expect(isBorderTerritory(gameState, controller, 'B')).toBe(true)
    })

    it('is false for an interior territory', () => {
      expect(isBorderTerritory(gameState, controller, 'A')).toBe(false)
    })
  })
})
