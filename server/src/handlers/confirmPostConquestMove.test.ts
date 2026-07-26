import { beforeEach, describe, expect, it } from 'vitest'

import { RoomStore } from '../rooms/RoomStore'
import { SessionStore } from '../session/SessionStore'
import { buildStartedRoom, buildTestGameState, RED, send } from './testSupport'

describe('confirm_post_conquest_move handler', () => {
  let roomStore: RoomStore
  let sessionStore: SessionStore

  beforeEach(() => {
    roomStore = new RoomStore()
    sessionStore = new SessionStore()
  })

  it('moves the chosen number of troops into the conquered territory', () => {
    const { room, redConn, blueConn } = buildStartedRoom(roomStore, buildTestGameState({
      currentPhase: 'attack',
      pendingPostConquestMove: { sourceTerritory: 'B', conqueredTerritory: 'C', minTroopsToMove: 1 },
      troops: [
        { territory: 'A', count: 3, player: RED },
        { territory: 'B', count: 4, player: RED },
        { territory: 'C', count: 1, player: RED },
        { territory: 'D', count: 2, player: RED },
      ],
    }))

    send(roomStore, sessionStore, redConn, { type: 'confirm_post_conquest_move', payload: { troopsToMove: 2 } })

    const expectedEvent = { actionType: 'confirm_post_conquest_move', by: 'red', troopsToMove: 2 }
    expect(redConn.lastOfType('action_event')?.payload).toEqual(expectedEvent)
    expect(blueConn.lastOfType('action_event')?.payload).toEqual(expectedEvent)

    expect(room.gameState!.troops.find(t => t.territory === 'B')!.count).toBe(3)
    expect(room.gameState!.troops.find(t => t.territory === 'C')!.count).toBe(2)
    expect(room.gameState!.pendingPostConquestMove).toBeNull()
  })

  it('rejects a move count outside the valid range', () => {
    const { room, redConn } = buildStartedRoom(roomStore, buildTestGameState({
      currentPhase: 'attack',
      pendingPostConquestMove: { sourceTerritory: 'B', conqueredTerritory: 'C', minTroopsToMove: 1 },
      troops: [
        { territory: 'A', count: 3, player: RED },
        { territory: 'B', count: 4, player: RED },
        { territory: 'C', count: 1, player: RED },
        { territory: 'D', count: 2, player: RED },
      ],
    }))

    send(roomStore, sessionStore, redConn, { type: 'confirm_post_conquest_move', payload: { troopsToMove: 10 } })

    expect(redConn.lastOfType('error')).toBeDefined()
    expect(room.gameState!.pendingPostConquestMove).not.toBeNull()
  })
})
