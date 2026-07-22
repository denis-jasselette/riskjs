import { closeRoom } from './closeRoom'
import { HandlerContext, requireHostRoom } from './context'

export function handleEndGame(ctx: HandlerContext): void {
  const room = requireHostRoom(ctx)
  if (!room) return
  closeRoom(ctx, room, 'The host ended the game.')
}
