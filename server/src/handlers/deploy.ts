import { HandlerContext } from './context'
import { handleGameAction } from './gameAction'

export function handleDeploy(ctx: HandlerContext, payload: { troops: number, territory: string }): void {
  handleGameAction(ctx, {
    actionType: 'deploy',
    isLegal: (controller, seat) =>
      controller.gameState.currentPhase === 'deploy'
      && controller.isSelectable(payload.territory, null, seat.color!)
      && payload.troops >= 1
      && payload.troops <= controller.gameState.troopsToDeploy,
    apply: controller => controller.deploy(payload.troops, payload.territory),
    buildEvent: (_controller, seat) => ({
      actionType: 'deploy',
      by: seat.color!,
      troops: payload.troops,
      territory: payload.territory,
    }),
  })
}
