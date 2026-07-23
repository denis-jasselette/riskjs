import { useContext, useState } from 'react'

import style from '@/components/actionMenu/CardHand.module.scss'
import GameContext from '@/components/GameContext'
import GameController from '@/controllers/GameController'
import Card from '@/models/Card'
import { CardType } from '@/models/CardType'

const CARD_LABELS: Record<CardType, string> = {
  infantry: 'Infantry',
  cavalry: 'Cavalry',
  artillery: 'Artillery',
  wildcard: 'Wildcard',
}

// Hand + trade-in UI: lets the current player see their held cards (with the
// territory each depicts and whether it's currently eligible for the Fixed-mode
// +2 occupied-territory bonus) and, once a valid 3-card set is selected, trade
// them in for bonus deploy troops. Only ever shown during the current user's own
// deploy phase — trading (optional or forced) only ever happens there. Folds down
// to a compact badge by default (a card-count icon, with a marker for trade-in
// availability) so it doesn't compete for space with the phase/troop-selector
// controls; forced trade-ins always show expanded since they block all other
// actions until resolved.
const CardHand = () => {
  const { gameState, setGameState, viewingPlayer } = useContext(GameContext)
  const [selected, setSelected] = useState<number[]>([])
  const [bonusTerritory, setBonusTerritory] = useState<string | undefined>(undefined)
  const [folded, setFolded] = useState<boolean>(true)

  const isCurrentUsersTurn = viewingPlayer === gameState.currentPlayer
  const hand = gameState.playerCards[gameState.currentPlayer] ?? []

  if (!isCurrentUsersTurn || gameState.currentPhase !== 'deploy' || hand.length === 0)
    return null

  const gameController = new GameController(gameState)
  const selectedCards = selected.map(index => hand[index])
  const setKind = gameController.resolveCardSetKind(selectedCards)
  const canTrade = selected.length === 3 && setKind !== null
  const forcedTradeIn = gameController.hasForcedTradeIn()
  const availableTradeIn = gameController.hasAvailableTradeIn()
  const showExpanded = !folded || forcedTradeIn

  const isOccupied = (card: Card) => !!card.territory && gameController.mapController.getTerritoryOwner(card.territory) === gameState.currentPlayer

  // Fixed mode only: which of the 3 selected territories currently qualify for
  // the +2 bonus. The bonus applies to exactly one of them, so with more than
  // one eligible the player picks; with exactly one it's used automatically.
  const eligibleBonusTerritories = gameState.cardBonusMode === 'fixed' && canTrade
    ? Array.from(new Set(selectedCards.filter(isOccupied).map(card => card.territory!)))
    : []
  const needsBonusChoice = eligibleBonusTerritories.length > 1
  const resolvedBonusTerritory = eligibleBonusTerritories.length === 1 ? eligibleBonusTerritories[0] : bonusTerritory
  const canConfirmTrade = canTrade && (!needsBonusChoice || !!bonusTerritory)

  const toggleCard = (index: number) => {
    setSelected((previous) => {
      if (previous.includes(index))
        return previous.filter(i => i !== index)
      if (previous.length >= 3)
        return previous

      return [...previous, index]
    })
    setBonusTerritory(undefined)
  }

  const handleTrade = () => {
    const updatedController = gameController.tradeCards(selected, resolvedBonusTerritory)
    setGameState(updatedController.gameState)
    setSelected([])
    setBonusTerritory(undefined)
  }

  if (!showExpanded) {
    return (
      <div className={style.CardHandContainer} data-folded="true">
        <button
          type="button"
          className={style.FoldToggle}
          onClick={(e) => {
            e.stopPropagation()
            setFolded(false)
          }}
          title={availableTradeIn ? 'Cards — trade-in available' : 'Cards'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H288V368c0-26.5 21.5-48 48-48H448V96c0-35.3-28.7-64-64-64H64zM448 352H402.7 336c-8.8 0-16 7.2-16 16v66.7V480l32-32 64-64 32-32z" /></svg>
          <span className={style.FoldCount}>{hand.length}</span>
          {availableTradeIn && <span className={style.FoldBadge}>+</span>}
        </button>
      </div>
    )
  }

  return (
    <div className={style.CardHandContainer}>
      <div className={style.HandHeader}>
        {forcedTradeIn && (
          <span className={style.ForcedNotice}>5+ cards — trade-in required</span>
        )}
        {!forcedTradeIn && (
          <button
            type="button"
            className={style.FoldButton}
            onClick={(e) => {
              e.stopPropagation()
              setFolded(true)
            }}
          >
            Hide
          </button>
        )}
      </div>
      <div className={style.Cards}>
        {hand.map((card, index) => {
          const occupied = gameState.cardBonusMode === 'fixed' && isOccupied(card)
          return (
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
              <span className={style.CardType}>{CARD_LABELS[card.type]}</span>
              <span className={style.CardTerritory}>{card.territory ?? '—'}</span>
              {occupied && (
                <span className={style.CardBonusBadge} title="Occupied — eligible for +2">+2</span>
              )}
            </button>
          )
        })}
      </div>
      {needsBonusChoice && (
        <div className={style.BonusPicker} onClick={e => e.stopPropagation()}>
          <span className={style.BonusPickerLabel}>Bonus territory:</span>
          {eligibleBonusTerritories.map(territory => (
            <label key={territory} className={style.BonusPickerOption}>
              <input
                type="radio"
                name="bonusTerritory"
                checked={bonusTerritory === territory}
                onChange={() => setBonusTerritory(territory)}
              />
              {territory}
            </label>
          ))}
        </div>
      )}
      <button
        type="button"
        className="btn"
        disabled={!canConfirmTrade}
        onClick={(e) => {
          e.stopPropagation()
          handleTrade()
        }}
      >
        Trade cards
        {canTrade ? ` (+${gameController.getCardTradeBonus(gameState.tradeCount + 1, setKind!)})` : ''}
      </button>
    </div>
  )
}

export default CardHand
