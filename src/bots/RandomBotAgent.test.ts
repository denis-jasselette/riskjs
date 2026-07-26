import { describe, expect, it } from 'vitest'

import { legalAttackCandidates, legalFortifyRoutes } from '@/bots/BotUtils'
import { RandomBotAgent } from '@/bots/RandomBotAgent'
import { MapController } from '@/controllers/MapController'
import { buildGameState } from '@/controllers/testFixtures'

describe('RandomBotAgent', () => {
  describe('decideDeploy', () => {
    it('always deploys the full remaining pool to an owned territory', () => {
      const gameState = buildGameState()
      const mapController = new MapController(gameState)

      for (let i = 0; i < 30; i++) {
        const decision = RandomBotAgent.decideDeploy(gameState, mapController, 'red')
        expect(decision.type).toBe('deploy')
        if (decision.type !== 'deploy') throw new Error('unreachable')
        expect(['A', 'B']).toContain(decision.territory)
        expect(decision.troops).toBe(gameState.troopsToDeploy)
      }
    })
  })

  describe('decideFortify', () => {
    it('always returns end_phase when no legal fortify route exists', () => {
      const gameState = buildGameState()
      gameState.troops.find(t => t.territory === 'A')!.count = 1
      gameState.troops.find(t => t.territory === 'B')!.count = 1
      const mapController = new MapController(gameState)
      expect(legalFortifyRoutes(gameState, mapController, 'red')).toHaveLength(0)

      for (let i = 0; i < 30; i++) {
        expect(RandomBotAgent.decideFortify(gameState, mapController, 'red')).toEqual({ type: 'end_phase' })
      }
    })

    it('only ever picks among legal fortify routes (or skips) when routes exist', () => {
      const gameState = buildGameState()
      const mapController = new MapController(gameState)
      const routes = legalFortifyRoutes(gameState, mapController, 'red')

      const seenTypes = new Set<string>()
      for (let i = 0; i < 100; i++) {
        const decision = RandomBotAgent.decideFortify(gameState, mapController, 'red')
        seenTypes.add(decision.type)
        if (decision.type === 'end_phase') continue
        if (decision.type !== 'fortify') throw new Error('unreachable')
        expect(routes.some(r => r.fromTerritory === decision.fromTerritory && r.toTerritory === decision.toTerritory)).toBe(true)
        expect(decision.troops).toBeGreaterThanOrEqual(1)
      }
      // Across enough trials, both "fortify" and "skip" should surface.
      expect(seenTypes.has('fortify')).toBe(true)
      expect(seenTypes.has('end_phase')).toBe(true)
    })
  })

  describe('decideAttack', () => {
    it('always returns end_phase when no legal attack candidate exists', () => {
      const gameState = buildGameState()
      gameState.troops.find(t => t.territory === 'A')!.count = 1
      gameState.troops.find(t => t.territory === 'B')!.count = 1
      const mapController = new MapController(gameState)
      expect(legalAttackCandidates(gameState, mapController, 'red')).toHaveLength(0)

      for (let i = 0; i < 30; i++) {
        expect(RandomBotAgent.decideAttack(gameState, mapController, 'red')).toEqual({ type: 'end_phase' })
      }
    })

    it('picks among legal attacks when any exist, and sometimes stops instead', () => {
      const gameState = buildGameState()
      const mapController = new MapController(gameState)
      const candidates = legalAttackCandidates(gameState, mapController, 'red')
      expect(candidates.length).toBeGreaterThan(0)

      const seenTypes = new Set<string>()
      for (let i = 0; i < 100; i++) {
        const decision = RandomBotAgent.decideAttack(gameState, mapController, 'red')
        seenTypes.add(decision.type)
        if (decision.type === 'end_phase') continue
        if (decision.type !== 'attack') throw new Error('unreachable')
        expect(candidates.some(c => c.attackingTerritory === decision.attackingTerritory && c.defendingTerritory === decision.defendingTerritory)).toBe(true)
      }
      expect(seenTypes.has('attack')).toBe(true)
      expect(seenTypes.has('end_phase')).toBe(true)
    })
  })
})
