import GameController from '@/controllers/GameController'

import { HandlerContext } from './context'
import { handleGameAction } from './gameAction'

function isLegalTrade(controller: GameController, cardIndices: number[]): boolean {
  const hand = controller.gameState.playerCards[controller.gameState.currentPlayer] ?? []
  const uniqueIndices = Array.from(new Set(cardIndices))
  if (uniqueIndices.length !== 3) return false

  const cards = uniqueIndices.map(index => hand[index])
  if (cards.some(card => card === undefined)) return false

  return controller.isValidCardSet(cards)
}

export function handleTradeCards(ctx: HandlerContext, payload: { cardIndices: number[], bonusTerritory?: string }): void {
  handleGameAction(ctx, {
    actionType: 'trade_cards',
    isLegal: controller =>
      controller.gameState.currentPhase === 'deploy'
      && isLegalTrade(controller, payload.cardIndices),
    apply: controller => controller.tradeCards(payload.cardIndices, payload.bonusTerritory),
    buildEvent: (_controller, seat) => ({
      actionType: 'trade_cards',
      by: seat.color!,
      cardIndices: payload.cardIndices,
      bonusTerritory: payload.bonusTerritory,
    }),
  })
}
