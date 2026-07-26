import { beforeEach, describe, expect, it } from 'vitest'

import { RoomStore } from '../rooms/RoomStore'
import { SessionStore } from '../session/SessionStore'
import { buildStartedRoom, buildTestGameState, send } from './testSupport'

describe('deploy handler', () => {
  let roomStore: RoomStore
  let sessionStore: SessionStore

  beforeEach(() => {
    roomStore = new RoomStore()
    sessionStore = new SessionStore()
  })

  it('deploys troops to an owned territory and broadcasts the outcome to both players', () => {
    const { redConn, blueConn } = buildStartedRoom(roomStore)

    send(roomStore, sessionStore, redConn, { type: 'deploy', payload: { troops: 3, territory: 'A' } })

    const redEvent = redConn.lastOfType('action_event')
    const blueEvent = blueConn.lastOfType('action_event')
    expect(redEvent?.payload).toEqual({ actionType: 'deploy', by: 'red', troops: 3, territory: 'A' })
    expect(blueEvent?.payload).toEqual(redEvent?.payload)

    const redSnapshot = redConn.lastOfType('state_snapshot')!
    const troopA = redSnapshot.payload.gameState.troops.find(t => t.territory === 'A')
    expect(troopA?.count).toBe(6)
    expect(redSnapshot.payload.gameState.troopsToDeploy).toBe(0)
    expect(blueConn.lastOfType('state_snapshot')).toBeDefined()
  })

  it('rejects deploying more troops than are available', () => {
    const { room, redConn } = buildStartedRoom(roomStore, buildTestGameState({ troopsToDeploy: 2 }))

    send(roomStore, sessionStore, redConn, { type: 'deploy', payload: { troops: 3, territory: 'A' } })

    expect(redConn.lastOfType('error')).toBeDefined()
    expect(redConn.lastOfType('action_event')).toBeUndefined()
    expect(room.gameState!.troopsToDeploy).toBe(2)
  })
})
