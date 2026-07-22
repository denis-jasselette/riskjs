import { MapController } from '@/controllers/MapController'
import { diceRoll } from '@/lib/Random'
import { CardType } from '@/models/CardType'
import { GamePhase } from '@/models/GamePhase'
import GameState from '@/models/GameState'

// Progressive trade-in bonus table (1-indexed trade number).
// Trade 1: 4, 2: 6, 3: 8, 4: 10, 5: 12, 6: 15, 7+: +5 per subsequent trade.
const PROGRESSIVE_CARD_BONUS_TABLE = [4, 6, 8, 10, 12, 15]
const PROGRESSIVE_CARD_BONUS_STEP = 5

// The "Fixed" bonus mode has no canonical value in classic Risk rules (variants differ).
// 4 troops per trade is a reasonable, tunable product default.
const FIXED_CARD_BONUS = 4

const NON_WILDCARD_TYPES: CardType[] = ['infantry', 'cavalry', 'artillery']

export default class GameController {
  gameState: GameState
  mapController: MapController

  constructor(gameState: GameState) {
    this.gameState = { ...gameState }
    this.mapController = new MapController(this.gameState)
  }

  isFortifyAllowed(a: string, b: string): boolean {
    return this.mapController.areConnected(a, b, { sameOwner: true })
  }

  isAttackAllowed(a: string, b: string): boolean {
    return this.mapController.areAdjacent(a, b, { differentOwner: true })
  }

  isSelectable(territory: string, selectedTerritory: string | null = null): boolean {
    if (this.mapController.isTerritoryBlizzard(territory))
      return false
    if (this.gameState.currentPlayer !== this.gameState.userPlayer)
      return false
    if (selectedTerritory === territory)
      return true

    const troopCount = this.getTroopCount(territory)
    const owner = this.mapController.getTerritoryOwner(territory)
    if (this.gameState.currentPhase === 'deploy')
      return owner === this.gameState.currentPlayer
    if (this.gameState.currentPhase === 'fortify')
      return owner === this.gameState.currentPlayer && ((!selectedTerritory && troopCount > 1) || (!!selectedTerritory && this.isFortifyAllowed(selectedTerritory, territory)))
    if (this.gameState.currentPhase === 'attack') {
      if (owner === this.gameState.currentPlayer && troopCount > 1)
        return true

      return !!selectedTerritory && this.isAttackAllowed(selectedTerritory, territory)
    }
    return false
  }

  deploy(troops: number, territory: string): GameController {
    console.info(`Deploying ${troops} troops in ${territory}`)
    this.mapController.getTroopState(territory)!.count += troops
    this.gameState.troopsToDeploy -= troops

    if (this.gameState.troopsToDeploy <= 0)
      this.startPhase('attack')

    return this
  }

  attackRng(attackingTroops: number, defendingTroops: number, options: { rngType: 'TrueRandom', maxAttacker: number, maxDefender: number } = { rngType: 'TrueRandom', maxAttacker: 3, maxDefender: 2 }): { attackerLosses: number, defenderLosses: number, attackerDice: number[], defenderDice: number[] } {
    const losses: [number, number] = [0, 0]
    let lastAttackerDice: number[] = []
    let lastDefenderDice: number[] = []
    while (attackingTroops > 0 && defendingTroops > 0) {
      const diceCount = [Math.min(options.maxAttacker, attackingTroops), Math.min(options.maxDefender, defendingTroops)]
      const attackingDice = [...Array(diceCount[0]).keys()].map(() => diceRoll()).sort()
      const defendingDice = [...Array(diceCount[1]).keys()].map(() => diceRoll()).sort()
      lastAttackerDice = [...attackingDice].reverse()
      lastDefenderDice = [...defendingDice].reverse()
      for (let i = 0; i < Math.min(...diceCount); i++) {
        if (attackingDice[attackingDice.length - 1 - i] > defendingDice[defendingDice.length - 1 - i]) {
          losses[1] += 1
          defendingTroops -= 1
        }
        else {
          losses[0] += 1
          attackingTroops -= 1
        }
      }
    }

    return { attackerLosses: losses[0], defenderLosses: losses[1], attackerDice: lastAttackerDice, defenderDice: lastDefenderDice }
  }

  lastAttackResult: { attackerDice: number[], defenderDice: number[], attackerLosses: number, defenderLosses: number } | null = null

