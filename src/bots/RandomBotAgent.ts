import { BotAgent } from '@/bots/BotAgent'
import { BotDecision } from '@/bots/BotDecision'
import { legalAttackCandidates, legalDeployTargets, legalFortifyRoutes } from '@/bots/BotUtils'
import { MapController } from '@/controllers/MapController'
import { randInt } from '@/lib/Random'
import GameState from '@/models/GameState'

function pickRandom<T>(items: T[]): T {
  return items[randInt(0, items.length - 1)]
}

// Easy tier (FR-006): uniform-random among the currently-legal choices for
// each phase, with no strategic evaluation. Deploy only ever has one kind of
// legal action (deploy somewhere), so there's no "skip" option to weigh
// against; attack and fortify are both optional, so "stop" (end_phase) is
// included as one of the uniformly-random outcomes alongside every legal
// candidate -- not just a last-resort fallback -- so an Easy seat doesn't
// mechanically exhaust every possible attack/fortify every single turn.
export const RandomBotAgent: BotAgent = {
  decideDeploy(gameState: GameState, _mapController: MapController, player: string): BotDecision {
    const targets = legalDeployTargets(gameState, player)
    return { type: 'deploy', troops: gameState.troopsToDeploy, territory: pickRandom(targets) }
  },

  decideAttack(gameState: GameState, mapController: MapController, player: string): BotDecision {
    const candidates = legalAttackCandidates(gameState, mapController, player)
    if (candidates.length === 0) return { type: 'end_phase' }

    const options: BotDecision[] = [
      { type: 'end_phase' },
      ...candidates.map((c): BotDecision => ({
        type: 'attack',
        attackingTerritory: c.attackingTerritory,
        defendingTerritory: c.defendingTerritory,
        attackingTroops: c.attackingTroops,
      })),
    ]
    return pickRandom(options)
  },

  decideFortify(gameState: GameState, mapController: MapController, player: string): BotDecision {
    const routes = legalFortifyRoutes(gameState, mapController, player)
    if (routes.length === 0) return { type: 'end_phase' }

    const options: BotDecision[] = [
      { type: 'end_phase' },
      ...routes.map((r): BotDecision => ({
        type: 'fortify',
        fromTerritory: r.fromTerritory,
        toTerritory: r.toTerritory,
        troops: randInt(1, r.maxTroops),
      })),
    ]
    return pickRandom(options)
  },
}
