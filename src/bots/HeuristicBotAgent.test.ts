import { describe, expect, it } from 'vitest'

import HeuristicBotAgent from '@/bots/HeuristicBotAgent'
import GameState from '@/models/GameState'
import MapConfig from '@/models/MapConfig'
import type PlayerConfig from '@/models/PlayerConfig'

//     A       C -- D
//     |       |    |
//     B ------+    F
//     |
//     E
//
// Red owns A, B, E, F. Blue owns C, D.
// - A, E are interior (no adjacent enemy)
// - B borders C (weak, 2 troops)
// - F borders D (stronger, 4 troops)
function buildMapConfig(): MapConfig {
  const config = new MapConfig()
  config.name = 'TestMap'
  config.width = 100
  config.height = 100
  config.troopSize = 20
  config.continents = { Land: { bonusTroops: 1, path: '' } }
  config.territories = {
    A: { coords: { x: 0, y: 0 }, continent: 'Land', path: '', adjacency: ['B'] },
    B: { coords: { x: 0, y: 1 }, continent: 'Land', path: '', adjacency: ['A', 'C', 'E'] },
    C: { coords: { x: 1, y: 1 }, continent: 'Land', path: '', adjacency: ['B', 'D'] },
    D: { coords: { x: 2, y: 1 }, continent: 'Land', path: '', adjacency: ['C', 'F'] },
    E: { coords: { x: 0, y: 2 }, continent: 'Land', path: '', adjacency: ['B'] },
    F: { coords: { x: 2, y: 2 }, continent: 'Land', path: '', adjacency: ['D'] },
  }
  config.cards = { wildcards: 2, territories: {} }
  config.blizzards = 0
  return config
}

const player1: PlayerConfig = { currentUser: true, name: 'Player 1', color: 'red', human: false, botSkill: 'medium', position: 0 }
const player2: PlayerConfig = { currentUser: false, name: 'Player 2', color: 'blue', human: false, botSkill: 'medium', position: 1 }

function buildGameState(): GameState {
  const gs = new GameState()
  gs.gameOver = false
  gs.mapConfig = buildMapConfig()
  gs.playerConfigs = [player1, player2]
  gs.blizzards = []
  gs.currentPlayer = 'red'
  gs.userPlayer = 'red'
  gs.currentPhase = 'deploy'
  gs.troopsToDeploy = 3
  gs.troops = [
    { territory: 'A', count: 5, player: player1 },
    { territory: 'B', count: 2, player: player1 },
    { territory: 'E', count: 10, player: player1 },
    { territory: 'F', count: 4, player: player1 },
    { territory: 'C', count: 3, player: player2 },
    { territory: 'D', count: 2, player: player2 },
  ]
  return gs
}

describe('HeuristicBotAgent', () => {
  const agent = new HeuristicBotAgent()

  describe('decideDeploy()', () => {
    it('deploys only onto border territories, favoring the weakest one, when borders exist', () => {
      const gameState = buildGameState()
      const { allocations } = agent.decideDeploy(gameState, 'red')
      const byTerritory = new Map(allocations.map(a => [a.territory, a.troops]))

      expect([...byTerritory.keys()].sort()).toEqual(['B', 'F'])
      expect(allocations.reduce((sum, a) => sum + a.troops, 0)).toBe(gameState.troopsToDeploy)
      expect(byTerritory.get('B')!).toBeGreaterThanOrEqual(byTerritory.get('F')!)
    })

    it('falls back to the weakest territory overall when no border territory is owned', () => {
      const gameState = buildGameState()
      // Give every red territory to blue except the two fully-interior ones.
      gameState.troops = gameState.troops.map(t => (t.territory === 'B' || t.territory === 'F' ? { ...t, player: player2 } : t))
      gameState.troopsToDeploy = 1

      const { allocations } = agent.decideDeploy(gameState, 'red')
      const territories = allocations.map(a => a.territory).sort()
      expect(territories).toEqual(['A']) // A (5 troops) is weaker than E (10), gets the single deploy
    })

    it('returns no allocations when there are no troops left to deploy', () => {
      const gameState = buildGameState()
      gameState.troopsToDeploy = 0
      expect(agent.decideDeploy(gameState, 'red')).toEqual({ allocations: [] })
    })
  })

  describe('decideAttack()', () => {
    it('attacks when the attacker has at least 2x the defender troop count', () => {
      const gameState = buildGameState()
      gameState.currentPhase = 'attack'
      // F (4 troops) -> available attackers = 3; D has 1 troop -> 3 >= 2*1, favorable.
      gameState.troops = gameState.troops.map(t => (t.territory === 'D' ? { ...t, count: 1 } : t))

      const action = agent.decideAttack(gameState, 'red')
      expect(action).toEqual({ from: 'F', to: 'D', troops: 3 })
    })

    it('does not attack when no matchup meets the 2x threshold', () => {
      const gameState = buildGameState()
      gameState.currentPhase = 'attack'
      // B (2 troops) -> available attackers = 1 vs C (3 troops): unfavorable.
      // F (4 troops) -> available attackers = 3 vs D (2 troops): needs >= 4, unfavorable.
      expect(agent.decideAttack(gameState, 'red')).toBeNull()
    })

    it('picks the most favorable matchup when multiple are available', () => {
      const gameState = buildGameState()
      gameState.currentPhase = 'attack'
      // Make both B->C and F->D favorable; F->D has the better ratio (6/1 vs 4/1... adjust below).
      gameState.troops = gameState.troops.map((t) => {
        if (t.territory === 'B')
          return { ...t, count: 5 } // available attackers = 4, vs C(3) -> ratio 4/3
        if (t.territory === 'D')
          return { ...t, count: 1 } // F(4) available attackers = 3, vs D(1) -> ratio 3/1 (best)
        return t
      })

      const action = agent.decideAttack(gameState, 'red')
      expect(action).toEqual({ from: 'F', to: 'D', troops: 3 })
    })
  })

  describe('decideFortify()', () => {
    it('moves troops toward the territory with the most adjacent enemies, from a safe interior source', () => {
      const gameState = buildGameState()
      gameState.currentPhase = 'fortify'
      // B and F both border exactly one enemy each; 'B' sorts first alphabetically.
      const action = agent.decideFortify(gameState, 'red')

      // Reachable sources for B are A and E (both interior, connected via B itself is excluded).
      // E has more troops (10) than A (5), so E is preferred.
      expect(action).toEqual({ from: 'E', to: 'B', troops: 9 })
    })

    it('does not fortify when no owned territory borders an enemy', () => {
      const gameState = buildGameState()
      gameState.currentPhase = 'fortify'
      gameState.troops = gameState.troops.map(t => (t.territory === 'B' || t.territory === 'F' ? { ...t, player: player2 } : t))
      expect(agent.decideFortify(gameState, 'red')).toBeNull()
    })
  })
})