  attack(attackingTroops: number, attackingTerritory: string, defendingTerritory: string, diceCount?: number): GameController {
    const attackingTroopState = this.mapController.getTroopState(attackingTerritory)
    const defendingTroopState = this.mapController.getTroopState(defendingTerritory)
    const defendingTroops = defendingTroopState!.count
    const maxAttacker = diceCount ?? Math.min(attackingTroops, 3)
    console.info(`Attacking ${attackingTroops} against ${defendingTroops} troops from ${attackingTerritory} to ${defendingTerritory} with ${maxAttacker} dice`)
    const result = this.attackRng(attackingTroops, defendingTroops, { rngType: 'TrueRandom', maxAttacker, maxDefender: 2 })
    this.lastAttackResult = result
    if (result.attackerLosses === attackingTroops) {
      console.info(`Attacker lost (attacker: ${-result.attackerLosses}, defender: ${-result.defenderLosses})`)
      attackingTroopState!.count -= result.attackerLosses
      defendingTroopState!.count -= result.defenderLosses
    }
    else {
      console.info(`Defender lost (attacker: ${-result.attackerLosses}, defender: ${-result.defenderLosses})`)
      attackingTroopState!.count -= attackingTroops
      defendingTroopState!.count = attackingTroops - result.attackerLosses
      defendingTroopState!.player = attackingTroopState!.player
      this.gameState.conqueredTerritoryThisTurn = true
    }
    return this
  }

  fortify(troops: number, fromTerritory: string, toTerritory: string): GameController {
    console.info(`Fortifying ${troops} troops from ${fromTerritory} to ${toTerritory}`)
    const fromTroopState = this.mapController.getTroopState(fromTerritory)
    const toTroopState = this.mapController.getTroopState(toTerritory)
    fromTroopState!.count -= troops
    toTroopState!.count += troops
    return this.startNextPlayerTurn()
  }

  getTroopCount(territory: string): number {
    const troopState = this.mapController.getTroopState(territory)
    return troopState!.count
  }

  getNextPlayer(): string {
    const currentPlayerIndex = this.gameState.playerConfigs.findIndex(x => x.color === this.gameState.currentPlayer)
    let nextPlayerIndex = currentPlayerIndex
    do {
      nextPlayerIndex = (nextPlayerIndex + 1) % this.gameState.playerConfigs.length
    } while (this.hasPlayerLost(this.gameState.playerConfigs[nextPlayerIndex].color))
    return this.gameState.playerConfigs[nextPlayerIndex].color
  }

  startNextPlayerTurn(): GameController {
    this.awardCardIfConquered()
    return this.startPlayerTurn(this.getNextPlayer())
  }

  startPlayerTurn(player: string): GameController {
    this.gameState.currentPlayer = player
    this.gameState.troopsToDeploy = 3
    this.gameState.conqueredTerritoryThisTurn = false
    console.info(`Starting player ${player}'s turn with ${this.gameState.troopsToDeploy} troops to deploy`)
    if (this.gameState.fogEnabled) {
      this.gameState.fog = this.mapController.getVisibleTerritories(player)
    }
    else {
      this.gameState.fog = undefined
    }
    return this.startPhase('deploy')
  }

  // Classic Risk rule: a player who conquered at least one territory this turn
  // draws one card from the deck at the end of their turn.
  awardCardIfConquered(): GameController {
    if (this.gameState.conqueredTerritoryThisTurn) {
      this.drawCard(this.gameState.currentPlayer)
    }
    return this
  }

  drawCard(player: string): GameController {
    const card = this.gameState.deck.pop()
    if (card === undefined) {
      console.warn('Card deck is empty; no card drawn')
      return this
    }
    if (!this.gameState.playerCards[player])
      this.gameState.playerCards[player] = []

    this.gameState.playerCards[player].push(card)
    console.info(`${player} drew a ${card} card`)
    return this
  }

  startNextPhase(): GameController {
    if (this.gameState.currentPhase === 'deploy')
      return this.startPhase('attack')
    if (this.gameState.currentPhase === 'attack')
      return this.startPhase('fortify')

    return this.startNextPlayerTurn()
  }

  startPhase(phase: GamePhase): GameController {
    console.info(`Starting ${phase} phase`)
    this.gameState.currentPhase = phase
    return this
  }

