import { HandlerContext } from './context'

export function handleReconnect(ctx: HandlerContext, payload: { token: string }): void {
  const { connection, roomStore, sessionStore } = ctx
  const ref = payload.token ? sessionStore.resolve(payload.token) : undefined
  if (!ref) {
    connection.send({ type: 'error', payload: { message: 'Session expired or not found.' } })
    return
  }
  const room = roomStore.getRoom(ref.roomCode)
  const seat = room?.seats[ref.seatIndex]
  if (!room || !seat || seat.token !== payload.token) {
    connection.send({ type: 'error', payload: { message: 'Session expired or not found.' } })
    return
  }

  seat.connected = true
  seat.connection = connection
  connection.bind(room.code, seat.index)
  room.touch()

  connection.send({
    type: 'joined',
    payload: {
      code: room.code,
      token: payload.token,
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

  if (room.status === 'started' && room.gameState) {
    connection.send({
      type: 'game_started',
      payload: { seats: room.startedSeats(), settings: room.settings, gameState: room.gameState },
    })
  }
}
