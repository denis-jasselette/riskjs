import type GameState from '@/models/GameState'

export interface DeployAllocation {
  territory: string
  troops: number
}

/** A full distribution of the current turn's troopsToDeploy pool across the bot's owned territories. */
export interface DeployAction {
  allocations: DeployAllocation[]
}

export interface AttackAction {
  from: string
  to: string
  troops: number
}

export interface FortifyAction {
  from: string
  to: string
  troops: number
}

/**
 * A bot's decision-making strategy. Implementations are pure: given a `GameState`
 * (or, once a server exists to enforce it, whatever fog-of-war-filtered slice of it
 * the acting seat would legitimately see — see docs/SPEC.md, "Bot AI") and the color
 * identifying the acting player (matching `GameController`/`MapController`'s own
 * convention of identifying players by `PlayerConfig.color`), return the action to
 * take for the current phase. No I/O, no networking, no mutation of the state passed
 * in — wiring these decisions into a live protocol/server is separate, later work
 * (#53).
 *
 * `decideCardTrade` is intentionally omitted from this interface: the card-trading
 * mechanic doesn't exist anywhere in this codebase yet (no `cards` field on
 * `GameState`/`TroopState`, no trade-in logic in `GameController`). Follow-up once
 * that mechanic lands.
 */
export interface BotAgent {
  decideDeploy(gameState: GameState, player: string): DeployAction
  decideAttack(gameState: GameState, player: string): AttackAction | null
  decideFortify(gameState: GameState, player: string): FortifyAction | null
}
