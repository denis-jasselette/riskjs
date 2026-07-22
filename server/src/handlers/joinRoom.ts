import { HandlerContext } from './context'

export function handleJoinRoom(ctx: HandlerContext, payload: { code: string, nickname: string }): void {
  const { connection, roomStore, sessionStore } = ctx
  const nickname = payload.nickname?.trim()
  if (!nickname) {
    connection.send({ type: 'error', payload: { message: 'Nickname is required.' } })
    return
  }

  const room = roomStore.getRoom(payload.code?.trim().toUpperCase())
  if (!room) {
    connection.send({ type: 'error', payload: { message: 'Room not found.' } })
    return
  }
  if (room.status === 'started') {
    connection.send({ type: 'error', payload: { message: 'This room has already started.' } })
    return
  }
  const seat = room.findOpenSeat()
  if (!seat) {
    connection.send({ type: 'error', payload: { message: 'Room is full.' } })
    return
  }

  seat.nickname = nickname
  seat.connected = true
  seat.token = sessionStore.issue(room.code, seat.index)
  seat.connection = connection
  connection.bind(room.code, seat.index)
  room.touch()

  connection.send({
    type: 'joined',
    payload: {
      code: room.code,
      token: seat.token,
      seatIndex: seat.index,
      seats: room.publicSeats(),
      settings: room.settings,
      hostSeatIndex: room.hostSeatIndex,
    },
  })
  room.broadcast({
    type: 'lobby_state',
    payload: { seats: room.publicSeats(), settings: room.settings, hostSeatIndex: room.hostSeatIndex },
  })
}
