import type { AttackAction, BotAgent, DeployAction, FortifyAction } from '@/bots/BotAgent'
import { getAttackableTerritories, getOwnedTerritories, getTroopCount } from '@/bots/BotUtils'
import GameController from '@/controllers/GameController'
import { distribute, randInt, shuffled } from '@/lib/Random'
import type GameState from '@/models/GameState'

/**
 * Probability of choosing to stop rather than take an otherwise-available action,
 * checked at every decision point. This is what makes the bot "stop after each
 * attack with some probability" (#53) despite `decideAttack`/`decideFortify` each
 * being a single, stateless decision — a caller driving a full phase is expected to
 * keep calling `decideAttack` until it gets `null` back.
 */
const STOP_PROBABILITY = 0.3

/**
 * Easy tier (#53 "phase 1 random"): legal-but-random actions. Deliberately dumb —
 * its job is exercising the game loop, not competitive play.
 */
export default class RandomBotAgent implements BotAgent {
  decideDeploy(gameState: GameState, player: string): DeployAction {
    const owned = getOwnedTerritories(gameState, player)
    if (owned.length === 0 || gameState.troopsToDeploy <= 0)
      return { allocations: [] }

    const buckets = distribute(gameState.troopsToDeploy, owned.length)
    const allocations = owned
      .map((territory, i) => ({ territory, troops: buckets[i] }))
      .filter(allocation => allocation.troops > 0)

    return { allocations }
  }

  decideAttack(gameState: GameState, player: string): AttackAction | null {
    if (Math.random() < STOP_PROBABILITY)
      return null

    const controller = new GameController(gameState)
    const attackers = shuffled(getOwnedTerritories(gameState, player).filter(t => getTroopCount(gameState, t) >= 2))

    for (const from of attackers) {
      const targets = getAttackableTerritories(gameState, controller, from)
      if (targets.length === 0)
        continue

      const to = targets[randInt(0, targets.length - 1)]
      const troops = randInt(1, getTroopCount(gameState, from) - 1)
      return { from, to, troops }
    }

    return null
  }

  decideFortify(gameState: GameState, player: string): FortifyAction | null {
    if (Math.random() < STOP_PROBABILITY)
      return null

    const controller = new GameController(gameState)
    const owned = getOwnedTerritories(gameState, player)
    const sources = shuffled(owned.filter(t => getTroopCount(gameState, t) >= 2))

    for (const from of sources) {
      const destinations = owned.filter(t => t !== from && controller.isFortifyAllowed(from, t))
      if (destinations.length === 0)
        continue

      const to = destinations[randInt(0, destinations.length - 1)]
      const troops = randInt(1, getTroopCount(gameState, from) - 1)
      return { from, to, troops }
    }

    return null
  }
}
