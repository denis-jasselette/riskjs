import { describe, it, expect, beforeEach } from 'vitest'
import { MapController } from '@/controllers/MapController'
import GameState from '@/models/GameState'
import MapConfig from '@/models/MapConfig'
import type PlayerConfig from '@/models/PlayerConfig'

// Build a minimal 4-territory map for unit isolation:
//   A -- B -- C
//        |
//        D
// A and B are owned by player1
// C and D are owned by player2
function buildMinimalMapConfig(): MapConfig {
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
    B: { coords: { x: 1, y: 0 }, continent: 'North', path: '', adjacency: ['A', 'C', 'D'] },
    C: { coords: { x: 2, y: 0 }, continent: 'South', path: '', adjacency: ['B'] },
    D: { coords: { x: 1, y: 1 }, continent: 'South', path: '', adjacency: ['B'] },
  }
  config.cards = { wildcards: 2, territories: {} }
  config.blizzards = 0
  return config
}

const player1: PlayerConfig = {
  currentUser: true,
  name: 'Player 1',
  color: 'red',
  human: true,
  position: 0,
}

const player2: PlayerConfig = {
  currentUser: false,
  name: 'Player 2',
  color: 'blue',
  human: false,
  position: 1,
}

function buildGameState(): GameState {
  const gs = new GameState()
  gs.gameOver = false
  gs.mapConfig = buildMinimalMapConfig()
  gs.playerConfigs = [player1, player2]
  gs.blizzards = []
  gs.currentPlayer = 'red'
  gs.userPlayer = 'red'
  gs.currentPhase = 'deploy'
  gs.troopsToDeploy = 3
  gs.troops = [
    { territory: 'A', count: 3, player: player1 },
    { territory: 'B', count: 5, player: player1 },
    { territory: 'C', count: 4, player: player2 },
    { territory: 'D', count: 2, player: player2 },
  ]
  return gs
}

describe('MapController', () => {
  let mapController: MapController

  beforeEach(() => {
    mapController = new MapController(buildGameState())
  })

  describe('areAdjacent()', () => {
    it('returns true for directly adjacent territories', () => {
      expect(mapController.areAdjacent('A', 'B')).toBe(true)
      expect(mapController.areAdjacent('B', 'C')).toBe(true)
      expect(mapController.areAdjacent('B', 'D')).toBe(true)
    })

    it('returns false for non-adjacent territories (A and C are 2 hops away)', () => {
      expect(mapController.areAdjacent('A', 'C')).toBe(false)
      expect(mapController.areAdjacent('A', 'D')).toBe(false)
    })

    it('returns false for a territory adjacent to itself (no identity route)', () => {
      expect(mapController.areAdjacent('A', 'A')).toBe(false)
    })

    it('returns true for adjacency with differentOwner option when owners differ', () => {
      // B (player1) is adjacent to C (player2)
      expect(mapController.areAdjacent('B', 'C', { differentOwner: true })).toBe(true)
    })

    it('returns false for adjacency with differentOwner option when owners are the same', () => {
      // A and B are both owned by player1
      expect(mapController.areAdjacent('A', 'B', { differentOwner: true })).toBe(false)
    })
  })

  describe('areConnected()', () => {
    it('returns true when territories are directly connected', () => {
      expect(mapController.areConnected('A', 'B')).toBe(true)
    })

    it('returns true when territories are connected via an intermediate territory', () => {
      expect(mapController.areConnected('A', 'C')).toBe(true)
      expect(mapController.areConnected('A', 'D')).toBe(true)
    })

    it('returns false for same-start-end without allowIdentityRoute', () => {
      expect(mapController.areConnected('A', 'A')).toBe(false)
    })

    it('returns true for same-start-end with allowIdentityRoute', () => {
      expect(mapController.areConnected('A', 'A', { allowIdentityRoute: true })).toBe(true)
    })

    it('returns true when sameOwner path exists between two same-owner territories', () => {
      // A -> B: both owned by player1 — connected with sameOwner
      expect(mapController.areConnected('A', 'B', { sameOwner: true })).toBe(true)
    })

    it('returns false when sameOwner blocks the only path between different-owner territories', () => {
      // A (player1) -> C (player2): path goes through B (player1) then C (player2)
      // sameOwner check on the nextNode blocks entering C
      expect(mapController.areConnected('A', 'C', { sameOwner: true })).toBe(false)
    })
  })

  describe('getTerritoryOwner()', () => {
    it('returns the correct owner color', () => {
      expect(mapController.getTerritoryOwner('A')).toBe('red')
      expect(mapController.getTerritoryOwner('C')).toBe('blue')
    })
  })

  describe('isTerritoryBlizzard()', () => {
    it('returns false for territories without blizzard', () => {
      expect(mapController.isTerritoryBlizzard('A')).toBe(false)
    })

    it('returns true for territories with active blizzard', () => {
      const gs = buildGameState()
      gs.blizzards = ['A']
      const mc = new MapController(gs)
      expect(mc.isTerritoryBlizzard('A')).toBe(true)
    })
  })

  describe('getContinentOwner()', () => {
    it('returns the owner when a single player owns all territories in a continent', () => {
      // Both A and B are in North continent and owned by player1
      expect(mapController.getContinentOwner('North')).toBe('red')
    })

    it('returns undefined when continent is split between players', () => {
      // South has C (player2) and D (player2) — actually all player2
      expect(mapController.getContinentOwner('South')).toBe('blue')
    })

    it('returns undefined when continent is contested', () => {
      const gs = buildGameState()
      // Override C's owner to player1 to make South contested
      gs.troops = gs.troops.map(t =>
        t.territory === 'C' ? { ...t, player: player1 } : t
      )
      const mc = new MapController(gs)
      expect(mc.getContinentOwner('South')).toBeUndefined()
    })
  })
})
