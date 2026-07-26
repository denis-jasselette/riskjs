import { beforeEach, describe, expect, it } from 'vitest'

import { RoomStore } from '../rooms/RoomStore'
import { SessionStore } from '../session/SessionStore'
import { buildStartedRoom, buildStartedRoomWithSeats, buildTestGameState, GREEN, send } from './testSupport'

describe('attack handler', () => {
  let roomStore: RoomStore
  let sessionStore: SessionStore

  beforeEach(() => {
    roomStore = new RoomStore()
    sessionStore = new SessionStore()
  })

  it('attacks an adjacent enemy territory and broadcasts the dice/outcome to both players', () => {
    const { room, redConn, blueConn } = buildStartedRoom(roomStore, buildTestGameState({ currentPhase: 'attack' }))

    send(roomStore, sessionStore, redConn, {
      type: 'attack',
      payload: { attackingTroops: 3, attackingTerritory: 'B', defendingTerritory: 'C', diceCount: 3 },
    })

    const redEvent = redConn.lastOfType('action_event')
    const blueEvent = blueConn.lastOfType('action_event')
    expect(redEvent?.payload.actionType).toBe('attack')
    expect(redEvent?.payload).toEqual(blueEvent?.payload)

    if (redEvent?.payload.actionType !== 'attack') throw new Error('expected attack event')
    expect(redEvent.payload.attackingTerritory).toBe('B')
    expect(redEvent.payload.defendingTerritory).toBe('C')
    expect(redEvent.payload.attackerDice.length).toBeGreaterThan(0)
    expect(redEvent.payload.defenderDice.length).toBeGreaterThan(0)

    const troopB = room.gameState!.troops.find(t => t.territory === 'B')!
    const troopC = room.gameState!.troops.find(t => t.territory === 'C')!
    if (redEvent.payload.conqueredTerritory) {
      // On conquest, every committed troop leaves the source by default
      // (not just the losses) -- the survivors move into the conquered
      // territory, per GameController.attack()'s conquest branch.
      expect(troopB.count).toBe(5 - 3)
      expect(troopC.player.color).toBe('red')
      expect(troopC.count).toBe(3 - redEvent.payload.attackerLosses)
    }
    else {
      expect(troopB.count).toBe(5 - redEvent.payload.attackerLosses)
      expect(troopC.player.color).toBe('blue')
      expect(troopC.count).toBe(4 - redEvent.payload.defenderLosses)
    }
  })

  it('delivers a byte-identical outcome to every connected viewer, not just the two combatants (SC-004)', () => {
    const gameState = buildTestGameState({
      currentPhase: 'attack',
      playerConfigs: [{ currentUser: false, name: 'Red', color: 'red', human: true, position: 0 }, { currentUser: false, name: 'Blue', color: 'blue', human: true, position: 1 }, GREEN],
      troops: [
        { territory: 'A', count: 3, player: { currentUser: false, name: 'Red', color: 'red', human: true, position: 0 } },
        { territory: 'B', count: 5, player: { currentUser: false, name: 'Red', color: 'red', human: true, position: 0 } },
        { territory: 'C', count: 4, player: { currentUser: false, name: 'Blue', color: 'blue', human: true, position: 1 } },
        { territory: 'D', count: 2, player: { currentUser: false, name: 'Blue', color: 'blue', human: true, position: 1 } },
        { territory: 'E', count: 6, player: GREEN },
      ],
    })
    const { connections } = buildStartedRoomWithSeats(roomStore, ['red', 'blue', 'green'], gameState)

    send(roomStore, sessionStore, connections.red, {
      type: 'attack',
      payload: { attackingTroops: 3, attackingTerritory: 'B', defendingTerritory: 'C', diceCount: 3 },
    })

    const redEvent = connections.red.lastOfType('action_event')?.payload
    const blueEvent = connections.blue.lastOfType('action_event')?.payload
    const greenEvent = connections.green.lastOfType('action_event')?.payload
    expect(redEvent).toBeDefined()
    expect(greenEvent).toEqual(redEvent)
    expect(blueEvent).toEqual(redEvent)
  })

  it('rejects attacking a non-adjacent territory', () => {
    const { room, redConn } = buildStartedRoom(roomStore, buildTestGameState({ currentPhase: 'attack' }))

    send(roomStore, sessionStore, redConn, {
      type: 'attack',
      payload: { attackingTroops: 2, attackingTerritory: 'A', defendingTerritory: 'C' },
    })

    expect(redConn.lastOfType('error')).toBeDefined()
    expect(redConn.lastOfType('action_event')).toBeUndefined()
    expect(room.gameState!.troops.find(t => t.territory === 'A')!.count).toBe(3)
  })
})
