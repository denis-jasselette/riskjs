import { HandlerContext } from './context'
import { handleGameAction } from './gameAction'

export function handleFortify(ctx: HandlerContext, payload: { troops: number, fromTerritory: string, toTerritory: string }): void {
  handleGameAction(ctx, {
    actionType: 'fortify',
    isLegal: (controller, seat) =>
      controller.gameState.currentPhase === 'fortify'
      && controller.isSelectable(payload.fromTerritory, null, seat.color!)
      && controller.isSelectable(payload.toTerritory, payload.fromTerritory, seat.color!)
      && payload.troops >= 1
      && payload.troops <= controller.getTroopCount(payload.fromTerritory) - 1,
    apply: controller => controller.fortify(payload.troops, payload.fromTerritory, payload.toTerritory),
    buildEvent: (_controller, seat) => ({
      actionType: 'fortify',
      by: seat.color!,
      troops: payload.troops,
      fromTerritory: payload.fromTerritory,
      toTerritory: payload.toTerritory,
    }),
  })
}
