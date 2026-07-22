import { Room } from '@server/rooms/Room'
import { RoomStore } from '@server/rooms/RoomStore'
import { SessionStore } from '@server/session/SessionStore'
import { Connection } from '@server/ws/Connection'

export type HandlerContext = {
  connection: Connection
  roomStore: RoomStore
  sessionStore: SessionStore
}

export function requireBoundRoom(ctx: HandlerContext): Room | undefined {
  const { connection, roomStore } = ctx
  if (connection.roomCode === null) {
    connection.send({ type: 'error', payload: { message: 'Not currently in a room.' } })
    return undefined
  }
  const room = roomStore.getRoom(connection.roomCode)
  if (!room) {
    connection.send({ type: 'error', payload: { message: 'Room no longer exists.' } })
    return undefined
  }
  return room
}

export function requireHostRoom(ctx: HandlerContext): Room | undefined {
  const room = requireBoundRoom(ctx)
  if (!room) return undefined
  const seat = room.seats[ctx.connection.seatIndex!]
  if (!seat?.isHost) {
    ctx.connection.send({ type: 'error', payload: { message: 'Only the host can do that.' } })
    return undefined
  }
  return room
}
