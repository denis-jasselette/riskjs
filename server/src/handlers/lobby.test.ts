import { beforeEach, describe, expect, it } from 'vitest'

import { ClientMessage, ServerMessage } from '@/net/protocol/lobby'

import { RoomStore } from '../rooms/RoomStore'
import { SessionStore } from '../session/SessionStore'
import { HandlerContext } from './context'
import { dispatch } from './index'

const settings = { seatCount: 2, blizzards: false, fog: false }

class FakeConnection {
  roomCode: string | null = null
  seatIndex: number | null = null
  sent: ServerMessage[] = []

  send(message: ServerMessage): void {
    this.sent.push(message)
  }

  bind(roomCode: string, seatIndex: number): void {
    this.roomCode = roomCode
    this.seatIndex = seatIndex
  }

  unbind(): void {
    this.roomCode = null
    this.seatIndex = null
  }

  lastOfType<T extends ServerMessage['type']>(type: T): Extract<ServerMessage, { type: T }> | undefined {
    return this.sent.filter((m): m is Extract<ServerMessage, { type: T }> => m.type === type).at(-1)
  }
}

function send(roomStore: RoomStore, sessionStore: SessionStore, connection: FakeConnection, message: ClientMessage) {
  const ctx: HandlerContext = { connection: connection as never, roomStore, sessionStore }
  dispatch(ctx, message)
}

