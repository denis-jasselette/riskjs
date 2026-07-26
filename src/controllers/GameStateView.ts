import { MapController } from '@/controllers/MapController'
import Card from '@/models/Card'
import GameState from '@/models/GameState'
import { PlayerColor } from '@/models/PlayerConfig'

// Opaque stand-in for a hidden card: same shape as a real Card, but never
// the real type/territory, so a redacted hand can't leak identity through
// its length-preserving placeholders.
const HIDDEN_CARD: Card = { type: 'wildcard' }

// Produces the per-seat filtered view the server sends as `state_snapshot`:
// same GameState shape as the input, with fog-of-war-hidden territories and
// every other player's real card identities/deck order redacted. Never
// mutates the input -- callers (server handlers) keep the authoritative,
// unfiltered room.gameState and call this fresh per connected seat.
export function filterGameStateForSeat(gameState: GameState, mapController: MapController, viewerColor: PlayerColor): GameState {
  const visibleTerritories = gameState.fogEnabled ? new Set(mapController.getVisibleTerritories(viewerColor)) : null

  const troops = visibleTerritories
    ? gameState.troops.filter(troop => visibleTerritories.has(troop.territory))
    : gameState.troops

  const playerCards = Object.fromEntries(
    Object.entries(gameState.playerCards).map(([color, hand]) => [
      color,
      color === viewerColor ? hand : hand.map(() => HIDDEN_CARD),
    ]),
  )

  return {
    ...gameState,
    troops,
    playerCards,
    deck: [],
  }
}
