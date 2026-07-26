import { Connection } from '@server/ws/Connection'

import GameState from '@/models/GameState'
import { PlayerColor } from '@/models/PlayerConfig'
import { ServerGameMessage } from '@/net/protocol/game'
import { RoomSettings, Seat, ServerMessage, StartedSeat } from '@/net/protocol/lobby'

export type RoomStatus = 'lobby' | 'started'

export type RoomSeat = Seat & {
  token: string | null
  connection: Connection | null
  color: PlayerColor | null
  actionInFlight: boolean
}

export class Room {
  code: string
  settings: RoomSettings
  seats: RoomSeat[]
  status: RoomStatus = 'lobby'
  gameState: GameState | null = null
  createdAt: number
  lastActivityAt: number

  constructor(code: string, settings: RoomSettings) {
    this.code = code
    this.settings = settings
    this.seats = this.buildSeats(settings.seatCount)
    this.createdAt = Date.now()
    this.lastActivityAt = this.createdAt
  }

  private buildSeats(seatCount: number): RoomSeat[] {
    const seats: RoomSeat[] = []
    for (let i = 0; i < seatCount; i++) {
      seats.push({ index: i, nickname: null, connected: false, isHost: false, token: null, connection: null, color: null, actionInFlight: false })
    }
    return seats
  }

  get hostSeatIndex(): number {
    return this.seats.find(seat => seat.isHost)?.index ?? 0
  }

  get claimedSeatCount(): number {
    return this.seats.filter(seat => seat.nickname !== null).length
  }

  findOpenSeat(): RoomSeat | undefined {
    return this.seats.find(seat => seat.nickname === null)
  }

  hasAnyConnectedSeat(): boolean {
    return this.seats.some(seat => seat.connected)
  }

  touch(): void {
    this.lastActivityAt = Date.now()
  }

  resetSeat(index: number): void {
    const seat = this.seats[index]
    seat.nickname = null
    seat.connected = false
    seat.token = null
    seat.connection = null
    seat.color = null
    seat.actionInFlight = false
  }

  broadcast(message: ServerMessage | ServerGameMessage): void {
    for (const seat of this.seats) {
      seat.connection?.send(message)
    }
  }

  publicSeats(): Seat[] {
    return this.seats.map(({ index, nickname, connected, isHost }) => ({ index, nickname, connected, isHost }))
  }

  startedSeats(): StartedSeat[] {
    return this.seats.map(({ index, nickname, connected, isHost, color }) => ({ index, nickname, connected, isHost, color: color as PlayerColor }))
  }

  resizeSeatCount(seatCount: number): { ok: true } | { ok: false, error: string } {
    if (seatCount < this.claimedSeatCount) {
      return { ok: false, error: `Cannot shrink to ${seatCount} seats — ${this.claimedSeatCount} are already claimed.` }
    }
    if (seatCount > this.seats.length) {
      for (let i = this.seats.length; i < seatCount; i++) {
        this.seats.push({ index: i, nickname: null, connected: false, isHost: false, token: null, connection: null, color: null, actionInFlight: false })
      }
    }
    else if (seatCount < this.seats.length) {
      this.seats.length = seatCount
    }
    this.settings = { ...this.settings, seatCount }
    return { ok: true }
  }
}
