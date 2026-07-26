import { Room, RoomSeat } from '@server/rooms/Room'

import { HandlerContext, requireBoundRoom } from '@/../server/src/handlers/context'
import GameController from '@/controllers/GameController'
import { filterGameStateForSeat } from '@/controllers/GameStateView'
import { PlayerColor } from '@/models/PlayerConfig'
import { ActionEventPayload, GameActionType } from '@/net/protocol/game'

export type GameActionOptions = {
  actionType: GameActionType
  /** Whether this action requires the sending seat to be gameState.currentPlayer. Only resign (013: "at any time, regardless of whose turn") opts out. */
  requiresTurn?: boolean
  isLegal: (controller: GameController, seat: RoomSeat) => boolean
  apply: (controller: GameController, seat: RoomSeat) => GameController
  buildEvent: (controller: GameController, seat: RoomSeat) => ActionEventPayload
}

function sendError(ctx: HandlerContext, message: string): void {
  ctx.connection.send({ type: 'error', payload: { message } })
}

// Sends every connected seat its own fog-of-war/hand-redacted view of the
// room's current, authoritative gameState.
export function broadcastSnapshots(room: Room): void {
  if (!room.gameState) return
  const mapController = new GameController(room.gameState).mapController
  for (const seat of room.seats) {
    if (!seat.connection || !seat.color) continue
    const snapshot = filterGameStateForSeat(room.gameState, mapController, seat.color)
    seat.connection.send({ type: 'state_snapshot', payload: { gameState: snapshot } })
  }
}

// Shared entry point for every turn-action handler (deploy/attack/fortify/
// trade_cards/end_phase/place_capital/resign/confirm_post_conquest_move):
// validates the sender is allowed to act right now, applies the action via a
// fresh GameController built from room.gameState (replacing room.gameState
// with the controller's returned .gameState -- see research.md's shallow-copy
// gotcha), then broadcasts the shared action_event + each seat's own
// state_snapshot, followed by any elimination_notice/game_over the action
// produced. Rejections send `error` to the sender only, with room.gameState
// left completely untouched.
export function handleGameAction(ctx: HandlerContext, options: GameActionOptions): void {
  const room = requireBoundRoom(ctx)
  if (!room) return

  if (room.status !== 'started' || !room.gameState) {
    sendError(ctx, 'Game has not started.')
    return
  }

  const seat = room.seats[ctx.connection.seatIndex!]
  if (!seat.color) {
    sendError(ctx, 'Seat has no assigned color.')
    return
  }
  if (room.gameState.gameOver) {
    sendError(ctx, 'The game has already ended.')
    return
  }
  if (seat.color in room.gameState.knockoutOrder) {
    sendError(ctx, 'You have been eliminated.')
    return
  }
  if (seat.actionInFlight) {
    sendError(ctx, 'Another action is already in progress.')
    return
  }
  const requiresTurn = options.requiresTurn ?? true
  if (requiresTurn && room.gameState.currentPlayer !== seat.color) {
    sendError(ctx, 'It is not your turn.')
    return
  }

  const controller = new GameController(room.gameState)
  if (!options.isLegal(controller, seat)) {
    sendError(ctx, 'That action is not currently allowed.')
    return
  }

  seat.actionInFlight = true
  const knockedOutBefore = new Set(Object.keys(room.gameState.knockoutOrder))

  const result = options.apply(controller, seat)
  const event = options.buildEvent(result, seat)
  room.gameState = result.gameState
  seat.actionInFlight = false

  room.broadcast({ type: 'action_event', payload: event })
  broadcastSnapshots(room)

  const newlyKnockedOut = Object.keys(room.gameState.knockoutOrder).filter(color => !knockedOutBefore.has(color))
  for (const color of newlyKnockedOut) {
    const eliminatedSeat = room.seats.find(s => s.color === color)
    eliminatedSeat?.connection?.send({ type: 'elimination_notice', payload: { player: color as PlayerColor } })
  }

  if (room.gameState.gameOver) {
    const finalController = new GameController(room.gameState)
    room.broadcast({
      type: 'game_over',
      payload: {
        winner: finalController.getWinner() as PlayerColor | undefined,
        standings: finalController.getStandings(),
      },
    })
  }
}
