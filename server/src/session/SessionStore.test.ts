import { describe, expect, it } from 'vitest'

import { SessionStore } from './SessionStore'

describe('SessionStore', () => {
  it('issues a token that resolves back to the room/seat', () => {
    const store = new SessionStore()
    const token = store.issue('ABCD', 2)
    expect(store.resolve(token)).toEqual({ roomCode: 'ABCD', seatIndex: 2 })
  })

  it('issues distinct tokens for distinct calls', () => {
    const store = new SessionStore()
    const a = store.issue('ABCD', 0)
    const b = store.issue('ABCD', 1)
    expect(a).not.toBe(b)
  })

  it('revoke makes a token no longer resolve', () => {
    const store = new SessionStore()
    const token = store.issue('ABCD', 0)
    store.revoke(token)
    expect(store.resolve(token)).toBeUndefined()
  })

  it('returns undefined for an unknown token', () => {
    const store = new SessionStore()
    expect(store.resolve('unknown')).toBeUndefined()
  })
})