  getPlayerTerritoryTotal(player: string): number {
    return this.gameState.troops.filter(x => x.player.color === player).map(_ => 1).reduce((a, b) => a + b, 0)
  }

  getPlayerTroopTotal(player: string): number {
    return this.gameState.troops.filter(x => x.player.color === player).map(x => x.count).reduce((a, b) => a + b, 0)
  }

  getPlayerCardTotal(player: string): number {
    return (this.gameState.playerCards[player] ?? []).length
  }

  // The bonus troops awarded for the Nth trade-in this game (1-indexed), per the
  // selected cardBonusMode. Fixed mode always awards the same flat amount; progressive
  // mode follows the classic escalating Risk table (see PROGRESSIVE_CARD_BONUS_TABLE).
  getCardTradeBonus(tradeNumber: number): number {
    if (this.gameState.cardBonusMode === 'fixed')
      return FIXED_CARD_BONUS

    if (tradeNumber <= PROGRESSIVE_CARD_BONUS_TABLE.length)
      return PROGRESSIVE_CARD_BONUS_TABLE[tradeNumber - 1]

    const stepsPastTable = tradeNumber - PROGRESSIVE_CARD_BONUS_TABLE.length
    return PROGRESSIVE_CARD_BONUS_TABLE[PROGRESSIVE_CARD_BONUS_TABLE.length - 1] + stepsPastTable * PROGRESSIVE_CARD_BONUS_STEP
  }

  // A set of exactly 3 cards is valid if it is three of a kind, one of each
  // non-wildcard type, or some mix of those made up with wildcards (wildcards
  // substitute for any type).
  isValidCardSet(cards: CardType[]): boolean {
    if (cards.length !== 3)
      return false

    const wildcardCount = cards.filter(card => card === 'wildcard').length
    const fixedCards = cards.filter(card => card !== 'wildcard')

    const tryAssign = (assigned: CardType[], wildcardsLeft: number): boolean => {
      if (wildcardsLeft === 0)
        return this.isThreeOfAKindOrOneOfEach(assigned)

      return NON_WILDCARD_TYPES.some(type => tryAssign([...assigned, type], wildcardsLeft - 1))
    }

    return tryAssign(fixedCards, wildcardCount)
  }

  private isThreeOfAKindOrOneOfEach(cards: CardType[]): boolean {
    const distinctTypes = new Set(cards)
    return distinctTypes.size === 1 || distinctTypes.size === 3
  }

  // Validates and executes a card trade-in: removes the 3 selected cards (by index
  // into the current player's hand) and adds the resulting bonus troops to their
  // troopsToDeploy pool. No-op (with a console warning) if the selection is invalid.
  tradeCards(cardIndices: number[]): GameController {
    const player = this.gameState.currentPlayer
    const hand = this.gameState.playerCards[player] ?? []

    const uniqueIndices = Array.from(new Set(cardIndices))
    if (uniqueIndices.length !== 3) {
      console.warn(`Cannot trade cards: expected 3 distinct card indices, got ${JSON.stringify(cardIndices)}`)
      return this
    }

    const cards = uniqueIndices.map(index => hand[index])
    if (cards.some(card => card === undefined)) {
      console.warn(`Cannot trade cards: index out of range for ${player}'s hand`)
      return this
    }

    if (!this.isValidCardSet(cards)) {
      console.warn(`Cannot trade cards: ${JSON.stringify(cards)} is not a valid set`)
      return this
    }

    for (const index of [...uniqueIndices].sort((a, b) => b - a))
      hand.splice(index, 1)

    this.gameState.tradeCount += 1
    const bonus = this.getCardTradeBonus(this.gameState.tradeCount)
    this.gameState.troopsToDeploy += bonus
    console.info(`${player} traded in a card set for trade #${this.gameState.tradeCount}: +${bonus} troops`)

    return this
  }

  hasPlayerLost(_player: string) {
    /* TODO */
    return false
  }

  cycleTerritory(territory: string) {
    const troopState = this.mapController.getTroopState(territory)
    if (!troopState) {
      console.warn(`Could not find territory ${territory}`)
      return
    }

    troopState.player = this.gameState.playerConfigs[troopState.player.position % this.gameState.playerConfigs.length]
  }
}
