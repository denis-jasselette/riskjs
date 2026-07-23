import { MapController } from '@/controllers/MapController'
import { diceRoll, randInt } from '@/lib/Random'
import Card from '@/models/Card'
import { GamePhase } from '@/models/GamePhase'
import GameState from '@/models/GameState'

// Progressive trade-in bonus table (1-indexed trade number).
// Trade 1: 4, 2: 6, 3: 8, 4: 10, 5: 12, 6: 15, 7+: +5 per subsequent trade.
const PROGRESSIVE_CARD_BONUS_TABLE = [4, 6, 8, 10, 12, 15]
const PROGRESSIVE_CARD_BONUS_STEP = 5

// A traded 3-card set resolves to one of these kinds (wildcards substitute
// whichever type(s) make the set valid): three of one non-wildcard type, or
// "mixed" (one of each of the three non-wildcard types).
export type CardSetKind = 'infantry' | 'cavalry' | 'artillery' | 'mixed'

// Classic Risk fixed-mode bonus table, by resolved set kind.
const FIXED_CARD_BONUS_TABLE: Record<CardSetKind, number> = {
  infantry: 4,
  cavalry: 6,
  artillery: 8,
  mixed: 10,
}

// A player holding this many cards or more must trade in a valid set before
// taking any other action, immediately and repeatedly until below this count.
const FORCED_TRADE_IN_THRESHOLD = 5

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

  isSelectable(territory: string, selectedTerritory: string | null, viewingPlayer: string): boolean {
    if (this.mapController.isTerritoryBlizzard(territory))
      return false
    if (this.gameState.currentPlayer !== viewingPlayer)
      return false
    if (selectedTerritory === territory)
      return true

    const troopCount = this.getTroopCount(territory)
    const owner = this.mapController.getTerritoryOwner(territory)
    if (this.gameState.currentPhase === 'deploy')
      return owner === this.gameState.currentPlayer && !this.hasForcedTradeIn()
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

    // Auto-advance only once there's nothing left to deploy AND no trade-in
    // (optional or forced) is available — a player with a usable set gets a
    // manual decision point (via Continue/trade) instead of being swept past it.
    if (this.gameState.troopsToDeploy <= 0 && !this.hasAvailableTradeIn())
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
    const defendingPlayer = defendingTroopState!.player.color
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

      if (this.hasPlayerLost(defendingPlayer))
        this.transferCardsOnElimination(defendingPlayer)
    }
    return this
  }

  // Classic Risk rule: eliminating a player transfers their entire hand to
  // the eliminator. If that pushes the eliminator's hand to the forced
  // trade-in threshold, the game returns to deploy phase — the only phase
  // trading happens in — so the forced cascade can be resolved immediately.
  private transferCardsOnElimination(defeatedPlayer: string): void {
    const attacker = this.gameState.currentPlayer
    const defeatedHand = this.gameState.playerCards[defeatedPlayer] ?? []
    if (defeatedHand.length === 0)
      return

    this.gameState.playerCards[attacker] = [...(this.gameState.playerCards[attacker] ?? []), ...defeatedHand]
    this.gameState.playerCards[defeatedPlayer] = []
    console.info(`${attacker} eliminated ${defeatedPlayer} and took their ${defeatedHand.length} card(s)`)

    if (this.hasForcedTradeIn(attacker))
      this.startPhase('deploy')
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
    this.gameState.troopsToDeploy = this.calculateReinforcement(player)
    this.gameState.conqueredTerritoryThisTurn = false
    console.info(`Starting player ${player}'s turn with ${this.gameState.troopsToDeploy} troops to deploy`)
    return this.startPhase('deploy')
  }

  // Start-of-turn reinforcement total: territory rule + continent rule + capital
  // rule, recalculated fresh every time (never cached). `capitalsOwned` defaults
  // to 0 since Capital Mode does not exist yet; once it does, the caller can pass
  // the player's real capital count without changing this method's contract.
  calculateReinforcement(player: string, capitalsOwned = 0): number {
    const territoryBonus = Math.max(3, Math.floor(this.getPlayerTerritoryTotal(player) / 3))

    const continentBonus = Object.keys(this.gameState.mapConfig.continents)
      .filter(continent => this.mapController.getContinentOwner(continent) === player)
      .reduce((sum, continent) => sum + this.gameState.mapConfig.continents[continent].bonusTroops, 0)

    const capitalBonus = capitalsOwned * 2

    return territoryBonus + continentBonus + capitalBonus
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
    console.info(`${player} drew a ${card.type} card${card.territory ? ` (${card.territory})` : ''}`)
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
  // selected cardBonusMode. Fixed mode awards a distinct amount per resolved set
  // kind (see FIXED_CARD_BONUS_TABLE); progressive mode ignores setKind entirely
  // and follows the classic escalating Risk table (see PROGRESSIVE_CARD_BONUS_TABLE).
  getCardTradeBonus(tradeNumber: number, setKind: CardSetKind): number {
    if (this.gameState.cardBonusMode === 'fixed')
      return FIXED_CARD_BONUS_TABLE[setKind]

    if (tradeNumber <= PROGRESSIVE_CARD_BONUS_TABLE.length)
      return PROGRESSIVE_CARD_BONUS_TABLE[tradeNumber - 1]

    const stepsPastTable = tradeNumber - PROGRESSIVE_CARD_BONUS_TABLE.length
    return PROGRESSIVE_CARD_BONUS_TABLE[PROGRESSIVE_CARD_BONUS_TABLE.length - 1] + stepsPastTable * PROGRESSIVE_CARD_BONUS_STEP
  }

  // Resolves a set of exactly 3 cards to the specific kind it forms (wildcards
  // substitute for whichever type(s) make it valid), or null if no valid set
  // exists at all. Ties always favor "mixed" (one of each) since it is worth at
  // least as much as any three-of-a-kind in every bonus mode, so a set that could
  // be read either way (e.g. one real card plus two wildcards) always resolves
  // to the interpretation that's at least as good for the trading player.
  resolveCardSetKind(cards: Card[]): CardSetKind | null {
    if (cards.length !== 3)
      return null

    const types = cards.map(card => card.type)
    const fixedTypes = types.filter(type => type !== 'wildcard')
    const distinctFixedTypes = new Set(fixedTypes)

    // "Mixed" (one of each) is achievable whenever the real (non-wildcard)
    // cards are already pairwise distinct — any wildcards fill in the rest.
    if (distinctFixedTypes.size === fixedTypes.length)
      return 'mixed'

    // Otherwise, three-of-a-kind is only achievable if every real card is the
    // same type (that type is then the only possible resolution).
    if (distinctFixedTypes.size === 1)
      return fixedTypes[0] as CardSetKind

    return null
  }

  isValidCardSet(cards: Card[]): boolean {
    return this.resolveCardSetKind(cards) !== null
  }

  // Whether any 3-card subset of the player's current hand forms a valid set
  // (an "available" trade-in, whether optional or forced).
  hasAvailableTradeIn(player: string = this.gameState.currentPlayer): boolean {
    const hand = this.gameState.playerCards[player] ?? []
    for (let i = 0; i < hand.length; i++) {
      for (let j = i + 1; j < hand.length; j++) {
        for (let k = j + 1; k < hand.length; k++) {
          if (this.resolveCardSetKind([hand[i], hand[j], hand[k]]) !== null)
            return true
        }
      }
    }
    return false
  }

  // A hand at or above the threshold must trade before any other action is
  // available (see isSelectable's deploy-phase gate and startPlayerTurn).
  hasForcedTradeIn(player: string = this.gameState.currentPlayer): boolean {
    return this.getPlayerCardTotal(player) >= FORCED_TRADE_IN_THRESHOLD
  }

  // Validates and executes a card trade-in: removes the 3 selected cards (by index
  // into the current player's hand), returns them to the deck at a random position
  // (so they remain in circulation), and adds the resulting bonus troops to the
  // player's troopsToDeploy pool. No-op (with a console warning) if the selection
  // is invalid. If the player currently occupies the territory shown on one or
  // more of the traded (non-wildcard) cards, regardless of bonus mode,
  // `bonusTerritory` selects which single occupied territory receives the +2
  // territory bonus — required when more than one traded territory is occupied,
  // since the bonus applies to only one regardless of how many qualify;
  // ignored/unused otherwise.
  tradeCards(cardIndices: number[], bonusTerritory?: string): GameController {
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

    const setKind = this.resolveCardSetKind(cards)
    if (setKind === null) {
      console.warn(`Cannot trade cards: ${JSON.stringify(cards)} is not a valid set`)
      return this
    }

    for (const index of [...uniqueIndices].sort((a, b) => b - a))
      hand.splice(index, 1)

    this.gameState.tradeCount += 1
    const bonus = this.getCardTradeBonus(this.gameState.tradeCount, setKind)
    this.gameState.troopsToDeploy += bonus
    console.info(`${player} traded in a ${setKind} set for trade #${this.gameState.tradeCount}: +${bonus} troops`)

    const occupiedTerritories = cards
      .filter((card): card is Card & { territory: string } => !!card.territory && this.mapController.getTerritoryOwner(card.territory) === player)
      .map(card => card.territory)
    const bonusTerritoryToApply = (bonusTerritory && occupiedTerritories.includes(bonusTerritory)) ? bonusTerritory : occupiedTerritories[0]
    if (bonusTerritoryToApply) {
      this.mapController.getTroopState(bonusTerritoryToApply)!.count += 2
      console.info(`${player} occupies ${bonusTerritoryToApply} — +2 territory bonus applied`)
    }

    const randomPosition = randInt(0, this.gameState.deck.length)
    this.gameState.deck.splice(randomPosition, 0, ...cards)

    return this
  }

  hasPlayerLost(player: string): boolean {
    return this.getPlayerTerritoryTotal(player) === 0
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
