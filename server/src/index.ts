import { createServer } from 'node:http'

import { WebSocketServer } from 'ws'

import { ClientGameMessage } from '@/net/protocol/game'
import { ClientMessage } from '@/net/protocol/lobby'

import { handleDisconnect } from './handlers/disconnect'
import { dispatch } from './handlers/index'
import { RoomStore } from './rooms/RoomStore'
import { SessionStore } from './session/SessionStore'
import { Connection } from './ws/Connection'

const PORT = Number(process.env.PORT) || 8787
const HOST = process.env.HOST

const roomStore = new RoomStore()
const sessionStore = new SessionStore()
roomStore.startSweeping()

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' })
  res.end('riskjs lobby server')
})

const wss = new WebSocketServer({ server: httpServer })

wss.on('connection', (socket) => {
  const connection = new Connection(socket)

  socket.on('message', (raw) => {
    let message: ClientMessage | ClientGameMessage
    try {
      message = JSON.parse(raw.toString())
    }
    catch {
      connection.send({ type: 'error', payload: { message: 'Malformed message.' } })
      return
    }
    dispatch({ connection, roomStore, sessionStore }, message)
  })

  socket.on('close', () => {
    handleDisconnect(connection, roomStore)
  })
})

httpServer.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`riskjs lobby server listening on ${HOST ?? '0.0.0.0'}:${PORT}`)
})
