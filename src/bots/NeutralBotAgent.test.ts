import { describe, expect, it } from 'vitest'

import { HeuristicBotAgent } from '@/bots/HeuristicBotAgent'
import { wrapNeutral } from '@/bots/NeutralBotAgent'
import { RandomBotAgent } from '@/bots/RandomBotAgent'
import { MapController } from '@/controllers/MapController'
import { buildGameState } from '@/controllers/testFixtures'

describe('NeutralBotAgent (wrapNeutral)', () => {
  describe('decideAttack -- always suppressed (FR-010, SC-004)', () => {
    it.each([
      ['RandomBotAgent', RandomBotAgent],
      ['HeuristicBotAgent', HeuristicBotAgent],
    ] as const)('never attacks when wrapping %s, even with an overwhelming favorable attack available', (_label, wrapped) => {
      const gameState = buildGameState()
      // Make B -> C overwhelmingly favorable so both the wrapped Random and
      // Heuristic agents would otherwise sometimes/always take it.
      gameState.troops.find(t => t.territory === 'B')!.count = 20
      gameState.troops.find(t => t.territory === 'C')!.count = 1
      const mapController = new MapController(gameState)

      const neutral = wrapNeutral(wrapped)
      for (let i = 0; i < 50; i++) {
        expect(neutral.decideAttack(gameState, mapController, 'red')).toEqual({ type: 'end_phase' })
      }
    })
  })

  describe('decideDeploy / decideFortify -- delegate to the wrapped tier unchanged', () => {
    it('deploy matches the wrapped tier exactly (deterministic Heuristic case)', () => {
      const gameState = buildGameState()
      const mapController = new MapController(gameState)
      const neutral = wrapNeutral(HeuristicBotAgent)

      expect(neutral.decideDeploy(gameState, mapController, 'red')).toEqual(HeuristicBotAgent.decideDeploy(gameState, mapController, 'red'))
    })

    it('fortify matches the wrapped tier exactly (deterministic Heuristic case)', () => {
      const gameState = buildGameState()
      const mapController = new MapController(gameState)
      const neutral = wrapNeutral(HeuristicBotAgent)

      expect(neutral.decideFortify(gameState, mapController, 'red')).toEqual(HeuristicBotAgent.decideFortify(gameState, mapController, 'red'))
    })

    it('deploy/fortify choices from a wrapped RandomBotAgent stay within its own legal set', () => {
      const gameState = buildGameState()
      const mapController = new MapController(gameState)
      const neutral = wrapNeutral(RandomBotAgent)

      const deployDecision = neutral.decideDeploy(gameState, mapController, 'red')
      expect(deployDecision.type).toBe('deploy')
      if (deployDecision.type === 'deploy') expect(['A', 'B']).toContain(deployDecision.territory)
    })
  })
})
