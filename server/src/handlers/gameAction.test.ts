import { beforeEach, describe, expect, it } from 'vitest'

import { RoomStore } from '../rooms/RoomStore'
import { SessionStore } from '../session/SessionStore'
import { buildStartedRoom, buildTestGameState, send } from './testSupport'

describe('generic game-action validation gate', () => {
  let roomStore: RoomStore
  let sessionStore: SessionStore

  beforeEach(() => {
    roomStore = new RoomStore()
    sessionStore = new SessionStore()
  })

  it('rejects an action from a seat whose turn it is not', () => {
    const { room, blueConn } = buildStartedRoom(roomStore, buildTestGameState({ currentPlayer: 'red' }))

    send(roomStore, sessionStore, blueConn, { type: 'deploy', payload: { troops: 1, territory: 'C' } })

    expect(blueConn.lastOfType('error')?.payload.message).toMatch(/not your turn/i)
    expect(blueConn.lastOfType('action_event')).toBeUndefined()
    expect(room.gameState!.troops.find(t => t.territory === 'C')!.count).toBe(4)
  })

  it('rejects an illegal-shaped action (deploying to a territory the seat does not own)', () => {
    const { room, redConn } = buildStartedRoom(roomStore, buildTestGameState())

    send(roomStore, sessionStore, redConn, { type: 'deploy', payload: { troops: 1, territory: 'C' } })

    expect(redConn.lastOfType('error')).toBeDefined()
    expect(redConn.lastOfType('action_event')).toBeUndefined()
    expect(room.gameState!.troops.find(t => t.territory === 'C')!.count).toBe(4)
  })

  it('rejects a second in-flight action for the same seat (FR-012 single-flight)', () => {
    const { room, redConn } = buildStartedRoom(roomStore, buildTestGameState({ currentPhase: 'attack' }))
    // Simulate two messages arriving back-to-back before the first's handler
    // has cleared the in-flight flag, by setting it directly (handleGameAction
    // itself always clears it synchronously since there's no await, so this
    // models a hypothetical overlapping call rather than the normal case).
    room.seats[0].actionInFlight = true

    send(roomStore, sessionStore, redConn, {
      type: 'attack',
      payload: { attackingTroops: 3, attackingTerritory: 'B', defendingTerritory: 'C' },
    })

    expect(redConn.lastOfType('error')?.payload.message).toMatch(/already in progress/i)
    expect(redConn.lastOfType('action_event')).toBeUndefined()
  })

  it('rejects an action for an already-eliminated seat', () => {
    const { room, blueConn } = buildStartedRoom(roomStore, buildTestGameState({
      currentPlayer: 'blue',
      knockoutOrder: { blue: { playersRemaining: 2, turnAtKnockout: 1 } },
    }))

    send(roomStore, sessionStore, blueConn, { type: 'deploy', payload: { troops: 1, territory: 'C' } })

    expect(blueConn.lastOfType('error')?.payload.message).toMatch(/eliminated/i)
    expect(room.gameState!.troops.find(t => t.territory === 'C')!.count).toBe(4)
  })

  it('rejects an action once the game has already ended', () => {
    const { room, redConn } = buildStartedRoom(roomStore, buildTestGameState({ gameOver: true }))

    send(roomStore, sessionStore, redConn, { type: 'deploy', payload: { troops: 1, territory: 'A' } })

    expect(redConn.lastOfType('error')?.payload.message).toMatch(/ended/i)
    expect(room.gameState!.troops.find(t => t.territory === 'A')!.count).toBe(3)
  })

  it('rejects a malformed/unrecognized message type with a sender-only error', () => {
    const { room, redConn, blueConn } = buildStartedRoom(roomStore, buildTestGameState())

    send(roomStore, sessionStore, redConn, { type: 'not_a_real_message', payload: {} } as never)

    expect(redConn.lastOfType('error')).toBeDefined()
    expect(blueConn.sent).toHaveLength(0)
    expect(room.gameState).toBeDefined()
  })
})
