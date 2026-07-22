import { afterEach, describe, expect, it, vi } from 'vitest'

import RandomBotAgent from '@/bots/RandomBotAgent'
import GameController from '@/controllers/GameController'
import GameState from '@/models/GameState'
import MapConfig from '@/models/MapConfig'
import type PlayerConfig from '@/models/PlayerConfig'

// A -- B -- C -- D -- E
//                |
//                F
// A, B, C owned by red (player1); D, E, F owned by blue (player2)
// B/C border blue territory D; A is interior.
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
    D: { coords: { x: 3, y: 0 }, continent: 'Land', path: '', adjacency: ['C', 'E', 'F'] },
    E: { coords: { x: 4, y: 0 }, continent: 'Land', path: '', adjacency: ['D'] },
    F: { coords: { x: 3, y: 1 }, continent: 'Land', path: '', adjacency: ['D'] },
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
  gs.currentPhase = 'deploy'
  gs.troopsToDeploy = 4
  gs.troops = [
    { territory: 'A', count: 6, player: player1 },
    { territory: 'B', count: 3, player: player1 },
    { territory: 'C', count: 4, player: player1 },
    { territory: 'D', count: 2, player: player2 },
    { territory: 'E', count: 3, player: player2 },
    { territory: 'F', count: 2, player: player2 },
  ]
  return gs
}

// Red owns A and B, each with no adjacency at all (not to each other, not to anything) —
// so red has no legal attack AND no legal fortify target, regardless of RNG.
function buildDisconnectedGameState(): GameState {
  const config = new MapConfig()
  config.name = 'DisconnectedMap'
  config.width = 10
  config.height = 10
  config.troopSize = 20
  config.continents = { Land: { bonusTroops: 1, path: '' } }
  config.territories = {
    A: { coords: { x: 0, y: 0 }, continent: 'Land', path: '', adjacency: [] },
    B: { coords: { x: 1, y: 0 }, continent: 'Land', path: '', adjacency: [] },
    C: { coords: { x: 2, y: 0 }, continent: 'Land', path: '', adjacency: ['D'] },
    D: { coords: { x: 3, y: 0 }, continent: 'Land', path: '', adjacency: ['C'] },
  }
  config.cards = { wildcards: 2, territories: {} }
  config.blizzards = 0

  const gs = new GameState()
  gs.gameOver = false
  gs.mapConfig = config
  gs.playerConfigs = [player1, player2]
  gs.blizzards = []
  gs.currentPlayer = 'red'
  gs.userPlayer = 'red'
  gs.currentPhase = 'attack'
  gs.troopsToDeploy = 0
  gs.troops = [
    { territory: 'A', count: 5, player: player1 },
    { territory: 'B', count: 5, player: player1 },
    { territory: 'C', count: 5, player: player2 },
    { territory: 'D', count: 5, player: player2 },
  ]
  return gs
}

describe('RandomBotAgent', () => {
  const agent = new RandomBotAgent()

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('decideDeploy()', () => {
    it('distributes exactly troopsToDeploy troops, only across owned territories', () => {
      const gameState = buildGameState()
      const { allocations } = agent.decideDeploy(gameState, 'red')

      const owned = new Set(['A', 'B', 'C'])
      for (const allocation of allocations) {
        expect(owned.has(allocation.territory)).toBe(true)
        expect(allocation.troops).toBeGreaterThan(0)
      }
      expect(allocations.reduce((sum, a) => sum + a.troops, 0)).toBe(gameState.troopsToDeploy)
    })

    it('returns no allocations when there are no troops left to deploy', () => {
      const gameState = buildGameState()
      gameState.troopsToDeploy = 0
      expect(agent.decideDeploy(gameState, 'red')).toEqual({ allocations: [] })
    })
  })

  describe('decideAttack()', () => {
    it('never produces an illegal attack, across many random trials', () => {
      const gameState = buildGameState()
      gameState.currentPhase = 'attack'
      const controller = new GameController(gameState)

      let sawNull = false
      let sawAttack = false

      for (let i = 0; i < 300; i++) {
        const action = agent.decideAttack(gameState, 'red')
        if (action === null) {
          sawNull = true
          continue
        }
        sawAttack = true

        expect(controller.isAttackAllowed(action.from, action.to)).toBe(true)
        const fromTroopCount = controller.getTroopCount(action.from)
        expect(fromTroopCount).toBeGreaterThanOrEqual(2)
        expect(action.troops).toBeGreaterThanOrEqual(1)
        expect(action.troops).toBeLessThanOrEqual(fromTroopCount - 1)
        expect(controller.mapController.getTerritoryOwner(action.from)).toBe('red')
      }

      // With a 30% stop probability and legal attacks available, both outcomes
      // should show up across 300 trials.
      expect(sawNull).toBe(true)
      expect(sawAttack).toBe(true)
    })

    it('returns null when the stop-probability check fires', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const gameState = buildGameState()
      gameState.currentPhase = 'attack'
      expect(agent.decideAttack(gameState, 'red')).toBeNull()
    })

    it('returns null when no legal attack exists, even bypassing the stop check', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      const gameState = buildDisconnectedGameState()
      expect(agent.decideAttack(gameState, 'red')).toBeNull()
    })
  })

  describe('decideFortify()', () => {
    it('never produces an illegal fortify, across many random trials', () => {
      const gameState = buildGameState()
      gameState.currentPhase = 'fortify'
      const controller = new GameController(gameState)

      let sawNull = false
      let sawFortify = false

      for (let i = 0; i < 300; i++) {
        const action = agent.decideFortify(gameState, 'red')
        if (action === null) {
          sawNull = true
          continue
        }
        sawFortify = true

        expect(controller.isFortifyAllowed(action.from, action.to)).toBe(true)
        const fromTroopCount = controller.getTroopCount(action.from)
        expect(fromTroopCount).toBeGreaterThanOrEqual(2)
        expect(action.troops).toBeGreaterThanOrEqual(1)
        expect(action.troops).toBeLessThanOrEqual(fromTroopCount - 1)
      }

      expect(sawNull).toBe(true)
      expect(sawFortify).toBe(true)
    })

    it('returns null when the stop-probability check fires', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const gameState = buildGameState()
      gameState.currentPhase = 'fortify'
      expect(agent.decideFortify(gameState, 'red')).toBeNull()
    })

    it('returns null when no connected same-owner destination exists', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      const gameState = buildDisconnectedGameState()
      gameState.currentPhase = 'fortify'
      expect(agent.decideFortify(gameState, 'red')).toBeNull()
    })
  })
})
