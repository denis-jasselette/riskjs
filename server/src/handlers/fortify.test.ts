import { beforeEach, describe, expect, it } from 'vitest'

import { RoomStore } from '../rooms/RoomStore'
import { SessionStore } from '../session/SessionStore'
import { buildStartedRoom, buildTestGameState, send } from './testSupport'

describe('fortify handler', () => {
  let roomStore: RoomStore
  let sessionStore: SessionStore

  beforeEach(() => {
    roomStore = new RoomStore()
    sessionStore = new SessionStore()
  })

  it('moves troops between connected owned territories, broadcasts it, and ends the turn', () => {
    const { room, redConn, blueConn } = buildStartedRoom(roomStore, buildTestGameState({ currentPhase: 'fortify' }))

    send(roomStore, sessionStore, redConn, {
      type: 'fortify',
      payload: { troops: 2, fromTerritory: 'B', toTerritory: 'A' },
    })

    const expectedEvent = { actionType: 'fortify', by: 'red', troops: 2, fromTerritory: 'B', toTerritory: 'A' }
    expect(redConn.lastOfType('action_event')?.payload).toEqual(expectedEvent)
    expect(blueConn.lastOfType('action_event')?.payload).toEqual(expectedEvent)

    expect(room.gameState!.troops.find(t => t.territory === 'A')!.count).toBe(5)
    expect(room.gameState!.troops.find(t => t.territory === 'B')!.count).toBe(3)
    expect(room.gameState!.currentPlayer).toBe('blue')
    expect(room.gameState!.currentPhase).toBe('deploy')
  })

  it('rejects fortifying to a territory not connected under the same ownership', () => {
    const { room, redConn } = buildStartedRoom(roomStore, buildTestGameState({ currentPhase: 'fortify' }))

    send(roomStore, sessionStore, redConn, {
      type: 'fortify',
      payload: { troops: 1, fromTerritory: 'A', toTerritory: 'C' },
    })

    expect(redConn.lastOfType('error')).toBeDefined()
    expect(redConn.lastOfType('action_event')).toBeUndefined()
    expect(room.gameState!.currentPlayer).toBe('red')
  })
})
