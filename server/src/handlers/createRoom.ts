import { RoomSettings } from '@/net/protocol/lobby'

import { HandlerContext } from './context'

const MIN_SEATS = 2
const MAX_SEATS = 6

export function isValidSettings(settings: RoomSettings | undefined): settings is RoomSettings {
  return !!settings
    && Number.isInteger(settings.seatCount)
    && settings.seatCount >= MIN_SEATS
    && settings.seatCount <= MAX_SEATS
}

export function handleCreateRoom(ctx: HandlerContext, payload: { nickname: string, settings: RoomSettings }): void {
  const { connection, roomStore, sessionStore } = ctx
  const nickname = payload.nickname?.trim()
  if (!nickname) {
    connection.send({ type: 'error', payload: { message: 'Nickname is required.' } })
    return
  }
  if (!isValidSettings(payload.settings)) {
    connection.send({ type: 'error', payload: { message: `Seat count must be between ${MIN_SEATS} and ${MAX_SEATS}.` } })
    return
  }

  const room = roomStore.createRoom({ ...payload.settings, blizzards: !!payload.settings.blizzards, fog: !!payload.settings.fog })
  const seat = room.seats[0]
  seat.nickname = nickname
  seat.isHost = true
  seat.connected = true
  seat.token = sessionStore.issue(room.code, seat.index)
  seat.connection = connection
  connection.bind(room.code, seat.index)

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
}
