import type GameController from '@/controllers/GameController'
import type GameState from '@/models/GameState'

/** Territories currently owned by `player`. */
export function getOwnedTerritories(gameState: GameState, player: string): string[] {
  return gameState.troops.filter(t => t.player.color === player).map(t => t.territory)
}

export function getTroopCount(gameState: GameState, territory: string): number {
  return gameState.troops.find(t => t.territory === territory)?.count ?? 0
}

/**
 * Enemy territories `territory` could legally attack, per `GameController.isAttackAllowed`
 * (adjacency + different owner, with blizzard territories already excluded by
 * `MapController`'s BFS). Checked against every other territory rather than just
 * `territory`'s configured adjacency list so blizzard/ownership rules stay centralized
 * in `MapController` instead of being reimplemented here.
 */
export function getAttackableTerritories(gameState: GameState, controller: GameController, territory: string): string[] {
  return Object.keys(gameState.mapConfig.territories).filter(candidate =>
    candidate !== territory && controller.isAttackAllowed(territory, candidate),
  )
}

/** A territory is a border territory if it could attack (equivalently, be attacked by) at least one enemy territory. */
export function isBorderTerritory(gameState: GameState, controller: GameController, territory: string): boolean {
  return getAttackableTerritories(gameState, controller, territory).length > 0
}
