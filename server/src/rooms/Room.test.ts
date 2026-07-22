import { describe, expect, it } from 'vitest'

import { Room } from './Room'

const settings = { seatCount: 3, blizzards: false, fog: false }

describe('Room', () => {
  it('starts with all seats open', () => {
    const room = new Room('ABCD', settings)
    expect(room.seats).toHaveLength(3)
    expect(room.claimedSeatCount).toBe(0)
    expect(room.findOpenSeat()?.index).toBe(0)
  })

  describe('resizeSeatCount', () => {
    it('grows the seat list', () => {
      const room = new Room('ABCD', settings)
      const result = room.resizeSeatCount(5)
      expect(result.ok).toBe(true)
      expect(room.seats).toHaveLength(5)
      expect(room.settings.seatCount).toBe(5)
    })

    it('shrinks the seat list when seats are unclaimed', () => {
      const room = new Room('ABCD', settings)
      const result = room.resizeSeatCount(2)
      expect(result.ok).toBe(true)
      expect(room.seats).toHaveLength(2)
    })

    it('refuses to shrink below the number of claimed seats', () => {
      const room = new Room('ABCD', settings)
      room.seats[0].nickname = 'Alice'
      room.seats[1].nickname = 'Bob'
      const result = room.resizeSeatCount(1)
      expect(result.ok).toBe(false)
      expect(room.seats).toHaveLength(3)
    })
  })

  it('publicSeats omits the session token', () => {
    const room = new Room('ABCD', settings)
    room.seats[0].nickname = 'Alice'
    room.seats[0].token = 'secret'
    const [seat] = room.publicSeats()
    expect(seat).toEqual({ index: 0, nickname: 'Alice', connected: false, isHost: false })
    expect(seat).not.toHaveProperty('token')
  })

  it('broadcast sends to every connected seat and skips empty ones', () => {
    const room = new Room('ABCD', settings)
    const sent: unknown[] = []
    room.seats[0].connection = { send: (m: unknown) => sent.push(m) } as never

    room.broadcast({ type: 'error', payload: { message: 'hi' } })
    expect(sent).toEqual([{ type: 'error', payload: { message: 'hi' } }])
  })
})
