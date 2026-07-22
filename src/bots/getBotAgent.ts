import type { BotAgent } from '@/bots/BotAgent'
import HeuristicBotAgent from '@/bots/HeuristicBotAgent'
import NeutralBotAgent from '@/bots/NeutralBotAgent'
import RandomBotAgent from '@/bots/RandomBotAgent'
import type { BotSkill } from '@/models/PlayerConfig'

const randomBotAgent = new RandomBotAgent()
const heuristicBotAgent = new HeuristicBotAgent()
const neutralBotAgent = new NeutralBotAgent()

/**
 * Resolves the bot "brain" for a seat's configured `botSkill`. `neutral` always
 * resolves to `NeutralBotAgent`, whose `decideAttack` unconditionally returns
 * `null` — so a neutral seat never attacks regardless of which tier's attack
 * heuristic would otherwise apply.
 *
 * Hard/Expert are deferred (docs/SPEC.md, "Bot AI") and not implemented yet; until
 * they are, they resolve to the Medium heuristic rather than throwing, so a config
 * value in that range still gets a functioning bot.
 */
export function getBotAgent(skill: BotSkill): BotAgent {
  switch (skill) {
    case 'neutral':
      return neutralBotAgent
    case 'easy':
      return randomBotAgent
    case 'medium':
    case 'hard':
    case 'expert':
      return heuristicBotAgent
  }
}
