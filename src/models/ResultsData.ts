import PlayerConfig from '@/models/PlayerConfig'

export type PlayerStanding = {
  player: PlayerConfig
  rank: number
  /** null when eliminated */
  territories: number | null
  /** null when eliminated */
  troops: number | null
  /** turn they were knocked out, or total game length for the winner */
  turnsAlive: number
  /**
   * Pre-game Glicko-2 rating.
   * undefined for active players mid-game (to avoid leaking standing info).
   */
  rating?: number
  /**
   * Rating delta from this game.
   * Only set once the game is over for all players.
   */
  ratingDelta?: number
}

export type TurnSnapshot = {
  turn: number
  troops: Partial<Record<string, number>>
  territories: Partial<Record<string, number>>
}
