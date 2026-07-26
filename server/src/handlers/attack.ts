import { HandlerContext } from './context'
import { handleGameAction } from './gameAction'

export function handleAttack(ctx: HandlerContext, payload: { attackingTroops: number, attackingTerritory: string, defendingTerritory: string, diceCount?: number }): void {
  handleGameAction(ctx, {
    actionType: 'attack',
    isLegal: (controller, seat) =>
      controller.gameState.currentPhase === 'attack'
      && controller.isSelectable(payload.attackingTerritory, null, seat.color!)
      && controller.isSelectable(payload.defendingTerritory, payload.attackingTerritory, seat.color!)
      && payload.attackingTroops >= 1
      && payload.attackingTroops <= controller.getTroopCount(payload.attackingTerritory) - 1,
    apply: controller => controller.attack(payload.attackingTroops, payload.attackingTerritory, payload.defendingTerritory, payload.diceCount),
    buildEvent: (controller, seat) => {
      const result = controller.lastAttackResult!
      const conquered = controller.mapController.getTerritoryOwner(payload.defendingTerritory) === seat.color
      return {
        actionType: 'attack',
        by: seat.color!,
        attackingTerritory: payload.attackingTerritory,
        defendingTerritory: payload.defendingTerritory,
        attackerDice: result.attackerDice,
        defenderDice: result.defenderDice,
        attackerLosses: result.attackerLosses,
        defenderLosses: result.defenderLosses,
        conqueredTerritory: conquered ? payload.defendingTerritory : undefined,
      }
    },
  })
}
