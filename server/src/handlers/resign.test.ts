import { beforeEach, describe, expect, it } from 'vitest'

import { RoomStore } from '../rooms/RoomStore'
import { SessionStore } from '../session/SessionStore'
import { buildStartedRoom, buildTestGameState, send } from './testSupport'

describe('resign handler', () => {
  let roomStore: RoomStore
  let sessionStore: SessionStore

  beforeEach(() => {
    roomStore = new RoomStore()
    sessionStore = new SessionStore()
  })

  it('lets a player resign even when it is not their turn', () => {
    const { room, redConn, blueConn } = buildStartedRoom(roomStore, buildTestGameState({ currentPlayer: 'red' }))

    send(roomStore, sessionStore, blueConn, { type: 'resign', payload: {} })

    const expectedEvent = { actionType: 'resign', by: 'blue' }
    expect(blueConn.lastOfType('action_event')?.payload).toEqual(expectedEvent)
    expect(redConn.lastOfType('action_event')?.payload).toEqual(expectedEvent)
    expect(room.gameState!.resignedPlayers).toContain('blue')
    expect(room.gameState!.currentPlayer).toBe('red')
  })

  it('ends the game and notifies both players when only one active player remains', () => {
    const { room, redConn, blueConn } = buildStartedRoom(roomStore, buildTestGameState({ currentPlayer: 'red' }))

    send(roomStore, sessionStore, redConn, { type: 'resign', payload: {} })

    expect(room.gameState!.gameOver).toBe(true)
    expect(redConn.lastOfType('elimination_notice')?.payload).toEqual({ player: 'red' })
    const gameOver = redConn.lastOfType('game_over')
    expect(gameOver?.payload.winner).toBe('blue')
    expect(blueConn.lastOfType('game_over')?.payload).toEqual(gameOver?.payload)
  })
})
