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

// Map for calculateReinforcement() tests: two continents, deliberately shaped
// so each rule can be exercised in isolation.
//   - Alpha has a 0 bonus and 12 territories -> isolates the territory rule
//     (owning all of Alpha never contributes a continent bonus).
//   - Beta has a 7 bonus and 2 territories -> isolates the continent rule
//     (owning both/none of Beta never crosses a territory-rule threshold on
//     its own within these tests).
function buildReinforcementMapConfig(): MapConfig {
  const config = new MapConfig()
  config.name = 'ReinforcementTestMap'
  config.width = 100
  config.height = 100
  config.troopSize = 20
  config.continents = {
    Alpha: { bonusTroops: 0, path: '' },
    Beta: { bonusTroops: 7, path: '' },
  }
  config.territories = {}
  for (let i = 1; i <= 12; i++) {
    config.territories[`A${i}`] = { coords: { x: i, y: 0 }, continent: 'Alpha', path: '', adjacency: [] }
  }
  config.territories.B1 = { coords: { x: 0, y: 1 }, continent: 'Beta', path: '', adjacency: [] }
  config.territories.B2 = { coords: { x: 1, y: 1 }, continent: 'Beta', path: '', adjacency: [] }
  config.cards = { wildcards: 2, territories: {} }
  config.blizzards = 0
  return config
}

function buildReinforcementGameState(): GameState {
  const gs = new GameState()
  gs.gameOver = false
  gs.mapConfig = buildReinforcementMapConfig()
  gs.playerConfigs = [player1, player2]
  gs.blizzards = []
  gs.currentPlayer = 'red'
  gs.currentPhase = 'deploy'
  gs.troopsToDeploy = 0
  gs.troops = []
  gs.deck = []
  gs.playerCards = { red: [], blue: [] }
  gs.conqueredTerritoryThisTurn = false
  gs.tradeCount = 0
  gs.cardBonusMode = 'fixed'
  return gs
}

// Assigns the given territories to the given player in gameState.troops
// (1 troop each; troop count is irrelevant to reinforcement calculation).
function ownTerritories(gs: GameState, player: PlayerConfig, territories: string[]) {
  for (const territory of territories) {
    gs.troops.push({ territory, count: 1, player })
  }
}

