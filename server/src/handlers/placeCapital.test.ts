import { beforeEach, describe, expect, it } from 'vitest'

import { RoomStore } from '../rooms/RoomStore'
import { SessionStore } from '../session/SessionStore'
import { buildStartedRoom, buildTestGameState, send } from './testSupport'

describe('place_capital handler', () => {
  let roomStore: RoomStore
  let sessionStore: SessionStore

  beforeEach(() => {
    roomStore = new RoomStore()
    sessionStore = new SessionStore()
  })

  it('assigns the chosen territory as the capital, grants +2 troops, and advances to the next player', () => {
    const { room, redConn, blueConn } = buildStartedRoom(roomStore, buildTestGameState({
      capitalMode: true,
      capitals: {},
      currentPhase: 'capitalDeploy',
    }))

    send(roomStore, sessionStore, redConn, { type: 'place_capital', payload: { territory: 'A' } })

    const expectedEvent = { actionType: 'place_capital', by: 'red', territory: 'A' }
    expect(redConn.lastOfType('action_event')?.payload).toEqual(expectedEvent)
    expect(blueConn.lastOfType('action_event')?.payload).toEqual(expectedEvent)

    expect(room.gameState!.capitals.A).toBe('red')
    expect(room.gameState!.troops.find(t => t.territory === 'A')!.count).toBe(5)
    expect(room.gameState!.currentPlayer).toBe('blue')
  })

  it('rejects placing a capital on a territory not owned by the acting player', () => {
    const { room, redConn } = buildStartedRoom(roomStore, buildTestGameState({
      capitalMode: true,
      capitals: {},
      currentPhase: 'capitalDeploy',
    }))

    send(roomStore, sessionStore, redConn, { type: 'place_capital', payload: { territory: 'C' } })

    expect(redConn.lastOfType('error')).toBeDefined()
    expect(room.gameState!.capitals.C).toBeUndefined()
  })
})
