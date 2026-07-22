import { describe, expect, it } from 'vitest'

import { RoomStore } from './RoomStore'

const settings = { seatCount: 4, blizzards: false, fog: false }

describe('RoomStore', () => {
  it('creates a room retrievable by its code', () => {
    const store = new RoomStore()
    const room = store.createRoom(settings)
    expect(store.getRoom(room.code)).toBe(room)
  })

  it('returns undefined for an unknown code', () => {
    const store = new RoomStore()
    expect(store.getRoom('ZZZZ')).toBeUndefined()
  })

  it('deletes a room', () => {
    const store = new RoomStore()
    const room = store.createRoom(settings)
    store.deleteRoom(room.code)
    expect(store.getRoom(room.code)).toBeUndefined()
  })

  it('sweeps rooms with no connected seats past the TTL, keeping recent ones', () => {
    const store = new RoomStore(1000)
    const stale = store.createRoom(settings)
    const fresh = store.createRoom(settings)
    const now = stale.createdAt + 2000
    stale.lastActivityAt = now - 1500
    fresh.lastActivityAt = now - 500

    const removed = store.sweepAbandoned(now)
    expect(removed).toEqual([stale.code])
    expect(store.getRoom(stale.code)).toBeUndefined()
    expect(store.getRoom(fresh.code)).toBe(fresh)
  })

  it('does not sweep rooms with a connected seat', () => {
    const store = new RoomStore(1000)
    const room = store.createRoom(settings)
    room.seats[0].connected = true

    const removed = store.sweepAbandoned(room.createdAt + 2000)
    expect(removed).toEqual([])
    expect(store.getRoom(room.code)).toBe(room)
  })
})