function buildGameState(): GameState {
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
      // attackRng returns { attackerLosses, defenderLosses, attackerDice, defenderDice }.
      // When attackerLosses < attackingTroops, the attacker wins.
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [], defenderDice: [] })

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
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 3, defenderLosses: 0, attackerDice: [], defenderDice: [] })

      controller.attack(3, 'B', 'C') // attack with 3 troops against C (4 defenders)

      // C should still be owned by player2 ("blue")
      expect(controller.mapController.getTerritoryOwner('C')).toBe('blue')
      // Attacker (B) loses 3: 5 - 3 = 2
      expect(controller.getTroopCount('B')).toBe(2)
      // Defender (C) loses 0: stays at 4
      expect(controller.getTroopCount('C')).toBe(4)
    })

    it('partial defender loss: defender loses some troops but territory stays', () => {
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 3, defenderLosses: 2, attackerDice: [], defenderDice: [] })

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

    it('recalculates troopsToDeploy for the next player via calculateReinforcement', () => {
      // Next player is blue, who fully controls the South continent (bonus 2)
      // in this fixture, on top of the territory-rule minimum of 3.
      controller.fortify(1, 'A', 'B')
      expect(controller.gameState.troopsToDeploy).toBe(controller.calculateReinforcement('blue'))
      expect(controller.gameState.troopsToDeploy).toBe(5)
    })

    it('transitions back to deploy phase for the next player', () => {
      controller.fortify(1, 'A', 'B')
      expect(controller.gameState.currentPhase).toBe('deploy')
    })
  })

  // --------------------------------------------------------
  describe('hasPlayerLost()', () => {
    it('returns false when the player owns at least one territory', () => {
      expect(controller.hasPlayerLost('red')).toBe(false)
      expect(controller.hasPlayerLost('blue')).toBe(false)
    })

    it('returns true when the player owns zero territories', () => {
      // Attacker (red) wipes out defender (blue) entirely by capturing all of blue's territories.
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [], defenderDice: [] })
      controller.attack(3, 'B', 'C')
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 2, attackerDice: [], defenderDice: [] })
      controller.attack(2, 'C', 'D')

      expect(controller.getPlayerTerritoryTotal('blue')).toBe(0)
      expect(controller.hasPlayerLost('blue')).toBe(true)
      expect(controller.hasPlayerLost('red')).toBe(false)
    })

    it('returns false for a player who still owns exactly one territory', () => {
      // player2 loses C but keeps D
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [], defenderDice: [] })
      controller.attack(3, 'B', 'C')

      expect(controller.getPlayerTerritoryTotal('blue')).toBe(1)
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
      const { attackerLosses, defenderLosses } = controller.attackRng(3, 4)
      // One side must be fully eliminated
      expect(attackerLosses === 3 || defenderLosses === 4).toBe(true)
      expect(attackerLosses).toBeGreaterThanOrEqual(0)
      expect(defenderLosses).toBeGreaterThanOrEqual(0)
    })

    it('stops when one side is wiped out', () => {
      const { attackerLosses, defenderLosses } = controller.attackRng(2, 2)
      expect(attackerLosses === 2 || defenderLosses === 2).toBe(true)
    })
  })

  // --------------------------------------------------------
  describe('card award on conquest', () => {
    it('marks conqueredTerritoryThisTurn when an attack captures a territory', () => {
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [], defenderDice: [] })
      expect(controller.gameState.conqueredTerritoryThisTurn).toBe(false)

      controller.attack(3, 'B', 'C')

      expect(controller.gameState.conqueredTerritoryThisTurn).toBe(true)
    })

    it('does not mark conqueredTerritoryThisTurn when the attack fails', () => {
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 3, defenderLosses: 0, attackerDice: [], defenderDice: [] })

      controller.attack(3, 'B', 'C')

      expect(controller.gameState.conqueredTerritoryThisTurn).toBe(false)
    })

    it('awards exactly one card at end of turn when the player conquered a territory', () => {
      controller.gameState.deck = ['infantry', 'cavalry', 'artillery']
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [], defenderDice: [] })
      controller.attack(3, 'B', 'C')

      controller.fortify(1, 'A', 'B') // ends red's turn -> awards card, advances to blue

      expect(controller.gameState.playerCards.red).toHaveLength(1)
      expect(controller.gameState.deck).toHaveLength(2)
    })

    it('does not award a card at end of turn when no territory was conquered', () => {
      controller.gameState.deck = ['infantry', 'cavalry', 'artillery']

      controller.fortify(1, 'A', 'B') // ends red's turn without any attack

      expect(controller.gameState.playerCards.red).toHaveLength(0)
      expect(controller.gameState.deck).toHaveLength(3)
    })

    it('resets conqueredTerritoryThisTurn for the next player', () => {
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [], defenderDice: [] })
      controller.attack(3, 'B', 'C')
      controller.fortify(1, 'A', 'B')

      expect(controller.gameState.conqueredTerritoryThisTurn).toBe(false)
    })

    it('does not draw a card (and does not throw) when the deck is empty', () => {
      controller.gameState.deck = []
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [], defenderDice: [] })
      controller.attack(3, 'B', 'C')

      controller.fortify(1, 'A', 'B')

      expect(controller.gameState.playerCards.red).toHaveLength(0)
    })
  })

  // --------------------------------------------------------
  describe('isValidCardSet()', () => {
    it('accepts three of the same type', () => {
      expect(controller.isValidCardSet(['infantry', 'infantry', 'infantry'])).toBe(true)
    })

    it('accepts one of each non-wildcard type', () => {
      expect(controller.isValidCardSet(['infantry', 'cavalry', 'artillery'])).toBe(true)
    })

    it('accepts two of one type plus a wildcard', () => {
      expect(controller.isValidCardSet(['infantry', 'infantry', 'wildcard'])).toBe(true)
    })

    it('accepts three wildcards', () => {
      expect(controller.isValidCardSet(['wildcard', 'wildcard', 'wildcard'])).toBe(true)
    })

    it('rejects two of one type plus one of a different type (no wildcard)', () => {
      expect(controller.isValidCardSet(['infantry', 'infantry', 'cavalry'])).toBe(false)
    })

    it('rejects sets that are not exactly 3 cards', () => {
      expect(controller.isValidCardSet(['infantry', 'infantry'])).toBe(false)
      expect(controller.isValidCardSet(['infantry', 'infantry', 'infantry', 'cavalry'])).toBe(false)
    })
  })

  // --------------------------------------------------------
  describe('getCardTradeBonus()', () => {
    it('returns a flat bonus in fixed mode regardless of trade number', () => {
      controller.gameState.cardBonusMode = 'fixed'
      expect(controller.getCardTradeBonus(1)).toBe(4)
      expect(controller.getCardTradeBonus(1)).toBe(controller.getCardTradeBonus(10))
    })

    it('follows the progressive sequence: 4, 6, 8, 10, 12, 15', () => {
      controller.gameState.cardBonusMode = 'progressive'
      expect(controller.getCardTradeBonus(1)).toBe(4)
      expect(controller.getCardTradeBonus(2)).toBe(6)
      expect(controller.getCardTradeBonus(3)).toBe(8)
      expect(controller.getCardTradeBonus(4)).toBe(10)
      expect(controller.getCardTradeBonus(5)).toBe(12)
      expect(controller.getCardTradeBonus(6)).toBe(15)
    })

    it('adds 5 per trade after the 6th in progressive mode', () => {
      controller.gameState.cardBonusMode = 'progressive'
      expect(controller.getCardTradeBonus(7)).toBe(20)
      expect(controller.getCardTradeBonus(8)).toBe(25)
      expect(controller.getCardTradeBonus(9)).toBe(30)
    })
  })

  // --------------------------------------------------------
  describe('tradeCards()', () => {
    beforeEach(() => {
      controller.gameState.cardBonusMode = 'progressive'
      controller.gameState.playerCards.red = ['infantry', 'cavalry', 'artillery', 'infantry']
    })

    it('removes the traded cards from the hand', () => {
      controller.tradeCards([0, 1, 2])
      expect(controller.gameState.playerCards.red).toEqual(['infantry'])
    })

    it('adds the trade bonus to troopsToDeploy', () => {
      const before = controller.gameState.troopsToDeploy
      controller.tradeCards([0, 1, 2])
      expect(controller.gameState.troopsToDeploy).toBe(before + 4)
    })

    it('increments the global trade count', () => {
      controller.tradeCards([0, 1, 2])
      expect(controller.gameState.tradeCount).toBe(1)
    })

    it('increments the global trade count across different players', () => {
      controller.gameState.playerCards.blue = ['cavalry', 'cavalry', 'cavalry']

      controller.tradeCards([0, 1, 2]) // red trades -> trade #1

      controller.gameState.currentPlayer = 'blue'
      controller.tradeCards([0, 1, 2]) // blue trades -> trade #2

      expect(controller.gameState.tradeCount).toBe(2)
      // Second trade (progressive) should award 6, not 4
      expect(controller.gameState.troopsToDeploy).toBe(3 + 4 + 6)
    })

    it('rejects an invalid set and leaves state unchanged', () => {
      controller.gameState.playerCards.red = ['infantry', 'infantry', 'cavalry']
      const before = [...controller.gameState.playerCards.red]
      const troopsBefore = controller.gameState.troopsToDeploy

      controller.tradeCards([0, 1, 2])

      expect(controller.gameState.playerCards.red).toEqual(before)
      expect(controller.gameState.troopsToDeploy).toBe(troopsBefore)
      expect(controller.gameState.tradeCount).toBe(0)
    })

    it('rejects a selection that is not exactly 3 distinct indices', () => {
      const troopsBefore = controller.gameState.troopsToDeploy
      controller.tradeCards([0, 1])
      expect(controller.gameState.troopsToDeploy).toBe(troopsBefore)
      expect(controller.gameState.tradeCount).toBe(0)
    })
  })

  // --------------------------------------------------------
  describe('getPlayerCardTotal()', () => {
    it('returns the number of cards a player holds', () => {
      controller.gameState.playerCards.red = ['infantry', 'wildcard']
      expect(controller.getPlayerCardTotal('red')).toBe(2)
    })

    it('returns 0 for a player with no cards', () => {
      expect(controller.getPlayerCardTotal('blue')).toBe(0)
    })
  })

  // --------------------------------------------------------
  describe('calculateReinforcement()', () => {
    let reinforcementController: GameController
    let gs: GameState

    beforeEach(() => {
      gs = buildReinforcementGameState()
      reinforcementController = new GameController(gs)
    })

    describe('territory rule', () => {
      it('awards the minimum of 3 when owning fewer than 9 territories', () => {
        ownTerritories(gs, player1, ['A1', 'A2'])
        expect(reinforcementController.calculateReinforcement('red')).toBe(3)
      })

      it('awards the minimum of 3 at exactly 8 territories (just below the next threshold)', () => {
        ownTerritories(gs, player1, ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8'])
        expect(reinforcementController.calculateReinforcement('red')).toBe(3)
      })

      it('increases by 1 for every additional group of 3 territories above the minimum', () => {
        ownTerritories(gs, player1, ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9'])
        // 9 territories -> floor(9/3) = 3, still the minimum
        expect(reinforcementController.calculateReinforcement('red')).toBe(3)

        ownTerritories(gs, player1, ['A10', 'A11', 'A12'])
        // 12 territories -> floor(12/3) = 4
        expect(reinforcementController.calculateReinforcement('red')).toBe(4)
      })

      it('never produces a negative or undefined result when the player owns zero territories', () => {
        expect(reinforcementController.calculateReinforcement('red')).toBe(3)
      })
    })

    describe('continent rule', () => {
      it('awards the continent bonus when the player owns every territory in it', () => {
        ownTerritories(gs, player1, ['B1', 'B2'])
        // territory rule: max(3, floor(2/3)) = 3; continent rule: Beta bonus 7
        expect(reinforcementController.calculateReinforcement('red')).toBe(3 + 7)
      })

      it('awards no continent bonus when missing one non-frozen territory', () => {
        ownTerritories(gs, player1, ['B1'])
        ownTerritories(gs, player2, ['B2'])
        expect(reinforcementController.calculateReinforcement('red')).toBe(3)
      })

      it('still awards the continent bonus when the missing territory is blizzard-frozen', () => {
        // Mutate in place: GameController's constructor shallow-copies gameState,
        // so reassigning gs.blizzards after construction would not be visible
        // to the controller -- only in-place mutation of the shared array is.
        gs.blizzards.push('B2')
        ownTerritories(gs, player1, ['B1'])
        // B2 is frozen, so Beta's full-control check ignores it entirely.
        expect(reinforcementController.calculateReinforcement('red')).toBe(3 + 7)
      })

      it('sums bonuses across every continent the player fully controls', () => {
        ownTerritories(gs, player1, ['B1', 'B2', ...Array.from({ length: 12 }, (_, i) => `A${i + 1}`)])
        // territory rule: floor(14/3) = 4; continent rule: Alpha (0) + Beta (7)
        expect(reinforcementController.calculateReinforcement('red')).toBe(4 + 0 + 7)
      })

      it('treats a resigned player\'s territories as normally owned for another player\'s continent check', () => {
        // No "resigned" concept exists on PlayerConfig/GameState yet, so a
        // resigned player's territories are indistinguishable from a normal
        // owner's here -- they still block the other player's full control.
        ownTerritories(gs, player1, ['B1'])
        ownTerritories(gs, player2, ['B2']) // stands in for a "resigned" player2
        expect(reinforcementController.calculateReinforcement('red')).toBe(3)
      })

      it('awards no bonus to anyone when every territory in a continent is blizzard-frozen', () => {
        gs.blizzards.push('B1', 'B2')
        expect(reinforcementController.calculateReinforcement('red')).toBe(3)
        expect(reinforcementController.calculateReinforcement('blue')).toBe(3)
      })
    })

    describe('capital rule', () => {
      it('adds nothing when capitalsOwned is omitted (capital mode inactive)', () => {
        ownTerritories(gs, player1, ['A1', 'A2'])
        expect(reinforcementController.calculateReinforcement('red')).toBe(3)
      })

      it('adds the per-capital bonus for one capital owned', () => {
        ownTerritories(gs, player1, ['A1', 'A2'])
        expect(reinforcementController.calculateReinforcement('red', 1)).toBe(3 + 2)
      })

      it('multiplies the per-capital bonus by the number of capitals owned', () => {
        ownTerritories(gs, player1, ['A1', 'A2'])
        expect(reinforcementController.calculateReinforcement('red', 3)).toBe(3 + 6)
      })

      it('adds no capital bonus when capitalsOwned is explicitly 0', () => {
        ownTerritories(gs, player1, ['A1', 'A2'])
        expect(reinforcementController.calculateReinforcement('red', 0)).toBe(3)
      })
    })

    describe('combined total', () => {
      it('sums territory, continent, and capital rules together', () => {
        ownTerritories(gs, player1, ['B1', 'B2', ...Array.from({ length: 10 }, (_, i) => `A${i + 1}`)])
        // territory: floor(12/3) = 4; continent: Alpha(0) + Beta(7) = 7; capital: 2 * 2 = 4
        expect(reinforcementController.calculateReinforcement('red', 2)).toBe(4 + 7 + 4)
      })
    })
  })
})
