import { BotAgent } from '@/bots/BotAgent'
import { BotDecision } from '@/bots/BotDecision'
import { AttackCandidate, isFavorableAttack, legalAttackCandidates, legalDeployTargets, legalFortifyRoutes } from '@/bots/BotUtils'
import GameController from '@/controllers/GameController'
import { MapController } from '@/controllers/MapController'
import GameState from '@/models/GameState'

// "Adequately garrisoned" (FR-008): the minimum troop count a Medium seat
// insists on leaving behind in its own capital before attacking from it --
// an arbitrary but reasonable floor, not a tuned/benchmarked value, per
// spec's Assumptions.
const CAPITAL_DEFENSE_FLOOR = 3

// Border = adjacent to a territory this player does not own (enemy-owned or
// unowned/blizzard-vacated) -- the same notion of "exposed" territory a
// human strategist would reinforce first.
function isBorderTerritory(gameState: GameState, mapController: MapController, player: string, territory: string): boolean {
  const config = gameState.mapConfig.territories[territory]
  if (!config) return false
  return config.adjacency.some(adjacent => mapController.getTerritoryOwner(adjacent) !== player)
}

// Whether launching `candidate` from the seat's own capital would drop its
// garrison below the defense floor (FR-008's "keeps its own capital
// adequately defended") -- applied to the whole candidate pool up front,
// not just within capital-targeting selection, so this constraint can't be
// bypassed by falling through to a different selection path.
function wouldUnderGarrisonOwnCapital(gameState: GameState, mapController: MapController, player: string, candidate: AttackCandidate): boolean {
  if (!gameState.capitalMode) return false

  const ownCapital = mapController.getPlayerCapitalTerritory(player)
  if (candidate.attackingTerritory !== ownCapital) return false

  const controller = new GameController(gameState)
  return controller.getTroopCount(ownCapital) - candidate.attackingTroops < CAPITAL_DEFENSE_FLOOR
}

// A favorable candidate that captures a weaker opponent's capital (FR-008).
// "Weaker" is judged on the opponent's true total territory count when fog
// is off (fully known information in that case), but only on the subset of
// their territories currently visible to player when fog is on (FR-005) --
// mirrors MapController.getVisibleContinentOwner's own
// "if (!fogEnabled) use the full picture, else restrict to visible" pattern.
function findCapitalAttack(gameState: GameState, mapController: MapController, player: string, safe: AttackCandidate[]): AttackCandidate | undefined {
  if (!gameState.capitalMode) return undefined

  const controller = new GameController(gameState)
  const ownTerritoryTotal = controller.getPlayerTerritoryTotal(player)
  const visibleTerritories = mapController.getVisibleTerritories(player)

  return safe.find((candidate) => {
    if (!mapController.isTerritoryCapital(candidate.defendingTerritory)) return false

    const opponent = mapController.getTerritoryOwner(candidate.defendingTerritory)
    if (!opponent) return false

    const opponentTerritoryTotal = gameState.fogEnabled
      ? visibleTerritories.filter(t => mapController.getTerritoryOwner(t) === opponent).length
      : controller.getPlayerTerritoryTotal(opponent)
    return opponentTerritoryTotal < ownTerritoryTotal
  })
}

// A favorable candidate whose conquest would complete continent control --
// every other territory in that continent is already owned by player. Under
// fog, only counts as "complete" when every one of those other territories
// is also currently visible (FR-005) -- otherwise the seat can't actually
// know it would complete the continent, so it doesn't claim to.
function findContinentCompletionAttack(gameState: GameState, mapController: MapController, player: string, favorable: AttackCandidate[]): AttackCandidate | undefined {
  const visibleTerritories = gameState.fogEnabled ? new Set(mapController.getVisibleTerritories(player)) : null

  return favorable.find((candidate) => {
    const continent = gameState.mapConfig.territories[candidate.defendingTerritory]?.continent
    if (!continent) return false

    const otherContinentTerritories = mapController.getContinentTerritories(continent).filter(t => t !== candidate.defendingTerritory)
    return otherContinentTerritories.length > 0 && otherContinentTerritories.every(t =>
      (!visibleTerritories || visibleTerritories.has(t)) && mapController.getTerritoryOwner(t) === player,
    )
  })
}

// Medium tier (FR-007/FR-008): one deterministic evaluation pass, no
// randomness -- favors border reinforcement, only initiates attacks judged
// favorable (weighted toward a weaker opponent's capital when capital mode
// is on, else toward completing continent control when a reasonable
// opportunity exists), and always trades in an available card set
// (handled upstream in decideAction's shared precedence step, not here).
export const HeuristicBotAgent: BotAgent = {
  decideDeploy(gameState: GameState, mapController: MapController, player: string): BotDecision {
    const targets = legalDeployTargets(gameState, player)
    const borderTargets = targets.filter(t => isBorderTerritory(gameState, mapController, player, t))
    const territory = borderTargets[0] ?? targets[0]
    return { type: 'deploy', troops: gameState.troopsToDeploy, territory }
  },

  decideAttack(gameState: GameState, mapController: MapController, player: string): BotDecision {
    const candidates = legalAttackCandidates(gameState, mapController, player)
    const favorable = candidates.filter(isFavorableAttack)
    const safe = favorable.filter(c => !wouldUnderGarrisonOwnCapital(gameState, mapController, player, c))
    if (safe.length === 0) return { type: 'end_phase' }

    const chosen = findCapitalAttack(gameState, mapController, player, safe)
      ?? findContinentCompletionAttack(gameState, mapController, player, safe)
      ?? safe[0]

    return {
      type: 'attack',
      attackingTerritory: chosen.attackingTerritory,
      defendingTerritory: chosen.defendingTerritory,
      attackingTroops: chosen.attackingTroops,
    }
  },

  decideFortify(gameState: GameState, mapController: MapController, player: string): BotDecision {
    const routes = legalFortifyRoutes(gameState, mapController, player)
    // Move spare troops from an interior territory toward a border one --
    // the same border-reinforcement priority as deploy, applied to fortify.
    const toBorder = routes.find(r =>
      isBorderTerritory(gameState, mapController, player, r.toTerritory)
      && !isBorderTerritory(gameState, mapController, player, r.fromTerritory),
    )
    if (!toBorder) return { type: 'end_phase' }

    return { type: 'fortify', fromTerritory: toBorder.fromTerritory, toTerritory: toBorder.toTerritory, troops: toBorder.maxTroops }
  },
}
