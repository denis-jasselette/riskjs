import { randomUUID } from 'node:crypto'

type SessionRef = { roomCode: string, seatIndex: number }

export class SessionStore {
  private sessions = new Map<string, SessionRef>()

  issue(roomCode: string, seatIndex: number): string {
    const token = randomUUID()
    this.sessions.set(token, { roomCode, seatIndex })
    return token
  }

  resolve(token: string): SessionRef | undefined {
    return this.sessions.get(token)
  }

  revoke(token: string): void {
    this.sessions.delete(token)
  }
}