describe('lobby handlers', () => {
  let roomStore: RoomStore
  let sessionStore: SessionStore

  beforeEach(() => {
    roomStore = new RoomStore()
    sessionStore = new SessionStore()
  })

  it('creates a room and joins it, syncing the roster to both sides', () => {
    const host = new FakeConnection()
    send(roomStore, sessionStore, host, { type: 'create_room', payload: { nickname: 'Alice', settings } })
    const joined = host.lastOfType('joined')!
    expect(joined.payload.hostSeatIndex).toBe(0)
    expect(joined.payload.seats).toHaveLength(2)

    const guest = new FakeConnection()
    send(roomStore, sessionStore, guest, { type: 'join_room', payload: { code: joined.payload.code, nickname: 'Bob' } })
    expect(guest.lastOfType('joined')?.payload.seatIndex).toBe(1)

    const hostRoster = host.lastOfType('lobby_state')!
    expect(hostRoster.payload.seats.map(s => s.nickname)).toEqual(['Alice', 'Bob'])
  })

  it('rejects joining a full room', () => {
    const host = new FakeConnection()
    send(roomStore, sessionStore, host, { type: 'create_room', payload: { nickname: 'Alice', settings } })
    const code = host.lastOfType('joined')!.payload.code

    const guest = new FakeConnection()
    send(roomStore, sessionStore, guest, { type: 'join_room', payload: { code, nickname: 'Bob' } })

    const latecomer = new FakeConnection()
    send(roomStore, sessionStore, latecomer, { type: 'join_room', payload: { code, nickname: 'Carol' } })
    expect(latecomer.lastOfType('error')?.payload.message).toMatch(/full/i)
  })

  it('rejects joining once the game has started', () => {
    const host = new FakeConnection()
    send(roomStore, sessionStore, host, { type: 'create_room', payload: { nickname: 'Alice', settings } })
    const code = host.lastOfType('joined')!.payload.code
    send(roomStore, sessionStore, host, { type: 'start_game', payload: {} })

    const guest = new FakeConnection()
    send(roomStore, sessionStore, guest, { type: 'join_room', payload: { code, nickname: 'Bob' } })
    expect(guest.lastOfType('error')?.payload.message).toMatch(/started/i)
  })

  it('rejects update_settings and start_game from a non-host seat', () => {
    const host = new FakeConnection()
    send(roomStore, sessionStore, host, { type: 'create_room', payload: { nickname: 'Alice', settings } })
    const code = host.lastOfType('joined')!.payload.code

    const guest = new FakeConnection()
    send(roomStore, sessionStore, guest, { type: 'join_room', payload: { code, nickname: 'Bob' } })

    send(roomStore, sessionStore, guest, { type: 'update_settings', payload: { settings: { ...settings, fog: true } } })
    expect(guest.lastOfType('error')?.payload.message).toMatch(/host/i)

    send(roomStore, sessionStore, guest, { type: 'start_game', payload: {} })
    expect(guest.lastOfType('error')?.payload.message).toMatch(/host/i)
  })

  it('rejects shrinking seat count below claimed seats', () => {
    const roomySettings = { ...settings, seatCount: 6 }
    const host = new FakeConnection()
    send(roomStore, sessionStore, host, { type: 'create_room', payload: { nickname: 'Alice', settings: roomySettings } })
    const code = host.lastOfType('joined')!.payload.code
    const guest1 = new FakeConnection()
    send(roomStore, sessionStore, guest1, { type: 'join_room', payload: { code, nickname: 'Bob' } })
    const guest2 = new FakeConnection()
    send(roomStore, sessionStore, guest2, { type: 'join_room', payload: { code, nickname: 'Carol' } })

    send(roomStore, sessionStore, host, { type: 'update_settings', payload: { settings: { ...roomySettings, seatCount: 2 } } })
    expect(host.lastOfType('error')?.payload.message).toMatch(/claimed/i)
  })

  it('starts the game with a placeholder for the open seat and broadcasts it', () => {
    const host = new FakeConnection()
    send(roomStore, sessionStore, host, { type: 'create_room', payload: { nickname: 'Alice', settings } })

    send(roomStore, sessionStore, host, { type: 'start_game', payload: {} })
    const started = host.lastOfType('game_started')!
    expect(started.payload.seats.map(s => s.nickname)).toEqual(['Alice', null])
    expect(started.payload.gameState.playerConfigs).toHaveLength(2)
    expect(started.payload.gameState.playerConfigs[1].human).toBe(false)
  })

  it('reconnects into the same seat using the issued token, including post-start state', () => {
    const host = new FakeConnection()
    send(roomStore, sessionStore, host, { type: 'create_room', payload: { nickname: 'Alice', settings } })
    const token = host.lastOfType('joined')!.payload.token
    send(roomStore, sessionStore, host, { type: 'start_game', payload: {} })

    const reconnecting = new FakeConnection()
    send(roomStore, sessionStore, reconnecting, { type: 'reconnect', payload: { token } })
    expect(reconnecting.lastOfType('joined')?.payload.seatIndex).toBe(0)
    expect(reconnecting.lastOfType('game_started')).toBeDefined()
  })

  it('rejects reconnecting with an unknown token', () => {
    const connection = new FakeConnection()
    send(roomStore, sessionStore, connection, { type: 'reconnect', payload: { token: 'bogus' } })
    expect(connection.lastOfType('error')?.payload.message).toMatch(/expired|not found/i)
  })

  it('deletes the room and kicks everyone out when the host leaves before starting', () => {
    const host = new FakeConnection()
    send(roomStore, sessionStore, host, { type: 'create_room', payload: { nickname: 'Alice', settings } })
    const code = host.lastOfType('joined')!.payload.code
    const guest = new FakeConnection()
    send(roomStore, sessionStore, guest, { type: 'join_room', payload: { code, nickname: 'Bob' } })

    send(roomStore, sessionStore, host, { type: 'leave_room', payload: {} })

    expect(host.lastOfType('room_closed')?.payload.reason).toMatch(/host left/i)
    expect(guest.lastOfType('room_closed')?.payload.reason).toMatch(/host left/i)
    expect(roomStore.getRoom(code)).toBeUndefined()

    const latecomer = new FakeConnection()
    send(roomStore, sessionStore, latecomer, { type: 'join_room', payload: { code, nickname: 'Carol' } })
    expect(latecomer.lastOfType('error')?.payload.message).toMatch(/not found/i)
  })

  it('reopens the seat when a non-host leaves, without affecting the rest of the room', () => {
    const host = new FakeConnection()
    send(roomStore, sessionStore, host, { type: 'create_room', payload: { nickname: 'Alice', settings: { ...settings, seatCount: 3 } } })
    const code = host.lastOfType('joined')!.payload.code
    const guest = new FakeConnection()
    send(roomStore, sessionStore, guest, { type: 'join_room', payload: { code, nickname: 'Bob' } })

    send(roomStore, sessionStore, guest, { type: 'leave_room', payload: {} })

    expect(guest.sent.some(m => m.type === 'room_closed')).toBe(false)
    const roster = host.lastOfType('lobby_state')!.payload.seats
    expect(roster.map(s => s.nickname)).toEqual(['Alice', null, null])
    expect(roomStore.getRoom(code)).toBeDefined()

    const rejoiner = new FakeConnection()
    send(roomStore, sessionStore, rejoiner, { type: 'join_room', payload: { code, nickname: 'Dave' } })
    expect(rejoiner.lastOfType('joined')?.payload.seatIndex).toBe(1)
  })

  it('rejects end_game from a non-host seat', () => {
    const host = new FakeConnection()
    send(roomStore, sessionStore, host, { type: 'create_room', payload: { nickname: 'Alice', settings } })
    const code = host.lastOfType('joined')!.payload.code
    const guest = new FakeConnection()
    send(roomStore, sessionStore, guest, { type: 'join_room', payload: { code, nickname: 'Bob' } })

    send(roomStore, sessionStore, guest, { type: 'end_game', payload: {} })
    expect(guest.lastOfType('error')?.payload.message).toMatch(/host/i)
    expect(roomStore.getRoom(code)).toBeDefined()
  })

  it('deletes the room and notifies everyone when the host kills a started game', () => {
    const host = new FakeConnection()
    send(roomStore, sessionStore, host, { type: 'create_room', payload: { nickname: 'Alice', settings } })
    const code = host.lastOfType('joined')!.payload.code
    const guest = new FakeConnection()
    send(roomStore, sessionStore, guest, { type: 'join_room', payload: { code, nickname: 'Bob' } })
    send(roomStore, sessionStore, host, { type: 'start_game', payload: {} })

    send(roomStore, sessionStore, host, { type: 'end_game', payload: {} })

    expect(host.lastOfType('room_closed')?.payload.reason).toMatch(/ended the game/i)
    expect(guest.lastOfType('room_closed')?.payload.reason).toMatch(/ended the game/i)
    expect(roomStore.getRoom(code)).toBeUndefined()
  })
})
