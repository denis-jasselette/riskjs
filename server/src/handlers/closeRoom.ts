import { Room } from '@server/rooms/Room'

import { HandlerContext } from './context'

export function closeRoom(ctx: HandlerContext, room: Room, reason: string): void {
  room.broadcast({ type: 'room_closed', payload: { reason } })
  for (const seat of room.seats) {
    if (seat.token) ctx.sessionStore.revoke(seat.token)
    seat.connection?.unbind()
  }
  ctx.roomStore.deleteRoom(room.code)
}
