import type { AttackAction, BotAgent, DeployAction, FortifyAction } from '@/bots/BotAgent'
import { getAttackableTerritories, getOwnedTerritories, getTroopCount, isBorderTerritory } from '@/bots/BotUtils'
import GameController from '@/controllers/GameController'
import type GameState from '@/models/GameState'

/** Attacker must have at least this many times the defender's troop count before attacking. */
const ATTACK_ADVANTAGE_RATIO = 2

/**
 * Medium tier (#6): deterministic single-pass scoring, no search/lookahead (per
 * docs/SPEC.md, lookahead is rejected even for higher tiers) —
 * - Deploy toward the weakest border territories
 * - Attack only at >= 2x favorable troop odds
 * - Fortify toward the most-exposed owned territory
 */
export default class HeuristicBotAgent implements BotAgent {
  decideDeploy(gameState: GameState, player: string): DeployAction {
    const owned = getOwnedTerritories(gameState, player)
    if (owned.length === 0 || gameState.troopsToDeploy <= 0)
      return { allocations: [] }

    const controller = new GameController(gameState)
    const borders = owned.filter(t => isBorderTerritory(gameState, controller, t))
    // Prefer reinforcing borders; if the player holds no border territory (e.g. a
    // fully enclosed continent), fall back to its weakest territory overall rather
    // than deploying nowhere.
    const priority = (borders.length > 0 ? borders : owned)
      .slice()
      .sort((a, b) => getTroopCount(gameState, a) - getTroopCount(gameState, b) || a.localeCompare(b))

    // Deal troops out one at a time, weakest territory first, cycling through the
    // priority list — this concentrates reinforcement on the weakest border
    // territories without ever leaving interior territories favored over them.
    const allocationByTerritory = new Map<string, number>()
    for (let i = 0; i < gameState.troopsToDeploy; i++) {
      const territory = priority[i % priority.length]
      allocationByTerritory.set(territory, (allocationByTerritory.get(territory) ?? 0) + 1)
    }

    const allocations = Array.from(allocationByTerritory.entries()).map(([territory, troops]) => ({ territory, troops }))
    return { allocations }
  }

  decideAttack(gameState: GameState, player: string): AttackAction | null {
    const controller = new GameController(gameState)
    const owned = getOwnedTerritories(gameState, player)

    let best: { from: string, to: string, ratio: number } | null = null

    for (const from of owned) {
      const availableAttackers = getTroopCount(gameState, from) - 1
      if (availableAttackers < ATTACK_ADVANTAGE_RATIO)
        continue

      for (const to of getAttackableTerritories(gameState, controller, from)) {
        const defenderTroops = getTroopCount(gameState, to)
        if (defenderTroops <= 0 || availableAttackers < ATTACK_ADVANTAGE_RATIO * defenderTroops)
          continue

        const ratio = availableAttackers / defenderTroops
        if (!best || ratio > best.ratio || (ratio === best.ratio && `${from}${to}`.localeCompare(`${best.from}${best.to}`) < 0))
          best = { from, to, ratio }
      }
    }

    if (!best)
      return null

    const troops = Math.min(getTroopCount(gameState, best.from) - 1, 3)
    return { from: best.from, to: best.to, troops }
  }

  decideFortify(gameState: GameState, player: string): FortifyAction | null {
    const controller = new GameController(gameState)
    const owned = getOwnedTerritories(gameState, player)

    const exposure = new Map(owned.map(t => [t, getAttackableTerritories(gameState, controller, t).length]))

    const [target] = owned
      .slice()
      .sort((a, b) => (exposure.get(b) ?? 0) - (exposure.get(a) ?? 0) || a.localeCompare(b))

    // No owned territory borders an enemy — nothing to reinforce.
    if (!target || (exposure.get(target) ?? 0) === 0)
      return null

    // Draw troops from a reachable, less-exposed territory with spare troops,
    // preferring the least exposed (most "interior") source, then the largest stack.
    const [from] = owned
      .filter(t => t !== target && getTroopCount(gameState, t) >= 2 && controller.isFortifyAllowed(t, target))
      .sort((a, b) =>
        (exposure.get(a) ?? 0) - (exposure.get(b) ?? 0)
        || getTroopCount(gameState, b) - getTroopCount(gameState, a),
      )

    if (!from)
      return null

    const troops = getTroopCount(gameState, from) - 1
    if (troops <= 0)
      return null

    return { from, to: target, troops }
  }
}
