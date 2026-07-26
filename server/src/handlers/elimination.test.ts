import { beforeEach, describe, expect, it } from 'vitest'

import { RoomStore } from '../rooms/RoomStore'
import { SessionStore } from '../session/SessionStore'
import { BLUE, buildStartedRoomWithSeats, buildTestGameState, GREEN, RED, send } from './testSupport'

// Overwhelming attacker odds (30-vs-1, then 15-vs-1) make the conquest
// outcome effectively deterministic for test purposes -- the failure
// probability is astronomically small (~1e-11), not a real flake risk.
describe('elimination notices', () => {
  let roomStore: RoomStore
  let sessionStore: SessionStore

  beforeEach(() => {
    roomStore = new RoomStore()
    sessionStore = new SessionStore()
  })

  it('notifies only the newly-defeated seat, before any later whole-game game_over, without duplicating an earlier notice', () => {
    const gameState = buildTestGameState({
      playerConfigs: [RED, BLUE, GREEN],
      currentPlayer: 'red',
      currentPhase: 'attack',
      troops: [
        { territory: 'A', count: 3, player: RED },
        { territory: 'B', count: 50, player: RED },
        { territory: 'C', count: 1, player: BLUE }, // blue's only territory
        { territory: 'D', count: 1, player: GREEN }, // green's only territory
      ],
    })
    const { room, connections } = buildStartedRoomWithSeats(roomStore, ['red', 'blue', 'green'], gameState)

    // Step 1: red conquers blue's last territory -- blue is eliminated, but
    // green is still active, so the game does not end yet.
    send(roomStore, sessionStore, connections.red, {
      type: 'attack',
      payload: { attackingTroops: 30, attackingTerritory: 'B', defendingTerritory: 'C', diceCount: 3 },
    })

    expect(connections.blue.lastOfType('elimination_notice')?.payload).toEqual({ player: 'blue' })
    expect(connections.green.lastOfType('elimination_notice')).toBeUndefined()
    expect(connections.red.lastOfType('game_over')).toBeUndefined()
    expect(connections.blue.allOfType('elimination_notice')).toHaveLength(1)

    // A conquest this lopsided leaves a post-conquest troop-movement choice
    // pending (024), which blocks every other action until resolved.
    const pending = room.gameState!.pendingPostConquestMove
    if (pending) {
      send(roomStore, sessionStore, connections.red, {
        type: 'confirm_post_conquest_move',
        payload: { troopsToMove: pending.minTroopsToMove },
      })
    }

    // Step 2: red conquers green's last territory too -- green is eliminated
    // and red is now the sole active player, ending the game.
    send(roomStore, sessionStore, connections.red, {
      type: 'attack',
      payload: { attackingTroops: 15, attackingTerritory: 'B', defendingTerritory: 'D', diceCount: 3 },
    })

    expect(connections.green.lastOfType('elimination_notice')?.payload).toEqual({ player: 'green' })
    // blue's earlier notice must not be replaced or duplicated by this later action.
    expect(connections.blue.allOfType('elimination_notice')).toHaveLength(1)

    const gameOver = connections.red.lastOfType('game_over')
    expect(gameOver?.payload.winner).toBe('red')
    expect(connections.blue.lastOfType('game_over')?.payload).toEqual(gameOver?.payload)
    expect(connections.green.lastOfType('game_over')?.payload).toEqual(gameOver?.payload)
  })
})
