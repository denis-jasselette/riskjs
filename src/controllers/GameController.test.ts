import { beforeEach, describe, expect, it, vi } from 'vitest'

import GameController from '@/controllers/GameController'
import GameState from '@/models/GameState'
import MapConfig from '@/models/MapConfig'
import type PlayerConfig from '@/models/PlayerConfig'

// Minimal 4-territory map:
//   A -- B -- C
//             |
//             D
// A, B owned by player1 ("red"); C, D owned by player2 ("blue")
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
    B: { coords: { x: 1, y: 0 }, continent: 'North', path: '', adjacency: ['A', 'C'] },
    C: { coords: { x: 2, y: 0 }, continent: 'South', path: '', adjacency: ['B', 'D'] },
    D: { coords: { x: 2, y: 1 }, continent: 'South', path: '', adjacency: ['C'] },
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

describe('GameController', () => {
  let controller: GameController

  beforeEach(() => {
    controller = new GameController(buildGameState())
  })

  // --------------------------------------------------------
  describe('deploy()', () => {
    it('increases troop count on the target territory', () => {
      const before = controller.getTroopCount('A')
      controller.deploy(2, 'A')
      expect(controller.getTroopCount('A')).toBe(before + 2)
    })

    it('decreases troopsToDeploy by the number deployed', () => {
      controller.deploy(2, 'A')
      expect(controller.gameState.troopsToDeploy).toBe(1)
    })

    it('transitions to attack phase when all troops are deployed', () => {
      // Deploy all 3 remaining troops
      controller.deploy(3, 'A')
      expect(controller.gameState.currentPhase).toBe('attack')
    })

    it('stays in deploy phase when troops remain', () => {
      controller.deploy(1, 'A')
      expect(controller.gameState.currentPhase).toBe('deploy')
    })
  })

  // --------------------------------------------------------
  describe('attack()', () => {
    it('attacker wins: territory is captured and player changes', () => {
      // Force the RNG so attacker always wins every roll.
      // attackRng returns [attackerLosses, defenderLosses].
      // When losses[0] < attackingTroops, the attacker wins.
      vi.spyOn(controller, 'attackRng').mockReturnValue([0, 4])

      controller.attack(3, 'B', 'C') // attack with 3 troops against C (4 defenders)

      // C should now be owned by player1 ("red")
      expect(controller.mapController.getTerritoryOwner('C')).toBe('red')
      // Attacker (B) loses the troops it sent: 5 - 3 = 2
      expect(controller.getTroopCount('B')).toBe(2)
      // Defender territory gets: attackingTroops - attackerLosses = 3 - 0 = 3
      expect(controller.getTroopCount('C')).toBe(3)
    })

    it('attacker loses: troop counts decrease, territory stays with defender', () => {
      // Force the RNG so attacker loses all troops.
      vi.spyOn(controller, 'attackRng').mockReturnValue([3, 0])

      controller.attack(3, 'B', 'C') // attack with 3 troops against C (4 defenders)

      // C should still be owned by player2 ("blue")
      expect(controller.mapController.getTerritoryOwner('C')).toBe('blue')
      // Attacker (B) loses 3: 5 - 3 = 2
      expect(controller.getTroopCount('B')).toBe(2)
      // Defender (C) loses 0: stays at 4
      expect(controller.getTroopCount('C')).toBe(4)
    })

    it('partial defender loss: defender loses some troops but territory stays', () => {
      vi.spyOn(controller, 'attackRng').mockReturnValue([3, 2])

      controller.attack(3, 'B', 'C')

      // Attacker lost all 3 => attacker did NOT capture
      expect(controller.mapController.getTerritoryOwner('C')).toBe('blue')
      // B loses 3: 5 - 3 = 2
      expect(controller.getTroopCount('B')).toBe(2)
      // C loses 2: 4 - 2 = 2
      expect(controller.getTroopCount('C')).toBe(2)
    })
  })

  // --------------------------------------------------------
  describe('fortify()', () => {
    it('moves troops from one territory to another', () => {
      controller.fortify(2, 'A', 'B')

      // A loses 2: 3 - 2 = 1
      expect(controller.getTroopCount('A')).toBe(1)
      // B gains 2: 5 + 2 = 7
      expect(controller.getTroopCount('B')).toBe(7)
    })

    it('advances turn to the next player after fortifying', () => {
      controller.fortify(1, 'A', 'B')
      // After fortify, startNextPlayerTurn is called -> currentPlayer becomes player2
      expect(controller.gameState.currentPlayer).toBe('blue')
    })

    it('resets troopsToDeploy to 3 for the next player', () => {
      controller.fortify(1, 'A', 'B')
      expect(controller.gameState.troopsToDeploy).toBe(3)
    })

    it('transitions back to deploy phase for the next player', () => {
      controller.fortify(1, 'A', 'B')
      expect(controller.gameState.currentPhase).toBe('deploy')
    })
  })

  // --------------------------------------------------------
  describe('hasPlayerLost()', () => {
    it('returns false when the player owns territories (current stub behavior)', () => {
      // hasPlayerLost is currently a stub that always returns false
      expect(controller.hasPlayerLost('red')).toBe(false)
      expect(controller.hasPlayerLost('blue')).toBe(false)
    })
  })

  // --------------------------------------------------------
  describe('getPlayerTerritoryTotal()', () => {
    it('returns the correct territory count for each player', () => {
      expect(controller.getPlayerTerritoryTotal('red')).toBe(2)
      expect(controller.getPlayerTerritoryTotal('blue')).toBe(2)
    })
  })

  // --------------------------------------------------------
  describe('getPlayerTroopTotal()', () => {
    it('returns the sum of troops across all territories', () => {
      expect(controller.getPlayerTroopTotal('red')).toBe(8) // A:3 + B:5
      expect(controller.getPlayerTroopTotal('blue')).toBe(6) // C:4 + D:2
    })
  })

  // --------------------------------------------------------
  describe('getNextPlayer()', () => {
    it('returns player2 when player1 is current', () => {
      expect(controller.getNextPlayer()).toBe('blue')
    })

    it('wraps around and returns player1 when player2 is current', () => {
      controller.gameState.currentPlayer = 'blue'
      expect(controller.getNextPlayer()).toBe('red')
    })
  })

  // --------------------------------------------------------
  describe('isFortifyAllowed()', () => {
    it('returns true for two same-owner territories connected by a path of same-owner territories', () => {
      // A and B are both owned by player1 and directly adjacent
      expect(controller.isFortifyAllowed('A', 'B')).toBe(true)
    })

    it('returns false when territories are not connected via same-owner chain', () => {
      // A (player1) to C (player2): path goes through enemy territory
      expect(controller.isFortifyAllowed('A', 'C')).toBe(false)
    })
  })

  // --------------------------------------------------------
  describe('isAttackAllowed()', () => {
    it('returns true when attacking an adjacent enemy territory', () => {
      // B (player1) attacks C (player2) — adjacent with different owner
      expect(controller.isAttackAllowed('B', 'C')).toBe(true)
    })

    it('returns false when attacking a friendly territory', () => {
      // A and B are both player1's
      expect(controller.isAttackAllowed('A', 'B')).toBe(false)
    })

    it('returns false when attacking a non-adjacent territory', () => {
      // A (player1) vs D (player2): not adjacent — A-B-C-D path is too long
      expect(controller.isAttackAllowed('A', 'D')).toBe(false)
    })
  })

  // --------------------------------------------------------
  describe('attackRng()', () => {
    it('returns losses that do not exceed the troops sent', () => {
      const [attackerLoss, defenderLoss] = controller.attackRng(3, 4)
      // One side must be fully eliminated
      expect(attackerLoss === 3 || defenderLoss === 4).toBe(true)
      expect(attackerLoss).toBeGreaterThanOrEqual(0)
      expect(defenderLoss).toBeGreaterThanOrEqual(0)
    })

    it('stops when one side is wiped out', () => {
      const [attackerLoss, defenderLoss] = controller.attackRng(2, 2)
      expect(attackerLoss === 2 || defenderLoss === 2).toBe(true)
    })
  })
})
