import { ClientMessage } from '@/net/protocol/lobby'

import { HandlerContext } from './context'
import { handleCreateRoom } from './createRoom'
import { handleEndGame } from './endGame'
import { handleJoinRoom } from './joinRoom'
import { handleLeaveRoom } from './leaveRoom'
import { handleReconnect } from './reconnect'
import { handleStartGame } from './startGame'
import { handleUpdateSettings } from './updateSettings'

export function dispatch(ctx: HandlerContext, message: ClientMessage): void {
  switch (message.type) {
    case 'create_room':
      handleCreateRoom(ctx, message.payload)
      return
    case 'join_room':
      handleJoinRoom(ctx, message.payload)
      return
    case 'reconnect':
      handleReconnect(ctx, message.payload)
      return
    case 'update_settings':
      handleUpdateSettings(ctx, message.payload)
      return
    case 'start_game':
      handleStartGame(ctx)
      return
    case 'leave_room':
      handleLeaveRoom(ctx)
      return
    case 'end_game':
      handleEndGame(ctx)
      return
  }
}
