import { ClientMessage, ServerMessage } from '@/net/protocol/lobby'

type Listener = (message: ServerMessage) => void

export const DEFAULT_LOBBY_WS_URL = 'ws://localhost:8787'

export class LobbySocket {
  private socket: WebSocket | null = null
  private listeners = new Set<Listener>()
  private url: string

  constructor(url: string = import.meta.env.VITE_WS_URL ?? DEFAULT_LOBBY_WS_URL) {
    this.url = url
  }

  connect(): Promise<void> {
    if (this.socket) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.url)
      socket.addEventListener('open', () => resolve(), { once: true })
      socket.addEventListener('error', () => reject(new Error('Could not reach the lobby server.')), { once: true })
      socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data as string) as ServerMessage
        this.listeners.forEach(listener => listener(message))
      })
      this.socket = socket
    })
  }

  send(message: ClientMessage): void {
    this.socket?.send(JSON.stringify(message))
  }

  onMessage(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  close(): void {
    this.socket?.close()
    this.socket = null
  }
}
