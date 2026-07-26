import { beforeEach, describe, expect, it, vi } from 'vitest'

import GameController from '@/controllers/GameController'
import GameLogic from '@/controllers/GameLogic'
import { buildGameState, buildMinimalMapConfig, card, ownTerritories, player1, player2, player3, player4 } from '@/controllers/testFixtures'
import GameState from '@/models/GameState'
import MapConfig from '@/models/MapConfig'

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

// Same minimal A/B/C/D map, but with a third player ("green", position 1,
// seated between red and blue) who owns zero territories -- i.e. already
// eliminated -- so getNextPlayer()/startNextPlayerTurn()'s skip-loop has
// someone to skip over mid-cycle. Territory ownership (red: A/B, blue: C/D)
// is unchanged from buildGameState().
function buildThreePlayerGameStateWithEliminatedMiddle(): GameState {
  const gs = buildGameState()
  gs.playerConfigs = [player1, player3, player2]
  gs.capitalMode = true
  return gs
}

// Builds a capitalDeploy-phase GameState from the same minimal A/B/C/D map
// used by buildGameState(), for testing round-1 capital placement in
// isolation from normal deploy-phase state.
function buildCapitalDeployGameState(): GameState {
  const gs = buildGameState()
  gs.capitalMode = true
  gs.capitals = {}
  gs.currentPhase = 'capitalDeploy'
  gs.troopsToDeploy = 0
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

    it('does not auto-advance to attack when all troops are deployed but a trade-in is available', () => {
      controller.gameState.playerCards.red = [card('infantry', 'X'), card('infantry', 'Y'), card('infantry', 'Z')]
      controller.deploy(3, 'A')
      expect(controller.gameState.currentPhase).toBe('deploy')
    })

    it('auto-advances once all troops are deployed and no trade-in is available', () => {
      controller.gameState.playerCards.red = [card('infantry', 'X'), card('cavalry', 'Y')]
      controller.deploy(3, 'A')
      expect(controller.gameState.currentPhase).toBe('attack')
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

    describe('capital extra defending die', () => {
      it('passes maxDefender: 3 when the defending territory has enough troops for the bonus die', () => {
        controller.gameState.capitalMode = true
        controller.gameState.capitals = { C: 'blue' }
        const spy = vi.spyOn(controller, 'attackRng')

        controller.attack(3, 'B', 'C')

        expect(spy).toHaveBeenCalledWith(3, 4, expect.objectContaining({ maxDefender: 3 }))
      })

      it('still caps at 1 rolled die when the capital territory only has 1 troop', () => {
        controller.gameState.capitalMode = true
        controller.gameState.capitals = { C: 'blue' }
        controller.mapController.getTroopState('C')!.count = 1

        controller.attack(1, 'B', 'C')

        // maxDefender passed is 3 (capital bonus), but attackRng's existing
        // Math.min(maxDefender, defendingTroops) caps the actual roll at 1.
        expect(controller.lastAttackResult!.defenderDice.length).toBe(1)
      })

      it('does not grant the extra die to a non-capital territory', () => {
        controller.gameState.capitalMode = true
        controller.gameState.capitals = {} // C is not a capital
        const spy = vi.spyOn(controller, 'attackRng')

        controller.attack(3, 'B', 'C')

        expect(spy).toHaveBeenCalledWith(3, 4, expect.objectContaining({ maxDefender: 2 }))
      })

      it('does not grant the extra die in a non-capital-mode game, where capitals stays empty', () => {
        controller.gameState.capitalMode = false
        controller.gameState.capitals = {}
        const spy = vi.spyOn(controller, 'attackRng')

        controller.attack(3, 'B', 'C')

        expect(spy).toHaveBeenCalledWith(3, 4, expect.objectContaining({ maxDefender: 2 }))
      })
    })

    describe('post-conquest troop movement (024) — pending-state setup', () => {
      it('sets pendingPostConquestMove when survivors exceed the winning roll\'s dice count, and still applies the default (max) transfer', () => {
        // Winning roll used 2 dice, attacker sends 3 troops and loses 0 -- 3
        // survivors move by default, but only 2 dice were decisive, so
        // min (2) < max (3 + 4 - 1 = 6): a real choice exists.
        vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [6, 5], defenderDice: [] })

        controller.attack(3, 'B', 'C')

        expect(controller.gameState.pendingPostConquestMove).toEqual({
          sourceTerritory: 'B',
          conqueredTerritory: 'C',
          minTroopsToMove: 2,
        })
        // Default transfer is unchanged: all 3 attacking troops moved in.
        expect(controller.getTroopCount('B')).toBe(2)
        expect(controller.getTroopCount('C')).toBe(3)
      })

      it('leaves pendingPostConquestMove null when the winning roll\'s dice count equals the maximum (no real choice)', () => {
        // B starts with 5 troops; attacking with all 4 sendable troops (1
        // left behind is irrelevant here -- attackingTroops is a param, not
        // constrained by what's left behind) and 0 attacker losses:
        // post-combat B = 5 - 4 = 1, C = 4 - 0 = 4, so max = 1 + 4 - 1 = 4.
        // A 4-dice winning roll makes min equal that same 4 -- no real choice.
        vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [6, 6, 6, 6], defenderDice: [] })

        controller.attack(4, 'B', 'C')

        expect(controller.getTroopCount('B')).toBe(1)
        expect(controller.getTroopCount('C')).toBe(4)
        expect(controller.gameState.pendingPostConquestMove).toBeNull()
      })

      it('does not set pendingPostConquestMove when the attack fails (no conquest)', () => {
        vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 3, defenderLosses: 0, attackerDice: [1], defenderDice: [] })

        controller.attack(3, 'B', 'C')

        expect(controller.gameState.pendingPostConquestMove).toBeNull()
      })

      it('records the correct minTroopsToMove for a range of different winning-roll dice counts (1, 2, 3)', () => {
        for (const diceCount of [1, 2, 3]) {
          const gs = buildGameState()
          const localController = new GameController(gs)
          vi.spyOn(localController, 'attackRng').mockReturnValue({
            attackerLosses: 0,
            defenderLosses: 4,
            attackerDice: Array.from({ length: diceCount }, () => 6),
            defenderDice: [],
          })

          localController.attack(5, 'B', 'C')

          expect(localController.gameState.pendingPostConquestMove?.minTroopsToMove).toBe(diceCount)
        }
      })

      it('records the correct maximum (leaving 1 behind in the source) for a range of different survivor counts', () => {
        // Sending every troop in B (attackingTroops === B's full count) with
        // 0 attacker losses leaves B at 0 and moves the entire pool into C --
        // so B's starting size directly controls the post-combat survivor
        // count: max = sourceCount - 1 in each case.
        for (const sourceCount of [3, 6, 10]) {
          const gs = buildGameState()
          gs.troops.find(t => t.territory === 'B')!.count = sourceCount
          const localController = new GameController(gs)
          vi.spyOn(localController, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [6], defenderDice: [] })

          localController.attack(sourceCount, 'B', 'C')

          const max = localController.getTroopCount('B') + localController.getTroopCount('C') - 1
          expect(max).toBe(sourceCount - 1)
          expect(localController.gameState.pendingPostConquestMove?.minTroopsToMove).toBe(1)
        }
      })
    })
  })

  // --------------------------------------------------------
  describe('post-conquest troop movement (024) — bounds correctness (US2)', () => {
    it('the offered minimum always exactly equals the winning roll\'s dice count, for 1, 2, and 3 dice', () => {
      for (const diceCount of [1, 2, 3]) {
        const gs = buildGameState()
        const localController = new GameController(gs)
        vi.spyOn(localController, 'attackRng').mockReturnValue({
          attackerLosses: 0,
          defenderLosses: 4,
          attackerDice: Array.from({ length: diceCount }, () => 6),
          defenderDice: [],
        })

        localController.attack(5, 'B', 'C')

        expect(localController.gameState.pendingPostConquestMove?.minTroopsToMove).toBe(diceCount)
      }
    })

    it('the offered maximum always exactly equals troops remaining in the source immediately after combat, minus 1', () => {
      // Sending every troop in B leaves B at 0 and puts the whole pool in C,
      // so B's starting size directly controls the survivor count.
      for (const sourceCount of [3, 6, 10]) {
        const gs = buildGameState()
        gs.troops.find(t => t.territory === 'B')!.count = sourceCount
        const localController = new GameController(gs)
        vi.spyOn(localController, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [6], defenderDice: [] })

        localController.attack(sourceCount, 'B', 'C')

        const max = localController.getTroopCount('B') + localController.getTroopCount('C') - 1
        expect(max).toBe(sourceCount - 1)
      }
    })

    it('confirmPostConquestMove() rejects a value one below the minimum, leaving troop counts unchanged', () => {
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [6, 5], defenderDice: [] })
      controller.attack(3, 'B', 'C') // min = 2, max = 2 + 3 - 1 = 4
      const bBefore = controller.getTroopCount('B')
      const cBefore = controller.getTroopCount('C')

      controller.confirmPostConquestMove(1) // one below min (2)

      expect(controller.getTroopCount('B')).toBe(bBefore)
      expect(controller.getTroopCount('C')).toBe(cBefore)
      expect(controller.gameState.pendingPostConquestMove).not.toBeNull()
    })

    it('confirmPostConquestMove() rejects a value one above the maximum, leaving troop counts unchanged', () => {
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [6, 5], defenderDice: [] })
      controller.attack(3, 'B', 'C') // min = 2, max = 2 + 3 - 1 = 4
      const bBefore = controller.getTroopCount('B')
      const cBefore = controller.getTroopCount('C')

      controller.confirmPostConquestMove(5) // one above max (4)

      expect(controller.getTroopCount('B')).toBe(bBefore)
      expect(controller.getTroopCount('C')).toBe(cBefore)
      expect(controller.gameState.pendingPostConquestMove).not.toBeNull()
    })
  })

  // --------------------------------------------------------
  describe('confirmPostConquestMove()', () => {
    beforeEach(() => {
      // Set up a qualifying conquest: B (5 troops) attacks C (4 troops) with
      // a 1-dice winning roll and 0 attacker losses -- 5 survivors available
      // to move, min = 1, max = 0 + 5 - 1 = 4, a real choice exists.
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [6], defenderDice: [] })
      controller.attack(5, 'B', 'C')
    })

    it('has a pending choice with the expected bounds before confirming', () => {
      expect(controller.gameState.pendingPostConquestMove).toEqual({
        sourceTerritory: 'B',
        conqueredTerritory: 'C',
        minTroopsToMove: 1,
      })
      expect(controller.getTroopCount('B')).toBe(0)
      expect(controller.getTroopCount('C')).toBe(5)
    })

    it('moves exactly the chosen amount in and leaves the correct remainder in the source', () => {
      controller.confirmPostConquestMove(3)

      expect(controller.getTroopCount('C')).toBe(3)
      expect(controller.getTroopCount('B')).toBe(2)
      expect(controller.gameState.pendingPostConquestMove).toBeNull()
    })

    it('accepts the minimum bound', () => {
      controller.confirmPostConquestMove(1)

      expect(controller.getTroopCount('C')).toBe(1)
      expect(controller.getTroopCount('B')).toBe(4)
    })

    it('accepts the maximum bound', () => {
      controller.confirmPostConquestMove(4)

      expect(controller.getTroopCount('C')).toBe(4)
      expect(controller.getTroopCount('B')).toBe(1)
    })

    it('rejects a value one below the minimum, leaving troop counts and pending state unchanged', () => {
      controller.confirmPostConquestMove(0)

      expect(controller.getTroopCount('C')).toBe(5)
      expect(controller.getTroopCount('B')).toBe(0)
      expect(controller.gameState.pendingPostConquestMove).not.toBeNull()
    })

    it('rejects a value one above the maximum, leaving troop counts and pending state unchanged', () => {
      controller.confirmPostConquestMove(5)

      expect(controller.getTroopCount('C')).toBe(5)
      expect(controller.getTroopCount('B')).toBe(0)
      expect(controller.gameState.pendingPostConquestMove).not.toBeNull()
    })

    it('is a no-op when called with no pending state', () => {
      controller.confirmPostConquestMove(3) // resolves the pending choice
      const cBefore = controller.getTroopCount('C')
      const bBefore = controller.getTroopCount('B')

      controller.confirmPostConquestMove(2) // no pending state left -- no-op

      expect(controller.getTroopCount('C')).toBe(cBefore)
      expect(controller.getTroopCount('B')).toBe(bBefore)
    })
  })

  // --------------------------------------------------------
  describe('isSelectable() post-conquest pending-move gate (024)', () => {
    it('returns false for every territory while a post-conquest move is pending, regardless of phase or ownership', () => {
      controller.gameState.pendingPostConquestMove = { sourceTerritory: 'B', conqueredTerritory: 'C', minTroopsToMove: 1 }

      controller.gameState.currentPhase = 'attack'
      expect(controller.isSelectable('A', null, 'red')).toBe(false) // own territory
      expect(controller.isSelectable('C', null, 'red')).toBe(false) // enemy territory
      expect(controller.isSelectable('B', 'B', 'red')).toBe(false) // already-selected territory

      controller.gameState.currentPhase = 'fortify'
      expect(controller.isSelectable('A', null, 'red')).toBe(false)

      controller.gameState.currentPhase = 'deploy'
      expect(controller.isSelectable('A', null, 'red')).toBe(false)
    })

    it('takes priority over the capitalDeploy branch too', () => {
      controller.gameState.capitalMode = true
      controller.gameState.currentPhase = 'capitalDeploy'
      controller.gameState.pendingPostConquestMove = { sourceTerritory: 'B', conqueredTerritory: 'C', minTroopsToMove: 1 }

      expect(controller.isSelectable('A', null, 'red')).toBe(false)
    })

    it('returns to normal behavior once pendingPostConquestMove is cleared', () => {
      controller.gameState.pendingPostConquestMove = { sourceTerritory: 'B', conqueredTerritory: 'C', minTroopsToMove: 1 }
      expect(controller.isSelectable('A', null, 'red')).toBe(false)

      controller.gameState.pendingPostConquestMove = null
      expect(controller.isSelectable('A', null, 'red')).toBe(true)
    })
  })

  // --------------------------------------------------------
  describe('post-conquest troop movement (024) — fortify independence (FR-008)', () => {
    it('fortify() behaves identically regardless of any earlier post-conquest choice made this turn', () => {
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [6], defenderDice: [] })
      controller.attack(5, 'B', 'C')
      controller.confirmPostConquestMove(3) // B: 2, C: 3

      controller.fortify(1, 'A', 'B')

      // Fortify's own mechanics (transfer + turn advance) are unaffected.
      expect(controller.getTroopCount('A')).toBe(2)
      expect(controller.getTroopCount('B')).toBe(3)
      expect(controller.gameState.currentPlayer).toBe('blue')
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
  describe('roundsSincePlacement', () => {
    it('does not increment when advancing to the next player mid-cycle (capital mode on)', () => {
      controller.gameState.capitalMode = true
      controller.startNextPlayerTurn() // red -> blue: not a wrap
      expect(controller.gameState.roundsSincePlacement).toBe(0)
    })

    it('increments exactly once per full cycle through playerConfigs when capital mode is on', () => {
      controller.gameState.capitalMode = true
      controller.startNextPlayerTurn() // red -> blue
      controller.startNextPlayerTurn() // blue -> red: wraps, completes one full cycle
      expect(controller.gameState.roundsSincePlacement).toBe(1)

      controller.startNextPlayerTurn() // red -> blue
      controller.startNextPlayerTurn() // blue -> red: wraps again
      expect(controller.gameState.roundsSincePlacement).toBe(2)
    })

    it('never increments when capital mode is off, regardless of how many full cycles complete', () => {
      controller.gameState.capitalMode = false
      controller.startNextPlayerTurn() // red -> blue
      controller.startNextPlayerTurn() // blue -> red: would wrap if capital mode were on
      controller.startNextPlayerTurn() // red -> blue
      controller.startNextPlayerTurn() // blue -> red

      expect(controller.gameState.roundsSincePlacement).toBe(0)
    })

    it('advances correctly around an eliminated player seated mid-cycle', () => {
      // Seating order is red, green (eliminated), blue. green owns zero
      // territories, so the skip-loop in startNextPlayerTurn() must pass over
      // them without counting a spurious wrap.
      const threePlayerController = new GameController(buildThreePlayerGameStateWithEliminatedMiddle())

      threePlayerController.startNextPlayerTurn() // red -> (skip green) -> blue: not a wrap
      expect(threePlayerController.gameState.currentPlayer).toBe('blue')
      expect(threePlayerController.gameState.roundsSincePlacement).toBe(0)

      threePlayerController.startNextPlayerTurn() // blue -> (skip green) -> red: wraps, one full cycle
      expect(threePlayerController.gameState.currentPlayer).toBe('red')
      expect(threePlayerController.gameState.roundsSincePlacement).toBe(1)
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
      controller.gameState.deck = [card('infantry', 'X'), card('cavalry', 'Y'), card('artillery', 'Z')]
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [], defenderDice: [] })
      controller.attack(3, 'B', 'C')

      controller.fortify(1, 'A', 'B') // ends red's turn -> awards card, advances to blue

      expect(controller.gameState.playerCards.red).toHaveLength(1)
      expect(controller.gameState.deck).toHaveLength(2)
    })

    it('does not award a card at end of turn when no territory was conquered', () => {
      controller.gameState.deck = [card('infantry', 'X'), card('cavalry', 'Y'), card('artillery', 'Z')]

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
  describe('card transfer on elimination', () => {
    beforeEach(() => {
      // A 3rd player (green, holding a territory the wipeout below never
      // touches) so that fully eliminating blue does NOT also end the game --
      // keeping these as genuine "non-winning defeat" cases now that a
      // winning-move elimination skips the transfer entirely (013, FR-006).
      const gs = buildGameState()
      gs.mapConfig.territories.E = { coords: { x: 3, y: 0 }, continent: 'South', path: '', adjacency: [] }
      gs.playerConfigs = [player1, player2, player3]
      gs.troops.push({ territory: 'E', count: 1, player: player3 })
      gs.playerCards.green = []
      controller = new GameController(gs)
    })

    const wipeOutBlue = () => {
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [], defenderDice: [] })
      controller.attack(3, 'B', 'C')
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 2, attackerDice: [], defenderDice: [] })
      controller.attack(2, 'C', 'D')
    }

    it('transfers the defeated player\'s entire hand to the eliminator', () => {
      controller.gameState.playerCards.blue = [card('infantry', 'X'), card('cavalry', 'Y')]

      wipeOutBlue()

      expect(controller.hasPlayerLost('blue')).toBe(true)
      expect(controller.gameState.playerCards.red).toHaveLength(2)
      expect(controller.gameState.playerCards.blue).toHaveLength(0)
    })

    it('does nothing when the defeated player holds no cards', () => {
      controller.gameState.currentPhase = 'attack'

      wipeOutBlue()

      expect(controller.gameState.playerCards.red).toHaveLength(0)
      expect(controller.gameState.currentPhase).toBe('attack')
    })

    it('does not force a phase change when the transfer stays under the forced threshold', () => {
      controller.gameState.playerCards.red = [card('infantry', 'X')]
      controller.gameState.playerCards.blue = [card('cavalry', 'Y')]
      controller.gameState.currentPhase = 'attack'

      wipeOutBlue()

      expect(controller.gameState.playerCards.red).toHaveLength(2)
      expect(controller.gameState.currentPhase).toBe('attack')
    })

    it('forces the phase back to deploy when the transfer pushes the eliminator to the forced threshold', () => {
      controller.gameState.playerCards.red = [card('infantry', 'A1'), card('infantry', 'A2'), card('infantry', 'A3')]
      controller.gameState.playerCards.blue = [card('cavalry', 'B1'), card('cavalry', 'B2')]
      controller.gameState.currentPhase = 'attack'

      wipeOutBlue()

      expect(controller.getPlayerCardTotal('red')).toBe(5)
      expect(controller.gameState.currentPhase).toBe('deploy')
    })
  })

  // --------------------------------------------------------
  describe('resolveCardSetKind() / isValidCardSet()', () => {
    it('resolves three of the same type', () => {
      expect(controller.resolveCardSetKind([card('infantry'), card('infantry'), card('infantry')])).toBe('infantry')
      expect(controller.isValidCardSet([card('infantry'), card('infantry'), card('infantry')])).toBe(true)
    })

    it('resolves one of each non-wildcard type as mixed', () => {
      expect(controller.resolveCardSetKind([card('infantry'), card('cavalry'), card('artillery')])).toBe('mixed')
    })

    it('prefers mixed over three-of-a-kind when a wildcard makes both readings possible', () => {
      // One real infantry + 2 wildcards could become "infantry x3" or "mixed" — mixed wins (worth more).
      expect(controller.resolveCardSetKind([card('infantry'), card('wildcard'), card('wildcard')])).toBe('mixed')
      expect(controller.resolveCardSetKind([card('wildcard'), card('wildcard'), card('wildcard')])).toBe('mixed')
    })

    it('resolves two of one type plus a wildcard as that type (mixed is not achievable)', () => {
      expect(controller.resolveCardSetKind([card('infantry'), card('infantry'), card('wildcard')])).toBe('infantry')
    })

    it('resolves a real card of each type plus a wildcard as mixed', () => {
      expect(controller.resolveCardSetKind([card('infantry'), card('cavalry'), card('wildcard')])).toBe('mixed')
    })

    it('rejects two of one type plus one of a different type (no wildcard)', () => {
      expect(controller.resolveCardSetKind([card('infantry'), card('infantry'), card('cavalry')])).toBeNull()
      expect(controller.isValidCardSet([card('infantry'), card('infantry'), card('cavalry')])).toBe(false)
    })

    it('rejects sets that are not exactly 3 cards', () => {
      expect(controller.isValidCardSet([card('infantry'), card('infantry')])).toBe(false)
      expect(controller.isValidCardSet([card('infantry'), card('infantry'), card('infantry'), card('cavalry')])).toBe(false)
    })
  })

  // --------------------------------------------------------
  describe('getCardTradeBonus()', () => {
    it('awards the classic fixed-mode value per set kind: +4/+6/+8/+10', () => {
      controller.gameState.cardBonusMode = 'fixed'
      expect(controller.getCardTradeBonus(1, 'infantry')).toBe(4)
      expect(controller.getCardTradeBonus(1, 'cavalry')).toBe(6)
      expect(controller.getCardTradeBonus(1, 'artillery')).toBe(8)
      expect(controller.getCardTradeBonus(1, 'mixed')).toBe(10)
    })

    it('ignores trade number in fixed mode', () => {
      controller.gameState.cardBonusMode = 'fixed'
      expect(controller.getCardTradeBonus(1, 'cavalry')).toBe(controller.getCardTradeBonus(10, 'cavalry'))
    })

    it('follows the progressive sequence regardless of set kind: 4, 6, 8, 10, 12, 15', () => {
      controller.gameState.cardBonusMode = 'progressive'
      expect(controller.getCardTradeBonus(1, 'artillery')).toBe(4)
      expect(controller.getCardTradeBonus(2, 'artillery')).toBe(6)
      expect(controller.getCardTradeBonus(3, 'artillery')).toBe(8)
      expect(controller.getCardTradeBonus(4, 'artillery')).toBe(10)
      expect(controller.getCardTradeBonus(5, 'artillery')).toBe(12)
      expect(controller.getCardTradeBonus(6, 'artillery')).toBe(15)
    })

    it('adds 5 per trade after the 6th in progressive mode', () => {
      controller.gameState.cardBonusMode = 'progressive'
      expect(controller.getCardTradeBonus(7, 'mixed')).toBe(20)
      expect(controller.getCardTradeBonus(8, 'mixed')).toBe(25)
      expect(controller.getCardTradeBonus(9, 'mixed')).toBe(30)
    })
  })

  // --------------------------------------------------------
  describe('hasAvailableTradeIn()', () => {
    it('returns false for an empty or small hand with no valid subset', () => {
      controller.gameState.playerCards.red = [card('infantry'), card('cavalry')]
      expect(controller.hasAvailableTradeIn()).toBe(false)
    })

    it('returns true when some 3-card subset of a larger hand is valid', () => {
      controller.gameState.playerCards.red = [card('infantry'), card('cavalry'), card('infantry'), card('infantry')]
      // {infantry, infantry, infantry} (indices 0,2,3) is a valid subset.
      expect(controller.hasAvailableTradeIn()).toBe(true)
    })

    it('returns false when no 3-card subset is valid', () => {
      controller.gameState.playerCards.red = [card('infantry'), card('infantry'), card('cavalry'), card('cavalry')]
      expect(controller.hasAvailableTradeIn()).toBe(false)
    })
  })

  // --------------------------------------------------------
  describe('hasForcedTradeIn()', () => {
    it('returns false below the threshold', () => {
      controller.gameState.playerCards.red = [card('infantry'), card('infantry'), card('infantry'), card('cavalry')]
      expect(controller.hasForcedTradeIn()).toBe(false)
    })

    it('returns true at or above the threshold', () => {
      controller.gameState.playerCards.red = [card('infantry'), card('infantry'), card('infantry'), card('cavalry'), card('cavalry')]
      expect(controller.hasForcedTradeIn()).toBe(true)
    })
  })

  // --------------------------------------------------------
  describe('isSelectable() deploy-phase forced trade-in gate', () => {
    it('allows deploying when no forced trade-in is pending', () => {
      expect(controller.isSelectable('A', null, 'red')).toBe(true)
    })

    it('blocks deploying while a forced trade-in is pending', () => {
      controller.gameState.playerCards.red = [card('infantry'), card('infantry'), card('infantry'), card('cavalry'), card('cavalry')]
      expect(controller.isSelectable('A', null, 'red')).toBe(false)
    })
  })

  // --------------------------------------------------------
  describe('capital mode — foundational', () => {
    it('initState() with capitalModeEnabled: true enters capitalDeploy phase without starting the first player\'s turn', () => {
      const mapConfig = buildMinimalMapConfig()
      const state = GameLogic.initState(mapConfig, [player1, player2], false, false, false, 'fixed', true)

      expect(state.capitalMode).toBe(true)
      expect(state.capitals).toEqual({})
      expect(state.currentPhase).toBe('capitalDeploy')
      expect(state.currentPlayer).toBe(player1.color)
      // startPlayerTurn (which sets troopsToDeploy via calculateReinforcement) has not run yet.
      expect(state.troopsToDeploy).toBe(0)
    })

    it('initState() with capitalModeEnabled: false (default) is unaffected — normal deploy phase begins immediately', () => {
      const mapConfig = buildMinimalMapConfig()
      const state = GameLogic.initState(mapConfig, [player1, player2], false, false, false, 'fixed', false)

      expect(state.capitalMode).toBe(false)
      expect(state.capitals).toEqual({})
      expect(state.currentPhase).toBe('deploy')
      expect(state.troopsToDeploy).toBeGreaterThan(0)
    })

    describe('isSelectable() during capitalDeploy phase', () => {
      let capitalController: GameController

      beforeEach(() => {
        capitalController = new GameController(buildCapitalDeployGameState())
      })

      it('returns true for the current player\'s own territory', () => {
        expect(capitalController.isSelectable('A', null, 'red')).toBe(true)
        expect(capitalController.isSelectable('B', null, 'red')).toBe(true)
      })

      it('returns false for another player\'s territory', () => {
        expect(capitalController.isSelectable('C', null, 'red')).toBe(false)
        expect(capitalController.isSelectable('D', null, 'red')).toBe(false)
      })
    })
  })

  // --------------------------------------------------------
  describe('chooseCapital()', () => {
    let capitalController: GameController

    beforeEach(() => {
      capitalController = new GameController(buildCapitalDeployGameState())
    })

    it('adds 2 troops to the chosen territory immediately', () => {
      const before = capitalController.getTroopCount('A')
      capitalController.chooseCapital('A')
      expect(capitalController.getTroopCount('A')).toBe(before + 2)
    })

    it('records the chosen territory as that player\'s capital', () => {
      capitalController.chooseCapital('A')
      expect(capitalController.gameState.capitals.A).toBe('red')
    })

    it('advances to the next player in playerConfigs order after a non-final choice', () => {
      capitalController.chooseCapital('A')
      expect(capitalController.gameState.currentPlayer).toBe('blue')
      expect(capitalController.gameState.currentPhase).toBe('capitalDeploy')
    })

    it('starts normal play once the last player in playerConfigs order has chosen', () => {
      capitalController.chooseCapital('A') // red -> advances to blue
      capitalController.chooseCapital('C') // blue is last -> starts normal play

      expect(capitalController.gameState.currentPhase).toBe('deploy')
      expect(capitalController.gameState.currentPlayer).toBe(player1.color)
      expect(capitalController.gameState.troopsToDeploy).toBeGreaterThan(0)
    })

    it('leaves both players\' capital designations intact once placement completes', () => {
      capitalController.chooseCapital('A')
      capitalController.chooseCapital('C')

      expect(capitalController.gameState.capitals).toEqual({ A: 'red', C: 'blue' })
    })
  })

  // --------------------------------------------------------
  describe('tradeCards()', () => {
    beforeEach(() => {
      controller.gameState.cardBonusMode = 'progressive'
      controller.gameState.playerCards.red = [card('infantry', 'W'), card('cavalry', 'X'), card('artillery', 'Y'), card('infantry', 'Z')]
    })

    it('removes the traded cards from the hand', () => {
      controller.tradeCards([0, 1, 2])
      expect(controller.gameState.playerCards.red).toEqual([card('infantry', 'Z')])
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
      controller.gameState.playerCards.blue = [card('cavalry', 'P'), card('cavalry', 'Q'), card('cavalry', 'R')]

      controller.tradeCards([0, 1, 2]) // red trades -> trade #1

      controller.gameState.currentPlayer = 'blue'
      controller.tradeCards([0, 1, 2]) // blue trades -> trade #2

      expect(controller.gameState.tradeCount).toBe(2)
      // Second trade (progressive) should award 6, not 4
      expect(controller.gameState.troopsToDeploy).toBe(3 + 4 + 6)
    })

    it('returns the traded cards to the deck instead of discarding them', () => {
      controller.gameState.deck = []
      controller.tradeCards([0, 1, 2])
      expect(controller.gameState.deck).toHaveLength(3)
      expect(controller.gameState.deck).toEqual(
        expect.arrayContaining([card('infantry', 'W'), card('cavalry', 'X'), card('artillery', 'Y')]),
      )
    })

    it('rejects an invalid set and leaves state unchanged', () => {
      controller.gameState.playerCards.red = [card('infantry', 'W'), card('infantry', 'X'), card('cavalry', 'Y')]
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
  describe('tradeCards() occupied-territory bonus (applies in both bonus modes)', () => {
    it('applies +2 to the one occupied territory among the traded cards', () => {
      // Red owns A and B in this fixture; A's card is occupied, X and Y are not real territories.
      controller.gameState.playerCards.red = [card('infantry', 'A'), card('cavalry', 'X'), card('artillery', 'Y')]
      const before = controller.getTroopCount('A')

      controller.tradeCards([0, 1, 2])

      expect(controller.getTroopCount('A')).toBe(before + 2)
    })

    it.each(['fixed', 'progressive'] as const)('applies the bonus in %s mode', (mode) => {
      controller.gameState.cardBonusMode = mode
      controller.gameState.playerCards.red = [card('infantry', 'A'), card('cavalry', 'X'), card('artillery', 'Y')]
      const before = controller.getTroopCount('A')

      controller.tradeCards([0, 1, 2])

      expect(controller.getTroopCount('A')).toBe(before + 2)
    })

    it('applies the bonus to the explicitly chosen territory when more than one qualifies', () => {
      // Red owns both A and B; both are occupied territories among the traded cards.
      controller.gameState.playerCards.red = [card('infantry', 'A'), card('cavalry', 'B'), card('artillery', 'Z')]
      const beforeA = controller.getTroopCount('A')
      const beforeB = controller.getTroopCount('B')

      controller.tradeCards([0, 1, 2], 'B')

      expect(controller.getTroopCount('A')).toBe(beforeA)
      expect(controller.getTroopCount('B')).toBe(beforeB + 2)
    })

    it('falls back to one eligible territory when multiple qualify but none is explicitly chosen', () => {
      controller.gameState.playerCards.red = [card('infantry', 'A'), card('cavalry', 'B'), card('artillery', 'Z')]

      controller.tradeCards([0, 1, 2])

      const totalGained = (controller.getTroopCount('A') - 3) + (controller.getTroopCount('B') - 5)
      expect(totalGained).toBe(2)
    })

    it('applies no bonus when none of the traded territories are occupied', () => {
      controller.gameState.playerCards.red = [card('infantry', 'X'), card('cavalry', 'Y'), card('artillery', 'Z')]
      const beforeA = controller.getTroopCount('A')
      const beforeB = controller.getTroopCount('B')

      controller.tradeCards([0, 1, 2])

      expect(controller.getTroopCount('A')).toBe(beforeA)
      expect(controller.getTroopCount('B')).toBe(beforeB)
    })

    it('is not applied based on a wildcard (which has no territory)', () => {
      controller.gameState.playerCards.red = [card('wildcard'), card('cavalry', 'X'), card('artillery', 'Y')]
      const beforeA = controller.getTroopCount('A')
      const beforeB = controller.getTroopCount('B')

      controller.tradeCards([0, 1, 2])

      expect(controller.getTroopCount('A')).toBe(beforeA)
      expect(controller.getTroopCount('B')).toBe(beforeB)
    })
  })

  // --------------------------------------------------------
  describe('getPlayerCardTotal()', () => {
    it('returns the number of cards a player holds', () => {
      controller.gameState.playerCards.red = [card('infantry'), card('wildcard')]
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

    describe('capitalsOwned wiring via startPlayerTurn()', () => {
      it('passes the player\'s real, current capital count to calculateReinforcement when capital mode is active', () => {
        // GameController's constructor shallow-copies gameState, so these
        // must be set on the controller's own copy (reassigning gs.capitalMode
        // / gs.capitals after construction would not be visible to it).
        reinforcementController.gameState.capitalMode = true
        reinforcementController.gameState.capitals = { A1: 'red', A2: 'red' }
        ownTerritories(gs, player1, ['A1', 'A2'])

        reinforcementController.startPlayerTurn('red')

        // territory: max(3, floor(2/3)) = 3; capital: 2 owned * 2 = 4
        expect(reinforcementController.gameState.troopsToDeploy).toBe(3 + 4)
        expect(reinforcementController.gameState.troopsToDeploy).toBe(reinforcementController.calculateReinforcement('red', 2))
      })

      it('reflects a captured capital immediately -- the new owner gets the bonus, the old owner loses it', () => {
        reinforcementController.gameState.capitalMode = true
        reinforcementController.gameState.capitals = { A1: 'blue' } // originally blue's capital
        ownTerritories(gs, player1, ['A1']) // but red currently occupies it (captured)
        ownTerritories(gs, player2, ['B1'])

        reinforcementController.startPlayerTurn('red')
        expect(reinforcementController.gameState.troopsToDeploy).toBe(reinforcementController.calculateReinforcement('red', 1))

        reinforcementController.startPlayerTurn('blue')
        expect(reinforcementController.gameState.troopsToDeploy).toBe(reinforcementController.calculateReinforcement('blue', 0))
      })

      it('always passes 0 in a non-capital-mode game, even if capitals somehow contains an entry', () => {
        reinforcementController.gameState.capitalMode = false
        reinforcementController.gameState.capitals = { A1: 'red' }
        ownTerritories(gs, player1, ['A1'])

        reinforcementController.startPlayerTurn('red')

        expect(reinforcementController.gameState.troopsToDeploy).toBe(reinforcementController.calculateReinforcement('red'))
        expect(reinforcementController.gameState.troopsToDeploy).toBe(3)
      })
    })
  })

  // --------------------------------------------------------
  describe('ownsAllCapitals()', () => {
    beforeEach(() => {
      controller.gameState.capitalMode = true
      // A is red's capital, C is blue's capital (both starting-owner territories).
      controller.gameState.capitals = { A: 'red', C: 'blue' }
    })

    it('returns false before any capital has changed hands (each player only owns their own)', () => {
      expect(controller.ownsAllCapitals('red')).toBe(false)
      expect(controller.ownsAllCapitals('blue')).toBe(false)
    })

    it('returns true only once a single player owns every capital territory', () => {
      controller.mapController.getTroopState('C')!.player = player1 // red captures blue's capital

      expect(controller.ownsAllCapitals('red')).toBe(true)
      expect(controller.ownsAllCapitals('blue')).toBe(false)
    })

    it('returns false for an "owns all but one" case with more than two capitals', () => {
      controller.gameState.capitals = { A: 'red', C: 'blue', D: 'blue' }
      controller.mapController.getTroopState('C')!.player = player1 // red captures C but not D

      expect(controller.ownsAllCapitals('red')).toBe(false)
    })

    it('returns false when capital mode is inactive, even if capitals is populated', () => {
      controller.gameState.capitalMode = false
      controller.mapController.getTroopState('C')!.player = player1

      expect(controller.ownsAllCapitals('red')).toBe(false)
    })

    it('returns false when capitals is empty', () => {
      controller.gameState.capitals = {}
      expect(controller.ownsAllCapitals('red')).toBe(false)
    })
  })

  // --------------------------------------------------------
  describe('resignation — foundational', () => {
    describe('isResigned()', () => {
      it('reflects resignedPlayers membership', () => {
        expect(controller.isResigned('blue')).toBe(false)
        controller.gameState.resignedPlayers.push('blue')
        expect(controller.isResigned('blue')).toBe(true)
      })
    })

    describe('getNextPlayer() skips resigned players', () => {
      it('skips a resigned player exactly like an eliminated one', () => {
        controller.gameState.resignedPlayers.push('blue')
        // Only 'red' is left eligible (2-player map) -- getNextPlayer() wraps
        // back to the current player rather than ever returning 'blue'.
        expect(controller.getNextPlayer()).toBe('red')
      })

      it('skips both a resigned and an eliminated player seated between the current player and the only eligible one', () => {
        const threePlayerController = new GameController(buildThreePlayerGameStateWithEliminatedMiddle())
        threePlayerController.gameState.resignedPlayers.push('blue')

        // Seating: red (current), green (eliminated), blue (resigned) -- only
        // red remains eligible, so the skip-loop wraps back to red.
        expect(threePlayerController.getNextPlayer()).toBe('red')
      })
    })

    describe('startPlayerTurn() turnCount', () => {
      it('increments turnCount by exactly 1 per call', () => {
        expect(controller.gameState.turnCount).toBe(0)
        controller.startPlayerTurn('blue')
        expect(controller.gameState.turnCount).toBe(1)
        controller.startPlayerTurn('red')
        expect(controller.gameState.turnCount).toBe(2)
      })
    })

    describe('recordKnockoutIfNeeded() (via resign())', () => {
      it('writes a knockoutOrder entry once and never overwrites it on a second call for the same player', () => {
        controller.resign('blue')
        const firstSnapshot = controller.gameState.knockoutOrder.blue
        expect(firstSnapshot).toBeDefined()

        controller.gameState.turnCount += 5 // would change the snapshot if it were re-recorded
        controller.resign('blue') // already resigned -- no-op per resign()'s own guard too

        expect(controller.gameState.knockoutOrder.blue).toEqual(firstSnapshot)
      })
    })
  })

  // --------------------------------------------------------
  describe('checkWinCondition() (via attack()/resign())', () => {
    it('conquest mode: a capture leaving one player owning every non-frozen, non-resigned territory ends the game', () => {
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [], defenderDice: [] })
      controller.attack(3, 'B', 'C')
      expect(controller.gameState.gameOver).toBe(false)

      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 2, attackerDice: [], defenderDice: [] })
      controller.attack(2, 'C', 'D')

      expect(controller.gameState.gameOver).toBe(true)
    })

    it('conquest mode: territory still split among owners does not end the game', () => {
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [], defenderDice: [] })
      controller.attack(3, 'B', 'C')

      expect(controller.gameState.gameOver).toBe(false)
    })

    it('capital mode: capturing every capital ends the game regardless of non-capital territory split', () => {
      controller.gameState.capitalMode = true
      controller.gameState.capitals = { A: 'red', C: 'blue' }

      // Red captures C (blue's capital) but blue keeps D -- non-capital
      // territory stays split, yet the game must still end.
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [], defenderDice: [] })
      controller.attack(3, 'B', 'C')

      expect(controller.gameState.gameOver).toBe(true)
      expect(controller.mapController.getTerritoryOwner('D')).toBe('blue')
    })

    it('is a no-op once gameOver is already true, and the transfer guard skips even a capture that fully defeats a player', () => {
      controller.gameState.gameOver = true
      controller.gameState.playerCards.blue = [card('infantry', 'X')]

      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [], defenderDice: [] })
      controller.attack(3, 'B', 'C')
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 2, attackerDice: [], defenderDice: [] })
      controller.attack(2, 'C', 'D') // fully defeats blue, but the game was already over throughout

      expect(controller.gameState.gameOver).toBe(true)
      expect(controller.hasPlayerLost('blue')).toBe(true)
      // No transfer -- the game was already over, so this can't be "the winning move".
      expect(controller.gameState.playerCards.blue).toHaveLength(1)
    })

    it('resignation alone (no capture) ends the game when it leaves a sole remaining active player', () => {
      // Exactly 2 active players -- the second-to-last one resigning must
      // immediately win the game for the sole remaining player.
      controller.resign('blue')
      expect(controller.gameState.gameOver).toBe(true)
    })
  })

  // --------------------------------------------------------
  describe('getWinner()', () => {
    it('returns undefined (conquest mode) while territory is still split among owners', () => {
      expect(controller.getWinner()).toBeUndefined()
    })

    it('returns the winning player (conquest mode) once they own every eligible territory, independent of gameOver', () => {
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [], defenderDice: [] })
      controller.attack(3, 'B', 'C')
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 2, attackerDice: [], defenderDice: [] })
      controller.attack(2, 'C', 'D')

      expect(controller.getWinner()).toBe('red')

      // Still correctly re-derivable even if something externally reset gameOver.
      controller.gameState.gameOver = false
      expect(controller.getWinner()).toBe('red')
    })

    it('returns undefined (capital mode) when no single player owns every capital', () => {
      controller.gameState.capitalMode = true
      controller.gameState.capitals = { A: 'red', C: 'blue' }

      expect(controller.getWinner()).toBeUndefined()
    })

    it('returns the winning player (capital mode) once they own every capital', () => {
      controller.gameState.capitalMode = true
      controller.gameState.capitals = { A: 'red', C: 'blue' }

      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [], defenderDice: [] })
      controller.attack(3, 'B', 'C')

      expect(controller.getWinner()).toBe('red')
    })

    it('returns the sole remaining active player (capital mode) once the only opponent resigns, even though their capital was never captured', () => {
      // Regression test: resignation does not transfer capital ownership, so
      // the mode-specific capital check alone would never fire here -- the
      // "last active player standing" override is what must resolve this.
      controller.gameState.capitalMode = true
      controller.gameState.capitals = { A: 'red', C: 'blue' }

      controller.resign('blue')

      expect(controller.gameState.gameOver).toBe(true)
      expect(controller.getWinner()).toBe('red')
    })

    it('returns the sole remaining active player (conquest mode) once the only opponent resigns', () => {
      controller.resign('blue')

      expect(controller.getWinner()).toBe('red')
    })
  })

  // --------------------------------------------------------
  describe('card transfer on elimination — win-move guard (013)', () => {
    it('still transfers the full hand when a defeat does not end the game', () => {
      const gs = buildGameState()
      gs.playerConfigs = [player1, player2, player3]
      // Reassign D from blue to green so blue's elimination alone does not
      // leave a sole remaining owner -- the game must continue.
      gs.troops.find(t => t.territory === 'D')!.player = player3
      gs.playerCards = { red: [], blue: [card('infantry', 'X'), card('cavalry', 'Y')], green: [] }
      const threePlayerController = new GameController(gs)

      vi.spyOn(threePlayerController, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [], defenderDice: [] })
      threePlayerController.attack(3, 'B', 'C') // red captures blue's only (last) territory

      expect(threePlayerController.hasPlayerLost('blue')).toBe(true)
      expect(threePlayerController.gameState.gameOver).toBe(false)
      expect(threePlayerController.gameState.playerCards.red).toHaveLength(2)
      expect(threePlayerController.gameState.playerCards.blue).toHaveLength(0)
      expect(threePlayerController.gameState.knockoutOrder.blue).toBeDefined()
    })

    it('transfers no cards when the defeat is simultaneously the game-winning move', () => {
      controller.gameState.playerCards.blue = [card('infantry', 'X'), card('cavalry', 'Y')]

      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [], defenderDice: [] })
      controller.attack(3, 'B', 'C')
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 2, attackerDice: [], defenderDice: [] })
      controller.attack(2, 'C', 'D') // red now owns everything -- the winning move

      expect(controller.gameState.gameOver).toBe(true)
      expect(controller.gameState.playerCards.red).toHaveLength(0)
      expect(controller.gameState.playerCards.blue).toHaveLength(2) // never transferred
      expect(controller.gameState.knockoutOrder.blue).toBeDefined()
    })
  })

  // --------------------------------------------------------
  describe('resign()', () => {
    it('leaves territories and troop counts completely unchanged at the moment of resignation', () => {
      const territoriesBefore = controller.getPlayerTerritoryTotal('blue')
      const troopsBefore = controller.getPlayerTroopTotal('blue')
      const cCountBefore = controller.getTroopCount('C')
      const dCountBefore = controller.getTroopCount('D')

      controller.resign('blue')

      expect(controller.getPlayerTerritoryTotal('blue')).toBe(territoriesBefore)
      expect(controller.getPlayerTroopTotal('blue')).toBe(troopsBefore)
      expect(controller.getTroopCount('C')).toBe(cCountBefore)
      expect(controller.getTroopCount('D')).toBe(dCountBefore)
      expect(controller.mapController.getTerritoryOwner('C')).toBe('blue')
      expect(controller.mapController.getTerritoryOwner('D')).toBe('blue')
    })

    it('ends the current turn when the resigning player is currently mid-turn', () => {
      expect(controller.gameState.currentPlayer).toBe('red')
      controller.resign('red')

      expect(controller.gameState.currentPlayer).toBe('blue')
    })

    it('leaves the current turn untouched when resigning off-turn', () => {
      expect(controller.gameState.currentPlayer).toBe('red')
      const phaseBefore = controller.gameState.currentPhase
      const turnCountBefore = controller.gameState.turnCount

      controller.resign('blue') // blue is not the current player

      expect(controller.gameState.currentPlayer).toBe('red')
      expect(controller.gameState.currentPhase).toBe(phaseBefore)
      expect(controller.gameState.turnCount).toBe(turnCountBefore)
    })

    it('is never returned by getNextPlayer() afterward', () => {
      controller.resign('blue')
      expect(controller.getNextPlayer()).not.toBe('blue')
    })

    it('never has reinforcement calculated for them again (startPlayerTurn is never invoked for them)', () => {
      controller.resign('red') // ends red's turn, hands off to blue
      const spy = vi.spyOn(controller, 'startPlayerTurn')

      controller.startNextPlayerTurn()

      expect(spy).not.toHaveBeenCalledWith('red')
    })

    it('records a knockoutOrder entry immediately on resignation', () => {
      expect(controller.gameState.knockoutOrder.blue).toBeUndefined()
      controller.resign('blue')
      expect(controller.gameState.knockoutOrder.blue).toBeDefined()
      expect(controller.gameState.knockoutOrder.blue.playersRemaining).toBe(2)
    })

    it('transfers a resigned player\'s cards on their eventual defeat, without creating a second knockoutOrder entry', () => {
      const gs = buildGameState()
      gs.playerConfigs = [player1, player2, player3]
      gs.troops.find(t => t.territory === 'D')!.player = player3
      gs.playerCards = { red: [], blue: [card('infantry', 'X')], green: [] }
      const threePlayerController = new GameController(gs)

      threePlayerController.resign('blue')
      const knockoutAtResignation = threePlayerController.gameState.knockoutOrder.blue
      expect(threePlayerController.gameState.gameOver).toBe(false)

      vi.spyOn(threePlayerController, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [], defenderDice: [] })
      threePlayerController.attack(3, 'B', 'C') // red captures blue's last, resigned-held territory

      expect(threePlayerController.hasPlayerLost('blue')).toBe(true)
      expect(threePlayerController.gameState.playerCards.red).toHaveLength(1)
      expect(threePlayerController.gameState.playerCards.blue).toHaveLength(0)
      expect(threePlayerController.gameState.knockoutOrder.blue).toEqual(knockoutAtResignation)
    })
  })

  // --------------------------------------------------------
  describe('getStandings()', () => {
    it('places the winner (re-derived via findConquestWinner()/findCapitalWinner()) at rank 1 with turnsAlive = turnCount, once gameOver', () => {
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [], defenderDice: [] })
      controller.attack(3, 'B', 'C')
      vi.spyOn(controller, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 2, attackerDice: [], defenderDice: [] })
      controller.attack(2, 'C', 'D')

      expect(controller.gameState.gameOver).toBe(true)
      const standings = controller.getStandings()
      expect(standings[0]).toMatchObject({ rank: 1, turnsAlive: controller.gameState.turnCount })
      expect(standings[0].player.color).toBe('red')
    })

    it('returns only the still-alive tier before the game has ended (no winner tier yet)', () => {
      // Neither player has been eliminated or resigned -- both fall in the
      // "still alive" tier, ordered by troop count (red: 3+5=8, blue: 4+2=6).
      const standings = controller.getStandings()
      expect(standings).toHaveLength(2)
      expect(standings.every(s => s.territories !== null)).toBe(true)
      expect(standings.map(s => s.player.color)).toEqual(['red', 'blue'])
    })

    it('computes the full three-tier ranking: winner, still-alive non-winner (by troops), then defeated/resigned (by players-remaining-at-knockout)', () => {
      const gs = new GameState()
      gs.gameOver = true
      gs.mapConfig = buildMinimalMapConfig()
      gs.capitalMode = true
      gs.capitals = { A: 'red', C: 'green' }
      gs.playerConfigs = [player1, player2, player3, player4]
      gs.troops = [
        { territory: 'A', count: 5, player: player1 },
        { territory: 'B', count: 3, player: player2 },
        { territory: 'C', count: 2, player: player1 }, // captured from green
        { territory: 'D', count: 4, player: player4 },
      ]
      gs.currentPlayer = 'red'
      gs.currentPhase = 'attack'
      gs.playerCards = { red: [], blue: [], green: [], purple: [] }
      gs.resignedPlayers = ['purple']
      gs.knockoutOrder = {
        // purple resigned first, while all 4 players were still in.
        purple: { playersRemaining: 4, turnAtKnockout: 2 },
        // green was defeated later, once only 3 players remained (purple
        // already recorded) -- ranks better than purple within this tier.
        green: { playersRemaining: 3, turnAtKnockout: 5 },
      }
      gs.turnCount = 10

      const standings = new GameController(gs).getStandings()

      expect(standings.map(s => s.player.color)).toEqual(['red', 'blue', 'green', 'purple'])
      expect(standings[0]).toMatchObject({ rank: 1, territories: 2, troops: 7, turnsAlive: 10 })
      expect(standings[1]).toMatchObject({ rank: 2, territories: 1, troops: 3, turnsAlive: 10 })
      expect(standings[2]).toMatchObject({ rank: 3, territories: null, troops: null, turnsAlive: 5 })
      expect(standings[3]).toMatchObject({ rank: 4, territories: null, troops: null, turnsAlive: 2 })
    })

    it('orders still-alive non-winners by troop count descending, with a stable secondary order for ties', () => {
      const gs = new GameState()
      gs.gameOver = false
      gs.mapConfig = buildMinimalMapConfig()
      gs.playerConfigs = [player1, player2, player3]
      gs.troops = [
        { territory: 'A', count: 3, player: player1 },
        { territory: 'B', count: 3, player: player2 }, // tied with player3's total
        { territory: 'C', count: 3, player: player3 },
        { territory: 'D', count: 10, player: player1 }, // red has the most troops overall
      ]
      gs.currentPlayer = 'red'
      gs.currentPhase = 'attack'
      gs.playerCards = { red: [], blue: [], green: [] }

      const standings = new GameController(gs).getStandings()

      expect(standings.map(s => s.player.color)).toEqual(['red', 'blue', 'green'])
    })

    it('ranks a resigned-then-later-defeated player once, by their resignation moment', () => {
      const gs = buildGameState()
      gs.playerConfigs = [player1, player2, player3]
      gs.troops.find(t => t.territory === 'D')!.player = player3
      gs.playerCards = { red: [], blue: [], green: [] }
      const threePlayerController = new GameController(gs)

      threePlayerController.resign('blue')
      vi.spyOn(threePlayerController, 'attackRng').mockReturnValue({ attackerLosses: 0, defenderLosses: 4, attackerDice: [], defenderDice: [] })
      threePlayerController.attack(3, 'B', 'C')

      const standings = threePlayerController.getStandings()
      const blueEntries = standings.filter(s => s.player.color === 'blue')
      expect(blueEntries).toHaveLength(1)
      expect(blueEntries[0].turnsAlive).toBe(threePlayerController.gameState.knockoutOrder.blue.turnAtKnockout)
    })
  })
})
