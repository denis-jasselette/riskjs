import { HandlerContext } from './context'
import { handleGameAction } from './gameAction'

// Resigning is allowed at any time, regardless of whose turn it is (013's
// FR-008) -- the only turn-action exempt from the generic out-of-turn gate.
// Resigns the sending seat's own color, not necessarily gameState.currentPlayer.
export function handleResign(ctx: HandlerContext): void {
  handleGameAction(ctx, {
    actionType: 'resign',
    requiresTurn: false,
    isLegal: () => true,
    apply: (controller, seat) => controller.resign(seat.color!),
    buildEvent: (_controller, seat) => ({
      actionType: 'resign',
      by: seat.color!,
    }),
  })
}
