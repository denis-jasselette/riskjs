import { HandlerContext } from './context'
import { handleGameAction } from './gameAction'

export function handlePlaceCapital(ctx: HandlerContext, payload: { territory: string }): void {
  handleGameAction(ctx, {
    actionType: 'place_capital',
    isLegal: (controller, seat) =>
      controller.gameState.currentPhase === 'capitalDeploy'
      && controller.isSelectable(payload.territory, null, seat.color!),
    apply: controller => controller.chooseCapital(payload.territory),
    buildEvent: (_controller, seat) => ({
      actionType: 'place_capital',
      by: seat.color!,
      territory: payload.territory,
    }),
  })
}
