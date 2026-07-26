import { describe, expect, it } from 'vitest'

import { firstValidCardSet, isFavorableAttack, legalAttackCandidates, legalDeployTargets, legalFortifyRoutes } from '@/bots/BotUtils'
import GameController from '@/controllers/GameController'
import { MapController } from '@/controllers/MapController'
import { buildGameState, card } from '@/controllers/testFixtures'

describe('BotUtils', () => {
  describe('legalDeployTargets', () => {
    it('returns every territory the player owns', () => {
      const gameState = buildGameState()
      expect(legalDeployTargets(gameState, 'red').sort()).toEqual(['A', 'B'])
    })
  })

  describe('legalFortifyRoutes', () => {
    it('returns every connected same-owner (from, to) pair with spare troops', () => {
      const gameState = buildGameState()
      const mapController = new MapController(gameState)
      const routes = legalFortifyRoutes(gameState, mapController, 'red')

      expect(routes).toEqual(expect.arrayContaining([
        { fromTerritory: 'A', toTerritory: 'B', maxTroops: 2 },
        { fromTerritory: 'B', toTerritory: 'A', maxTroops: 4 },
      ]))
      expect(routes).toHaveLength(2)
    })

    it('excludes a from-territory with only 1 troop (nothing to spare)', () => {
      const gameState = buildGameState()
      gameState.troops.find(t => t.territory === 'A')!.count = 1
      const mapController = new MapController(gameState)
      const routes = legalFortifyRoutes(gameState, mapController, 'red')

      expect(routes.some(r => r.fromTerritory === 'A')).toBe(false)
    })
  })

  describe('legalAttackCandidates', () => {
    it('returns only adjacent, differently-owned, visible candidates', () => {
      const gameState = buildGameState()
      const mapController = new MapController(gameState)
      const candidates = legalAttackCandidates(gameState, mapController, 'red')

      expect(candidates).toEqual([
        { attackingTerritory: 'B', defendingTerritory: 'C', attackingTroops: 4, defendingTroops: 4 },
      ])
    })

    it('respects fog of war -- never proposes a non-visible territory', () => {
      const gameState = buildGameState()
      gameState.fogEnabled = true
      // D is owned by blue and only adjacent to C -- not visible to red
      // (red owns A/B, whose only adjacency is A/B/C).
      const mapController = new MapController(gameState)
      const candidates = legalAttackCandidates(gameState, mapController, 'red')

      expect(candidates.some(c => c.defendingTerritory === 'D')).toBe(false)
    })

    it('excludes an attacking territory with only 1 troop', () => {
      const gameState = buildGameState()
      gameState.troops.find(t => t.territory === 'B')!.count = 1
      const mapController = new MapController(gameState)
      const candidates = legalAttackCandidates(gameState, mapController, 'red')

      expect(candidates).toHaveLength(0)
    })
  })

  describe('isFavorableAttack', () => {
    it('is unfavorable when the troop advantage is not comfortable', () => {
      expect(isFavorableAttack({ attackingTerritory: 'B', defendingTerritory: 'C', attackingTroops: 4, defendingTroops: 4 })).toBe(false)
      expect(isFavorableAttack({ attackingTerritory: 'B', defendingTerritory: 'C', attackingTroops: 4, defendingTroops: 3 })).toBe(false)
    })

    it('is favorable with a comfortable numeric troop advantage', () => {
      expect(isFavorableAttack({ attackingTerritory: 'B', defendingTerritory: 'C', attackingTroops: 6, defendingTroops: 4 })).toBe(true)
    })
  })

  describe('firstValidCardSet', () => {
    it('returns null when no 3-card subset of the hand forms a valid set', () => {
      const gameState = buildGameState()
      gameState.playerCards.red = [card('infantry'), card('infantry')]
      const controller = new GameController(gameState)

      expect(firstValidCardSet(controller, 'red')).toBeNull()
    })

    it('returns the first valid set found, with a bonus territory the player occupies', () => {
      const gameState = buildGameState()
      gameState.playerCards.red = [card('infantry', 'A'), card('cavalry'), card('artillery')]
      const controller = new GameController(gameState)

      expect(firstValidCardSet(controller, 'red')).toEqual({ cardIndices: [0, 1, 2], bonusTerritory: 'A' })
    })

    it('omits bonusTerritory when no traded card depicts a territory the player occupies', () => {
      const gameState = buildGameState()
      gameState.playerCards.red = [card('infantry', 'C'), card('cavalry'), card('artillery')]
      const controller = new GameController(gameState)

      expect(firstValidCardSet(controller, 'red')).toEqual({ cardIndices: [0, 1, 2], bonusTerritory: undefined })
    })
  })
})
