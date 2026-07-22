import { closeRoom } from './closeRoom'
import { HandlerContext, requireBoundRoom } from './context'

export function handleLeaveRoom(ctx: HandlerContext): void {
  const room = requireBoundRoom(ctx)
  if (!room) return
  const seat = room.seats[ctx.connection.seatIndex!]

  if (seat.isHost) {
    closeRoom(ctx, room, 'The host left the room.')
    return
  }

  if (seat.token) ctx.sessionStore.revoke(seat.token)
  room.resetSeat(seat.index)
  ctx.connection.unbind()
  room.touch()

  room.broadcast({
    type: 'lobby_state',
    payload: { seats: room.publicSeats(), settings: room.settings, hostSeatIndex: room.hostSeatIndex },
  })
}
