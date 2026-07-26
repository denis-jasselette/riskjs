import { ClientGameMessage } from '@/net/protocol/game'
import { ClientMessage } from '@/net/protocol/lobby'

import { handleAttack } from './attack'
import { handleConfirmPostConquestMove } from './confirmPostConquestMove'
import { HandlerContext } from './context'
import { handleCreateRoom } from './createRoom'
import { handleDeploy } from './deploy'
import { handleEndGame } from './endGame'
import { handleEndPhase } from './endPhase'
import { handleFortify } from './fortify'
import { handleJoinRoom } from './joinRoom'
import { handleLeaveRoom } from './leaveRoom'
import { handlePlaceCapital } from './placeCapital'
import { handleReconnect } from './reconnect'
import { handleResign } from './resign'
import { handleStartGame } from './startGame'
import { handleTradeCards } from './tradeCards'
import { handleUpdateSettings } from './updateSettings'

export function dispatch(ctx: HandlerContext, message: ClientMessage | ClientGameMessage): void {
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
    case 'deploy':
      handleDeploy(ctx, message.payload)
      return
    case 'attack':
      handleAttack(ctx, message.payload)
      return
    case 'confirm_post_conquest_move':
      handleConfirmPostConquestMove(ctx, message.payload)
      return
    case 'fortify':
      handleFortify(ctx, message.payload)
      return
    case 'trade_cards':
      handleTradeCards(ctx, message.payload)
      return
    case 'end_phase':
      handleEndPhase(ctx)
      return
    case 'place_capital':
      handlePlaceCapital(ctx, message.payload)
      return
    case 'resign':
      handleResign(ctx)
      return
    default:
      ctx.connection.send({ type: 'error', payload: { message: 'Unrecognized message type.' } })
      return
  }
}
