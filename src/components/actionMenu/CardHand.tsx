import { useContext, useState } from 'react'

import style from '@/components/actionMenu/CardHand.module.scss'
import GameContext from '@/components/GameContext'
import GameController from '@/controllers/GameController'
import { CardType } from '@/models/CardType'

const CARD_LABELS: Record<CardType, string> = {
  infantry: 'Infantry',
  cavalry: 'Cavalry',
  artillery: 'Artillery',
  wildcard: 'Wildcard',
}

// Minimal hand + trade-in UI: lets the current player see their held cards and,
// once a valid 3-card set is selected, trade them in for bonus deploy troops.
const CardHand = () => {
  const { gameState, setGameState } = useContext(GameContext)
  const [selected, setSelected] = useState<number[]>([])

  const isCurrentUsersTurn = gameState.userPlayer === gameState.currentPlayer
  const hand = gameState.playerCards[gameState.currentPlayer] ?? []

  if (!isCurrentUsersTurn || hand.length === 0)
    return null

  const gameController = new GameController(gameState)
  const selectedCards = selected.map(index => hand[index])
  const canTrade = selected.length === 3 && gameController.isValidCardSet(selectedCards)

  const toggleCard = (index: number) => {
    setSelected((previous) => {
      if (previous.includes(index))
        return previous.filter(i => i !== index)
      if (previous.length >= 3)
        return previous

      return [...previous, index]
    })
  }

  const handleTrade = () => {
    const updatedController = gameController.tradeCards(selected)
    setGameState(updatedController.gameState)
    setSelected([])
  }

  return (
    <div className={style.CardHandContainer}>
      <div className={style.Cards}>
        {hand.map((card, index) => (
          <button
            key={index}
            type="button"
            className={`btn ${style.Card}${selected.includes(index) ? ` ${style.CardSelected}` : ''}`}
            aria-pressed={selected.includes(index)}
            onClick={(e) => {
              e.stopPropagation()
              toggleCard(index)
            }}
          >
            {CARD_LABELS[card]}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn"
        disabled={!canTrade}
        onClick={(e) => {
          e.stopPropagation()
          handleTrade()
        }}
      >
        Trade cards
        {canTrade ? ` (+${gameController.getCardTradeBonus(gameState.tradeCount + 1)})` : ''}
      </button>
    </div>
  )
}

export default CardHand
