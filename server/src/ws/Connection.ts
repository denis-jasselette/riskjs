import { WebSocket } from 'ws'

import { ServerMessage } from '@/net/protocol/lobby'

export class Connection {
  socket: WebSocket
  roomCode: string | null = null
  seatIndex: number | null = null

  constructor(socket: WebSocket) {
    this.socket = socket
  }

  send(message: ServerMessage): void {
    if (this.socket.readyState !== WebSocket.OPEN) return
    this.socket.send(JSON.stringify(message))
  }

  bind(roomCode: string, seatIndex: number): void {
    this.roomCode = roomCode
    this.seatIndex = seatIndex
  }

  unbind(): void {
    this.roomCode = null
    this.seatIndex = null
  }
}
