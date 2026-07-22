import { describe, expect, it } from 'vitest'

import { generateRoomCode } from './roomCode'

describe('generateRoomCode', () => {
  it('generates a 4-character uppercase code', () => {
    const code = generateRoomCode()
    expect(code).toHaveLength(4)
    expect(code).toBe(code.toUpperCase())
  })

  it('excludes ambiguous characters', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode()
      expect(code).not.toMatch(/[0O1IL]/)
    }
  })

  it('produces varied codes', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateRoomCode()))
    expect(codes.size).toBeGreaterThan(1)
  })
})
