import { BotDecision } from '@/bots/BotDecision'
import { MapController } from '@/controllers/MapController'
import GameState from '@/models/GameState'

// One implementation per difficulty tier (RandomBotAgent, HeuristicBotAgent),
// optionally wrapped by NeutralBotAgent. Card trading and the
// capitalDeploy/pendingPostConquestMove special cases are handled once in
// decideAction's shared precedence dispatcher, not per-agent -- see
// specs/002-bot-ai/data-model.md.
export interface BotAgent {
  decideDeploy(gameState: GameState, mapController: MapController, player: string): BotDecision
  decideAttack(gameState: GameState, mapController: MapController, player: string): BotDecision
  decideFortify(gameState: GameState, mapController: MapController, player: string): BotDecision
}
