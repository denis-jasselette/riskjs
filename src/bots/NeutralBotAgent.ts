import type { AttackAction, BotAgent, DeployAction, FortifyAction } from '@/bots/BotAgent'
import RandomBotAgent from '@/bots/RandomBotAgent'
import type GameState from '@/models/GameState'

/**
 * Neutral (docs/SPEC.md, "Bot AI"): a seat that holds territory passively. It still
 * deploys — a turn can't otherwise progress past the deploy phase — but never
 * attacks and never fortifies, regardless of the board state. This is a separate
 * axis from the Easy/Medium difficulty tiers, not a tier itself.
 */
export default class NeutralBotAgent implements BotAgent {
  private readonly deployDelegate = new RandomBotAgent()

  decideDeploy(gameState: GameState, player: string): DeployAction {
    return this.deployDelegate.decideDeploy(gameState, player)
  }

  decideAttack(_gameState: GameState, _player: string): AttackAction | null {
    return null
  }

  decideFortify(_gameState: GameState, _player: string): FortifyAction | null {
    return null
  }
}
