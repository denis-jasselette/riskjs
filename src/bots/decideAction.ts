import { BotAgent } from '@/bots/BotAgent'
import { BotDecision } from '@/bots/BotDecision'
import { firstValidCardSet, legalDeployTargets } from '@/bots/BotUtils'
import { HeuristicBotAgent } from '@/bots/HeuristicBotAgent'
import { wrapNeutral } from '@/bots/NeutralBotAgent'
import { RandomBotAgent } from '@/bots/RandomBotAgent'
import GameController from '@/controllers/GameController'
import { MapController } from '@/controllers/MapController'
import GameState from '@/models/GameState'

const SAFE_DEFAULT: BotDecision = { type: 'end_phase' }

function resolveAgent(gameState: GameState, player: string): BotAgent | null {
  const config = gameState.playerConfigs.find(p => p.color === player)
  if (!config?.botSkill) return null

  const tierAgent = config.botSkill === 'medium' ? HeuristicBotAgent : RandomBotAgent
  return config.botBehavior === 'neutral' ? wrapNeutral(tierAgent) : tierAgent
}

// See specs/002-bot-ai/data-model.md's "Decision precedence within
// decideAction" for the full rationale of this ordering.
function decide(gameState: GameState, mapController: MapController, player: string, agent: BotAgent): BotDecision {
  const pending = gameState.pendingPostConquestMove
  if (pending) return { type: 'confirm_post_conquest_move', troopsToMove: pending.minTroopsToMove }

  if (gameState.currentPhase === 'capitalDeploy') {
    const targets = legalDeployTargets(gameState, player)
    return targets.length > 0 ? { type: 'choose_capital', territory: targets[0] } : SAFE_DEFAULT
  }

  if (gameState.currentPhase === 'deploy') {
    // Trade in an available set (forced or optional) before anything else --
    // FR-007's edge case: no tier ever strategically holds a tradeable set.
    // Widened from just the forced case (data-model.md's literal wording)
    // since the observable behavior is identical for both and for every
    // tier, per the edge case's explicit "regardless of mandatory or
    // optional... at any tier."
    const controller = new GameController(gameState)
    if (controller.hasAvailableTradeIn(player)) {
      const trade = firstValidCardSet(controller, player)
      if (trade) return { type: 'trade_cards', cardIndices: trade.cardIndices, bonusTerritory: trade.bonusTerritory }
    }
    return agent.decideDeploy(gameState, mapController, player)
  }

  if (gameState.currentPhase === 'attack') return agent.decideAttack(gameState, mapController, player)
  if (gameState.currentPhase === 'fortify') return agent.decideFortify(gameState, mapController, player)

  return SAFE_DEFAULT
}

// The one seam every bot-turn driver (Game.tsx today; a future server-side
// driver once feature 001 exists) calls through. `null` means player isn't a
// configured bot seat; otherwise always returns a concrete, legal
// BotDecision, never throwing -- see contracts/bot-decision-interface.md.
export function decideAction(gameState: GameState, mapController: MapController, player: string): BotDecision | null {
  const agent = resolveAgent(gameState, player)
  if (!agent) return null

  try {
    return decide(gameState, mapController, player, agent)
  }
  catch {
    return SAFE_DEFAULT
  }
}
