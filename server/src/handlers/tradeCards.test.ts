import { beforeEach, describe, expect, it } from 'vitest'

import Card from '@/models/Card'

import { RoomStore } from '../rooms/RoomStore'
import { SessionStore } from '../session/SessionStore'
import { buildStartedRoom, buildTestGameState, send } from './testSupport'

const redHand: Card[] = [
  { type: 'infantry', territory: 'A' },
  { type: 'cavalry' },
  { type: 'artillery' },
]

describe('trade_cards handler', () => {
  let roomStore: RoomStore
  let sessionStore: SessionStore

  beforeEach(() => {
    roomStore = new RoomStore()
    sessionStore = new SessionStore()
  })

  it('trades a valid set for bonus troops and broadcasts it', () => {
    const { room, redConn, blueConn } = buildStartedRoom(roomStore, buildTestGameState({
      playerCards: { red: [...redHand], blue: [] },
    }))

    send(roomStore, sessionStore, redConn, { type: 'trade_cards', payload: { cardIndices: [0, 1, 2] } })

    const expectedEvent = { actionType: 'trade_cards', by: 'red', cardIndices: [0, 1, 2], bonusTerritory: undefined }
    expect(redConn.lastOfType('action_event')?.payload).toEqual(expectedEvent)
    expect(blueConn.lastOfType('action_event')?.payload).toEqual(expectedEvent)

    expect(room.gameState!.playerCards.red).toHaveLength(0)
    expect(room.gameState!.tradeCount).toBe(1)
    expect(room.gameState!.troopsToDeploy).toBe(13) // starting 3 + mixed-set fixed bonus 10
    expect(room.gameState!.troops.find(t => t.territory === 'A')!.count).toBe(5) // +2 occupied-territory bonus
  })

  it('rejects trading an invalid set', () => {
    const { room, redConn } = buildStartedRoom(roomStore, buildTestGameState({
      playerCards: { red: [{ type: 'infantry' }, { type: 'infantry' }, { type: 'cavalry' }], blue: [] },
    }))

    send(roomStore, sessionStore, redConn, { type: 'trade_cards', payload: { cardIndices: [0, 1, 2] } })

    expect(redConn.lastOfType('error')).toBeDefined()
    expect(redConn.lastOfType('action_event')).toBeUndefined()
    expect(room.gameState!.playerCards.red).toHaveLength(3)
  })
})
