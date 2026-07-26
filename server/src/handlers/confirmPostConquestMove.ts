import { HandlerContext } from './context'
import { handleGameAction } from './gameAction'

export function handleConfirmPostConquestMove(ctx: HandlerContext, payload: { troopsToMove: number }): void {
  handleGameAction(ctx, {
    actionType: 'confirm_post_conquest_move',
    isLegal: (controller) => {
      const pending = controller.gameState.pendingPostConquestMove
      if (!pending) return false
      const maxTroopsToMove = controller.getTroopCount(pending.sourceTerritory) + controller.getTroopCount(pending.conqueredTerritory) - 1
      return payload.troopsToMove >= pending.minTroopsToMove && payload.troopsToMove <= maxTroopsToMove
    },
    apply: controller => controller.confirmPostConquestMove(payload.troopsToMove),
    buildEvent: (_controller, seat) => ({
      actionType: 'confirm_post_conquest_move',
      by: seat.color!,
      troopsToMove: payload.troopsToMove,
    }),
  })
}
