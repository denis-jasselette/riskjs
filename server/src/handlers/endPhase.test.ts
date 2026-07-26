import { beforeEach, describe, expect, it } from 'vitest'

import { RoomStore } from '../rooms/RoomStore'
import { SessionStore } from '../session/SessionStore'
import { buildStartedRoom, buildTestGameState, send } from './testSupport'

describe('end_phase handler', () => {
  let roomStore: RoomStore
  let sessionStore: SessionStore

  beforeEach(() => {
    roomStore = new RoomStore()
    sessionStore = new SessionStore()
  })

  it('advances the phase for every connected seat', () => {
    const { room, redConn, blueConn } = buildStartedRoom(roomStore, buildTestGameState({ currentPhase: 'attack' }))

    send(roomStore, sessionStore, redConn, { type: 'end_phase', payload: {} })

    const expectedEvent = { actionType: 'end_phase', by: 'red' }
    expect(redConn.lastOfType('action_event')?.payload).toEqual(expectedEvent)
    expect(blueConn.lastOfType('action_event')?.payload).toEqual(expectedEvent)
    expect(room.gameState!.currentPhase).toBe('fortify')
    expect(room.gameState!.currentPlayer).toBe('red')
  })

  it('rejects ending the deploy phase while troops remain to be placed', () => {
    const { room, redConn } = buildStartedRoom(roomStore, buildTestGameState({ currentPhase: 'deploy', troopsToDeploy: 2 }))

    send(roomStore, sessionStore, redConn, { type: 'end_phase', payload: {} })

    expect(redConn.lastOfType('error')).toBeDefined()
    expect(redConn.lastOfType('action_event')).toBeUndefined()
    expect(room.gameState!.currentPhase).toBe('deploy')
  })
})
