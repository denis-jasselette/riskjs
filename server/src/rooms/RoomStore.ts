import { RoomSettings } from '@/net/protocol/lobby'

import { generateRoomCode } from './roomCode'
import { Room } from './Room'

export const DEFAULT_ABANDONED_ROOM_TTL_MS = 10 * 60 * 1000
const SWEEP_INTERVAL_MS = 60 * 1000
const MAX_CODE_ATTEMPTS = 20

export class RoomStore {
  private rooms = new Map<string, Room>()
  private sweepTimer: ReturnType<typeof setInterval> | null = null
  private abandonedRoomTtlMs: number

  constructor(abandonedRoomTtlMs: number = DEFAULT_ABANDONED_ROOM_TTL_MS) {
    this.abandonedRoomTtlMs = abandonedRoomTtlMs
  }

  createRoom(settings: RoomSettings): Room {
    let code = generateRoomCode()
    for (let attempt = 0; this.rooms.has(code) && attempt < MAX_CODE_ATTEMPTS; attempt++) {
      code = generateRoomCode()
    }
    const room = new Room(code, settings)
    this.rooms.set(code, room)
    return room
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code)
  }

  deleteRoom(code: string): void {
    this.rooms.delete(code)
  }

  sweepAbandoned(now: number = Date.now()): string[] {
    const removed: string[] = []
    for (const [code, room] of this.rooms) {
      if (room.hasAnyConnectedSeat()) continue
      if (now - room.lastActivityAt < this.abandonedRoomTtlMs) continue
      this.rooms.delete(code)
      removed.push(code)
    }
    return removed
  }

  startSweeping(): void {
    if (this.sweepTimer) return
    this.sweepTimer = setInterval(() => this.sweepAbandoned(), SWEEP_INTERVAL_MS)
  }

  stopSweeping(): void {
    if (!this.sweepTimer) return
    clearInterval(this.sweepTimer)
    this.sweepTimer = null
  }
}
