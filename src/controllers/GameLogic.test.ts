import { describe, expect, it } from 'vitest'

import classicMapConfigJson from '@/assets/maps/classic/config.json'
import GameLogic from '@/controllers/GameLogic'
import MapConfig from '@/models/MapConfig'
import type { PlayerColor } from '@/models/PlayerConfig'
import type PlayerConfig from '@/models/PlayerConfig'
import TerritoryConfig from '@/models/TerritoryConfig'

const classicMapConfig = classicMapConfigJson as MapConfig

// GameLogic.isConnectedExcluding / selectConnectivitySafeBlizzards are
// intentionally private static implementation details (they run before any
// GameState exists, so they can't be reached via MapController). Access them
// through a narrow structural cast rather than `any` so the test still gets
// type checking on call shape.
interface GameLogicInternals {
  isConnectedExcluding: (territories: Record<string, TerritoryConfig>, excluded: Set<string>) => boolean
  selectConnectivitySafeBlizzards: (mapConfig: MapConfig) => string[]
}

const Internal = GameLogic as unknown as GameLogicInternals

// Small hand-built map for direct isConnectedExcluding() unit cases:
//   A -- B -- C
//        |
//        D
function buildSmallMapConfig(): MapConfig {
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
  config.cards = {
    wildcards: 2,
    territories: { A: 'infantry', B: 'cavalry', C: 'artillery', D: 'infantry' },
  }
  config.blizzards = 0
  return config
}

// A linear "chain" map: T0 -- T1 -- T2 -- ... -- T(n-1).
// On a path graph, freezing any single interior node splits the remainder in
// two, so most random combinations of frozen territories DO disconnect the
// map — only prefixes/suffixes taken from the two ends are safe. This makes
// it a strong adversarial fixture for proving the connectivity guarantee
// actually constrains selection (a naive random pick would fail on this map
// very often).
function buildChainMapConfig(length: number, blizzards: number): MapConfig {
  const config = new MapConfig()
  config.name = 'ChainMap'
  config.width = 100
  config.height = 100
  config.troopSize = 20
  config.continents = { Only: { bonusTroops: 1, path: '' } }

  const names = Array.from({ length }, (_, i) => `T${i}`)
  config.territories = {}
  config.cards = { wildcards: 0, territories: {} }

  names.forEach((name, i) => {
    const adjacency: string[] = []
    if (i > 0)
      adjacency.push(names[i - 1])
    if (i < names.length - 1)
      adjacency.push(names[i + 1])

    config.territories[name] = { coords: { x: i, y: 0 }, continent: 'Only', path: '', adjacency }
    config.cards.territories[name] = 'infantry'
  })

  config.blizzards = blizzards
  return config
}

function makePlayers(count: number): PlayerConfig[] {
  const colors: PlayerColor[] = ['red', 'blue', 'green', 'white', 'black']
  return Array.from({ length: count }, (_, i) => ({
    currentUser: i === 0,
    name: `Player ${i + 1}`,
    color: colors[i],
    human: true,
    position: i,
  }))
}

// Plain BFS over the raw territory adjacency graph, independent from
// GameLogic's own implementation, used to independently verify the
// non-frozen territories returned by autoSetupTroops() are actually
// connected (avoids the test trivially passing by re-using the exact same
// code path it's meant to validate).
function isFullyConnected(territories: Record<string, TerritoryConfig>, frozen: string[]): boolean {
  const frozenSet = new Set(frozen)
  const remaining = Object.keys(territories).filter(t => !frozenSet.has(t))
  if (remaining.length <= 1)
    return true

  const visited = new Set<string>([remaining[0]])
  const queue = [remaining[0]]

  while (queue.length > 0) {
    const current = queue.shift() as string
    for (const neighbor of territories[current]?.adjacency ?? []) {
      if (frozenSet.has(neighbor) || visited.has(neighbor))
        continue
      visited.add(neighbor)
      queue.push(neighbor)
    }
  }

  return visited.size === remaining.length
}

