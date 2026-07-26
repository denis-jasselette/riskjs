import { BotAgent } from '@/bots/BotAgent'
import { BotDecision } from '@/bots/BotDecision'
import { MapController } from '@/controllers/MapController'
import GameState from '@/models/GameState'

// Wraps another tier's agent (FR-009/FR-010): deploy/fortify delegate to the
// wrapped tier unchanged; attack is always suppressed regardless of the
// wrapped tier's own evaluation -- Neutral overrides tier-driven attack
// behavior unconditionally, even an overwhelmingly favorable one (US3).
export function wrapNeutral(wrapped: BotAgent): BotAgent {
  return {
    decideDeploy: wrapped.decideDeploy,
    decideFortify: wrapped.decideFortify,
    decideAttack(_gameState: GameState, _mapController: MapController, _player: string): BotDecision {
      return { type: 'end_phase' }
    },
  }
}
