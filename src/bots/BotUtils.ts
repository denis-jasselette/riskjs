import GameController from '@/controllers/GameController'
import { MapController } from '@/controllers/MapController'
import GameState from '@/models/GameState'

export type FortifyRoute = { fromTerritory: string, toTerritory: string, maxTroops: number }
export type AttackCandidate = { attackingTerritory: string, defendingTerritory: string, attackingTroops: number, defendingTroops: number }
export type CardTrade = { cardIndices: number[], bonusTerritory?: string }

// Every territory `player` owns -- the full legal-deploy-target set (mirrors
// isSelectable's deploy-phase rule: owner === currentPlayer).
export function legalDeployTargets(gameState: GameState, player: string): string[] {
  return gameState.troops.filter(t => t.player.color === player).map(t => t.territory)
}

// Every (from, to) pair where `from` is owned by player with >1 troop (so it
// has troops to spare) and `to` is a different player-owned territory
// connected to `from` via an unbroken same-owner path (mirrors
// GameController.isFortifyAllowed exactly).
export function legalFortifyRoutes(gameState: GameState, mapController: MapController, player: string): FortifyRoute[] {
  const ownedWithSpareTroops = gameState.troops.filter(t => t.player.color === player && t.count > 1)
  const ownedTerritories = gameState.troops.filter(t => t.player.color === player).map(t => t.territory)
  const routes: FortifyRoute[] = []
  for (const from of ownedWithSpareTroops) {
    for (const to of ownedTerritories) {
      if (to === from.territory) continue
      if (mapController.areConnected(from.territory, to, { sameOwner: true }))
        routes.push({ fromTerritory: from.territory, toTerritory: to, maxTroops: from.count - 1 })
    }
  }
  return routes
}

// Every (attacker, defender) pair legal for `player` to initiate right now:
// attacker owned by player with >1 troop, defender within player's visible
// territories (FR-005 -- fog respected), owned by someone else, and adjacent
// per GameController.isAttackAllowed's own rule (areAdjacent with
// differentOwner, which already excludes blizzard-frozen territories).
// attackingTroops defaults to the maximum committable (leave exactly 1
// behind), matching the client's own default dice-count/troop convention.
export function legalAttackCandidates(gameState: GameState, mapController: MapController, player: string): AttackCandidate[] {
  const visibleTerritories = mapController.getVisibleTerritories(player)
  const ownedWithSpareTroops = gameState.troops.filter(t => t.player.color === player && t.count > 1)
  const candidates: AttackCandidate[] = []
  for (const from of ownedWithSpareTroops) {
    for (const defendingTerritory of visibleTerritories) {
      const owner = mapController.getTerritoryOwner(defendingTerritory)
      if (!owner || owner === player) continue
      if (!mapController.areAdjacent(from.territory, defendingTerritory, { differentOwner: true })) continue

      candidates.push({
        attackingTerritory: from.territory,
        defendingTerritory,
        attackingTroops: from.count - 1,
        defendingTroops: mapController.getTroopState(defendingTerritory)!.count,
      })
    }
  }
  return candidates
}

// A simple, deterministic favorability check (standard Risk strategy
// convention, not a tuned/benchmarked probability model, per spec's
// Assumptions): favorable only with a comfortable numeric troop advantage,
// not a bare majority -- conservative on purpose, so a Medium seat visibly
// avoids the marginal attacks an Easy seat sometimes takes at random (SC-003).
export function isFavorableAttack(candidate: AttackCandidate): boolean {
  return candidate.attackingTroops >= candidate.defendingTroops + 2
}

// The first 3-card subset of player's hand that forms a valid tradeable set
// (by hand index), with a bonus territory chosen from whichever traded card
// depicts a territory player currently occupies (FR-007 -- first
// opportunity, no strategic search for the "best" set).
export function firstValidCardSet(controller: GameController, player: string): CardTrade | null {
  const hand = controller.gameState.playerCards[player] ?? []
  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      for (let k = j + 1; k < hand.length; k++) {
        const cards = [hand[i], hand[j], hand[k]]
        if (!controller.isValidCardSet(cards)) continue

        const cardIndices = [i, j, k]
        const bonusTerritory = cardIndices
          .map(index => hand[index].territory)
          .find((territory): territory is string => !!territory && controller.mapController.getTerritoryOwner(territory) === player)
        return { cardIndices, bonusTerritory }
      }
    }
  }
  return null
}
