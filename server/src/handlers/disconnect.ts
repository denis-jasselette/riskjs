import { RoomStore } from '@server/rooms/RoomStore'
import { Connection } from '@server/ws/Connection'

export function handleDisconnect(connection: Connection, roomStore: RoomStore): void {
  if (connection.roomCode === null || connection.seatIndex === null) return
  const room = roomStore.getRoom(connection.roomCode)
  if (!room) return
  const seat = room.seats[connection.seatIndex]
  if (!seat || seat.connection !== connection) return

  seat.connected = false
  seat.connection = null
  room.touch()
  room.broadcast({
    type: 'lobby_state',
    payload: { seats: room.publicSeats(), settings: room.settings, hostSeatIndex: room.hostSeatIndex },
  })
}
