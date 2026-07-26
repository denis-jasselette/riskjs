import GameState from '@/models/GameState'
import MapConfig from '@/models/MapConfig'
import type PlayerConfig from '@/models/PlayerConfig'
import { ClientGameMessage, ServerGameMessage } from '@/net/protocol/game'
import { ClientMessage, ServerMessage } from '@/net/protocol/lobby'

import { Room } from '../rooms/Room'
import { RoomStore } from '../rooms/RoomStore'
import { SessionStore } from '../session/SessionStore'
import { HandlerContext } from './context'
import { dispatch } from './index'

export class FakeConnection {
  roomCode: string | null = null
  seatIndex: number | null = null
  sent: (ServerMessage | ServerGameMessage)[] = []

  send(message: ServerMessage | ServerGameMessage): void {
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

  lastOfType<T extends (ServerMessage | ServerGameMessage)['type']>(type: T): Extract<ServerMessage | ServerGameMessage, { type: T }> | undefined {
    return this.sent.filter((m): m is Extract<ServerMessage | ServerGameMessage, { type: T }> => m.type === type).at(-1)
  }

  allOfType<T extends (ServerMessage | ServerGameMessage)['type']>(type: T): Extract<ServerMessage | ServerGameMessage, { type: T }>[] {
    return this.sent.filter((m): m is Extract<ServerMessage | ServerGameMessage, { type: T }> => m.type === type)
  }
}

export function send(roomStore: RoomStore, sessionStore: SessionStore, connection: FakeConnection, message: ClientMessage | ClientGameMessage): void {
  const ctx: HandlerContext = { connection: connection as never, roomStore, sessionStore }
  dispatch(ctx, message)
}

// Minimal, fully-known map for deterministic handler tests:
//   A -- B -- C
//        |
//        D
// red owns A (3 troops), B (5 troops); blue owns C (4), D (2). This gives a
// same-owner fortify pair (A/B), an attack pair (B -> C, different owners,
// adjacent), and an isolated-from-fog-visibility shape is not needed here
// (see GameStateView.test.ts for fog specifically) -- this map exists purely
// to exercise handler validation/broadcast wiring against a small, stable
// board instead of the real shuffled classic map.
export function buildTestMapConfig(): MapConfig {
  const config = new MapConfig()
  config.name = 'TestMap'
  config.territories = {
    A: { coords: { x: 0, y: 0 }, continent: 'North', path: '', adjacency: ['B'] },
    B: { coords: { x: 1, y: 0 }, continent: 'North', path: '', adjacency: ['A', 'C', 'D'] },
    C: { coords: { x: 2, y: 0 }, continent: 'North', path: '', adjacency: ['B'] },
    D: { coords: { x: 1, y: 1 }, continent: 'North', path: '', adjacency: ['B'] },
    // Isolated -- unused by the 2-seat scenarios above; gives a 3rd seat
    // (US2's shared-outcome test) somewhere to own troops without
    // interfering with the A/B/C/D attack/fortify pairs.
    E: { coords: { x: 5, y: 5 }, continent: 'South', path: '', adjacency: [] },
  }
  config.cards = { wildcards: 2, territories: { A: 'infantry', B: 'cavalry', C: 'artillery', D: 'infantry' } }
  config.blizzards = 0
  return config
}

export const RED: PlayerConfig = { currentUser: false, name: 'Red', color: 'red', human: true, position: 0 }
export const BLUE: PlayerConfig = { currentUser: false, name: 'Blue', color: 'blue', human: true, position: 1 }
export const GREEN: PlayerConfig = { currentUser: false, name: 'Green', color: 'green', human: true, position: 2 }

export function buildTestGameState(overrides: Partial<GameState> = {}): GameState {
  const gs = new GameState()
  gs.gameOver = false
  gs.mapConfig = buildTestMapConfig()
  gs.playerConfigs = [RED, BLUE]
  gs.currentPlayer = 'red'
  gs.currentPhase = 'deploy'
  gs.troopsToDeploy = 3
  gs.troops = [
    { territory: 'A', count: 3, player: RED },
    { territory: 'B', count: 5, player: RED },
    { territory: 'C', count: 4, player: BLUE },
    { territory: 'D', count: 2, player: BLUE },
  ]
  gs.playerCards = { red: [], blue: [] }
  gs.deck = []
  return Object.assign(gs, overrides)
}

// Builds a started 2-seat room (red = seat 0/host, blue = seat 1) with both
// connections bound and bypasses the lobby flow (create_room/join_room/
// start_game) so tests get a small, deterministic map instead of the real
// shuffled classic map.
export function buildStartedRoom(roomStore: RoomStore, gameState: GameState = buildTestGameState(), sessionStore?: SessionStore): { room: Room, redConn: FakeConnection, blueConn: FakeConnection, tokens: Record<string, string> } {
  const { room, connections, tokens } = buildStartedRoomWithSeats(roomStore, ['red', 'blue'], gameState, sessionStore)
  return { room, redConn: connections.red, blueConn: connections.blue, tokens }
}

// General N-seat variant (e.g. for US2's 3+-viewer shared-outcome test) --
// seat 0 is host, every seat gets a bound, connected FakeConnection keyed by
// its assigned color. Issues a real session token per seat when sessionStore
// is provided, so reconnect() can be exercised against these rooms too.
export function buildStartedRoomWithSeats(roomStore: RoomStore, colors: string[], gameState: GameState, sessionStore?: SessionStore): { room: Room, connections: Record<string, FakeConnection>, tokens: Record<string, string> } {
  const room = roomStore.createRoom({ seatCount: colors.length, blizzards: false, fog: false })
  const connections: Record<string, FakeConnection> = {}
  const tokens: Record<string, string> = {}

  colors.forEach((color, index) => {
    const connection = new FakeConnection()
    const token = sessionStore?.issue(room.code, index) ?? null
    room.seats[index].nickname = `Player ${index + 1}`
    room.seats[index].connected = true
    room.seats[index].isHost = index === 0
    room.seats[index].color = color as PlayerConfig['color']
    room.seats[index].connection = connection as never
    room.seats[index].token = token
    connection.bind(room.code, index)
    connections[color] = connection
    if (token) tokens[color] = token
  })

  room.status = 'started'
  room.gameState = gameState

  return { room, connections, tokens }
}
