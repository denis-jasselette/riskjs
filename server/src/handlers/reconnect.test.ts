import { beforeEach, describe, expect, it } from 'vitest'

import { RoomStore } from '../rooms/RoomStore'
import { SessionStore } from '../session/SessionStore'
import { buildStartedRoom, buildTestGameState, FakeConnection, send } from './testSupport'

const red = { currentUser: false, name: 'Red', color: 'red' as const, human: true, position: 0 }
const blue = { currentUser: false, name: 'Blue', color: 'blue' as const, human: true, position: 1 }

describe('reconnect during an active game', () => {
  let roomStore: RoomStore
  let sessionStore: SessionStore

  beforeEach(() => {
    roomStore = new RoomStore()
    sessionStore = new SessionStore()
  })

  it('does not replay a past attack as a new action_event on reconnect', () => {
    const { redConn, blueConn, tokens } = buildStartedRoom(roomStore, buildTestGameState({ currentPhase: 'attack' }), sessionStore)

    send(roomStore, sessionStore, redConn, {
      type: 'attack',
      payload: { attackingTroops: 3, attackingTerritory: 'B', defendingTerritory: 'C', diceCount: 3 },
    })
    expect(blueConn.lastOfType('action_event')).toBeDefined()

    const reconnecting = new FakeConnection()
    send(roomStore, sessionStore, reconnecting, { type: 'reconnect', payload: { token: tokens.blue } })

    expect(reconnecting.allOfType('action_event')).toHaveLength(0)
    expect(reconnecting.lastOfType('game_started')).toBeDefined()
  })

  it('sends a fog-of-war-filtered snapshot on reconnect, not the raw gameState', () => {
    const gameState = buildTestGameState({
      fogEnabled: true,
      // E is isolated in the test map -- not adjacent to anything blue owns,
      // so it stays outside blue's visible territories under fog.
      troops: [
        { territory: 'A', count: 3, player: red },
        { territory: 'B', count: 5, player: red },
        { territory: 'C', count: 4, player: blue },
        { territory: 'D', count: 2, player: blue },
        { territory: 'E', count: 6, player: red },
      ],
    })
    const { tokens } = buildStartedRoom(roomStore, gameState, sessionStore)

    const reconnecting = new FakeConnection()
    send(roomStore, sessionStore, reconnecting, { type: 'reconnect', payload: { token: tokens.blue } })

    const gameStarted = reconnecting.lastOfType('game_started')!
    // E is red's, isolated -- never adjacent to blue's C/D or their B border, so it's redacted.
    expect(gameStarted.payload.gameState.troops.find(t => t.territory === 'E')).toBeUndefined()
    // C is blue's own territory -- always visible to its own owner.
    expect(gameStarted.payload.gameState.troops.find(t => t.territory === 'C')).toBeDefined()
  })
})