describe('GameLogic', () => {
  describe('isConnectedExcluding()', () => {
    it('returns true when nothing is excluded', () => {
      const { territories } = buildSmallMapConfig()
      expect(Internal.isConnectedExcluding(territories, new Set())).toBe(true)
    })

    it('returns false when excluding a node splits the remaining graph', () => {
      const { territories } = buildSmallMapConfig()
      // Removing B disconnects A, C, D from each other.
      expect(Internal.isConnectedExcluding(territories, new Set(['B']))).toBe(false)
    })

    it('returns true when excluding a leaf node', () => {
      const { territories } = buildSmallMapConfig()
      // Removing C (a leaf) leaves A-B-D fully connected.
      expect(Internal.isConnectedExcluding(territories, new Set(['C']))).toBe(true)
    })

    it('returns true when excluding all but one node (vacuous)', () => {
      const { territories } = buildSmallMapConfig()
      expect(Internal.isConnectedExcluding(territories, new Set(['A', 'C', 'D']))).toBe(true)
    })

    it('returns true when excluding every node (vacuous)', () => {
      const { territories } = buildSmallMapConfig()
      expect(Internal.isConnectedExcluding(territories, new Set(['A', 'B', 'C', 'D']))).toBe(true)
    })
  })

  describe('selectConnectivitySafeBlizzards()', () => {
    it('always returns exactly mapConfig.blizzards territories and never disconnects an adversarial chain map (100 runs)', () => {
      const mapConfig = buildChainMapConfig(10, 3)

      for (let i = 0; i < 100; i++) {
        const frozen = Internal.selectConnectivitySafeBlizzards(mapConfig)
        expect(frozen).toHaveLength(mapConfig.blizzards)
        expect(isFullyConnected(mapConfig.territories, frozen)).toBe(true)
      }
    })

    it('always keeps the classic map connected (100 runs)', () => {
      for (let i = 0; i < 100; i++) {
        const frozen = Internal.selectConnectivitySafeBlizzards(classicMapConfig)
        expect(frozen).toHaveLength(classicMapConfig.blizzards)
        expect(isFullyConnected(classicMapConfig.territories, frozen)).toBe(true)
      }
    })
  })

  describe('autoSetupTroops()', () => {
    it('produces a fully connected non-frozen classic map with the configured blizzard count, every time (100 runs)', () => {
      const playerConfigs = makePlayers(4)

      for (let i = 0; i < 100; i++) {
        const [, blizzards] = GameLogic.autoSetupTroops(classicMapConfig, playerConfigs, true)

        expect(blizzards).toHaveLength(classicMapConfig.blizzards)
        expect(isFullyConnected(classicMapConfig.territories, blizzards)).toBe(true)
      }
    })

    it('never disconnects the adversarial chain map across many runs, unlike unconstrained random selection', () => {
      const mapConfig = buildChainMapConfig(10, 3)
      const playerConfigs = makePlayers(2)

      for (let i = 0; i < 100; i++) {
        const [, blizzards] = GameLogic.autoSetupTroops(mapConfig, playerConfigs, true)

        expect(blizzards).toHaveLength(mapConfig.blizzards)
        expect(isFullyConnected(mapConfig.territories, blizzards)).toBe(true)
      }
    })

    it('does no connectivity-related selection when blizzards are disabled', () => {
      const playerConfigs = makePlayers(3)

      for (let i = 0; i < 25; i++) {
        const [, blizzards] = GameLogic.autoSetupTroops(classicMapConfig, playerConfigs, false)
        expect(blizzards).toEqual([])
      }
    })

    it('deals every territory exactly once across blizzards + troops, preserving deck integrity after reordering', () => {
      const playerConfigs = makePlayers(5)

      for (let i = 0; i < 25; i++) {
        const [troops, blizzards] = GameLogic.autoSetupTroops(classicMapConfig, playerConfigs, true)

        const allAssigned = [...blizzards, ...troops.map(t => t.territory)]
        const allTerritoryNames = Object.keys(classicMapConfig.territories)

        expect(allAssigned).toHaveLength(allTerritoryNames.length)
        expect(new Set(allAssigned).size).toBe(allTerritoryNames.length)
        expect(new Set(allAssigned)).toEqual(new Set(allTerritoryNames))
      }
    })
  })
})
