import { HandlerContext } from './context'
import { handleGameAction } from './gameAction'

export function handleEndPhase(ctx: HandlerContext): void {
  handleGameAction(ctx, {
    actionType: 'end_phase',
    isLegal: (controller) => {
      if (controller.gameState.pendingPostConquestMove) return false
      if (controller.gameState.currentPhase === 'deploy')
        return controller.gameState.troopsToDeploy <= 0 && !controller.hasForcedTradeIn()

      return true
    },
    apply: controller => controller.startNextPhase(),
    buildEvent: (_controller, seat) => ({
      actionType: 'end_phase',
      by: seat.color!,
    }),
  })
}
