import { RoomSettings } from '@/net/protocol/lobby'

import { isValidSettings } from './createRoom'
import { HandlerContext, requireHostRoom } from './context'

export function handleUpdateSettings(ctx: HandlerContext, payload: { settings: RoomSettings }): void {
  const room = requireHostRoom(ctx)
  if (!room) return
  if (room.status === 'started') {
    ctx.connection.send({ type: 'error', payload: { message: 'Game already started.' } })
    return
  }
  if (!isValidSettings(payload.settings)) {
    ctx.connection.send({ type: 'error', payload: { message: 'Seat count must be between 2 and 6.' } })
    return
  }

  const resize = room.resizeSeatCount(payload.settings.seatCount)
  if (!resize.ok) {
    ctx.connection.send({ type: 'error', payload: { message: resize.error } })
    return
  }
  room.settings = { ...room.settings, blizzards: !!payload.settings.blizzards, fog: !!payload.settings.fog }
  room.touch()

  room.broadcast({
    type: 'lobby_state',
    payload: { seats: room.publicSeats(), settings: room.settings, hostSeatIndex: room.hostSeatIndex },
  })
}
