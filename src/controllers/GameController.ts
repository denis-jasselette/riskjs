import { MapController } from '@/controllers/MapController'
import { diceRoll, randInt } from '@/lib/Random'
import Card from '@/models/Card'
import { GamePhase } from '@/models/GamePhase'
import GameState from '@/models/GameState'
import { PlayerStanding } from '@/models/ResultsData'

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
    // A post-conquest troop-movement choice blocks every other action until
    // it is resolved (FR-007), regardless of phase or ownership -- checked
    // ahead of every other branch below, including capitalDeploy's.
    if (this.gameState.pendingPostConquestMove)
      return false
    if (this.mapController.isTerritoryBlizzard(territory))
      return false
    if (this.gameState.currentPlayer !== viewingPlayer)
      return false
    if (selectedTerritory === territory)
      return true

    const troopCount = this.getTroopCount(territory)
    const owner = this.mapController.getTerritoryOwner(territory)
    if (this.gameState.currentPhase === 'capitalDeploy')
      return owner === this.gameState.currentPlayer
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

  // Round-1 capital placement (Capital Mode only). Assigns `territory` as the
  // current player's capital (write-once -- selectability is enforced by
  // isSelectable()'s 'capitalDeploy' branch, not re-validated here, consistent
  // with deploy()/fortify()'s existing style), grants +2 troops immediately,
  // then advances to the next player in playerConfigs order. Once the last
  // player has chosen, hands off into normal play via startPlayerTurn().
  chooseCapital(territory: string): GameController {
    console.info(`${this.gameState.currentPlayer} chose ${territory} as their capital`)
    this.gameState.capitals[territory] = this.gameState.currentPlayer
    this.mapController.getTroopState(territory)!.count += 2

    const currentPlayerIndex = this.gameState.playerConfigs.findIndex(x => x.color === this.gameState.currentPlayer)
    const isLastPlayer = currentPlayerIndex === this.gameState.playerConfigs.length - 1
    if (isLastPlayer)
      return this.startPlayerTurn(this.gameState.playerConfigs[0].color)

    this.gameState.currentPlayer = this.gameState.playerConfigs[currentPlayerIndex + 1].color
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
    const maxDefender = this.mapController.isTerritoryCapital(defendingTerritory) ? 3 : 2
    const result = this.attackRng(attackingTroops, defendingTroops, { rngType: 'TrueRandom', maxAttacker, maxDefender })
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

      // Post-conquest troop movement (024): the default above already moves
      // every survivor in (FR-005), byte-identical to pre-feature behavior.
      // Only when the winning roll's dice count (the mandatory minimum, FR-002)
      // is strictly less than what's available to move (leaving 1 behind in
      // the source is the maximum, FR-003) is there an actual choice to make
      // -- so pendingPostConquestMove is only ever set in that case (this
      // session's clarification: min === max skips the interactive choice
      // entirely, and the default already applied above is that single valid
      // value). The upper bound is intentionally not stored here -- it is
      // always recomputable as attackingTroopState!.count +
      // defendingTroopState!.count - 1 (see confirmPostConquestMove()).
      const minPostConquestTroops = result.attackerDice.length
      const maxPostConquestTroops = attackingTroopState!.count + defendingTroopState!.count - 1
      if (minPostConquestTroops < maxPostConquestTroops) {
        this.gameState.pendingPostConquestMove = {
          sourceTerritory: attackingTerritory,
          conqueredTerritory: defendingTerritory,
          minTroopsToMove: minPostConquestTroops,
        }
      }

      // The win condition must be (re-)checked after every capture, not only
      // ones that happen to defeat defendingPlayer entirely -- e.g. capturing
      // the last capital not yet owned by the attacker can win a capital-mode
      // game even while defendingPlayer still holds other territories.
      this.checkWinCondition()

      if (this.hasPlayerLost(defendingPlayer)) {
        this.recordKnockoutIfNeeded(defendingPlayer)

        // Skip the transfer when this same conquest was simultaneously the
        // game's winning move (FR-006) -- checkWinCondition() above already
        // reflects that in gameState.gameOver.
        if (!this.gameState.gameOver)
          this.transferCardsOnElimination(defendingPlayer)
      }
    }
    return this
  }

  // Resolves a pending post-conquest troop-movement choice (024): moves
  // exactly `troopsToMove` troops into the conquered territory, leaving the
  // remainder in the source, then clears pendingPostConquestMove. No-op
  // (with a console warning, matching tradeCards()'s existing invalid-input
  // style) if no choice is currently pending, or if troopsToMove falls
  // outside [minTroopsToMove, current combined troop pool - 1] -- the upper
  // bound is always recomputed live from current territory counts rather
  // than stored, since the two territories' combined pool is fixed once
  // combat ends (only its split changes).
  confirmPostConquestMove(troopsToMove: number): GameController {
    const pending = this.gameState.pendingPostConquestMove
    if (!pending) {
      console.warn('Cannot confirm post-conquest move: no move is pending')
      return this
    }

    const { sourceTerritory, conqueredTerritory, minTroopsToMove } = pending
    const maxTroopsToMove = this.getTroopCount(sourceTerritory) + this.getTroopCount(conqueredTerritory) - 1
    if (troopsToMove < minTroopsToMove || troopsToMove > maxTroopsToMove) {
      console.warn(`Cannot confirm post-conquest move: ${troopsToMove} is outside the valid range [${minTroopsToMove}, ${maxTroopsToMove}]`)
      return this
    }

    const conqueredTroopState = this.mapController.getTroopState(conqueredTerritory)
    const sourceTroopState = this.mapController.getTroopState(sourceTerritory)
    const delta = troopsToMove - conqueredTroopState!.count
    conqueredTroopState!.count = troopsToMove
    sourceTroopState!.count -= delta
    this.gameState.pendingPostConquestMove = null

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
    } while (this.hasPlayerLost(this.gameState.playerConfigs[nextPlayerIndex].color) || this.isResigned(this.gameState.playerConfigs[nextPlayerIndex].color))
    return this.gameState.playerConfigs[nextPlayerIndex].color
  }

  startNextPlayerTurn(): GameController {
    this.awardCardIfConquered()

    const currentPlayerIndex = this.gameState.playerConfigs.findIndex(x => x.color === this.gameState.currentPlayer)
    let nextPlayerIndex = currentPlayerIndex
    do {
      nextPlayerIndex = (nextPlayerIndex + 1) % this.gameState.playerConfigs.length
    } while (this.hasPlayerLost(this.gameState.playerConfigs[nextPlayerIndex].color) || this.isResigned(this.gameState.playerConfigs[nextPlayerIndex].color))

    if (this.gameState.capitalMode && nextPlayerIndex <= currentPlayerIndex)
      this.gameState.roundsSincePlacement += 1

    return this.startPlayerTurn(this.gameState.playerConfigs[nextPlayerIndex].color)
  }

  startPlayerTurn(player: string): GameController {
    this.gameState.turnCount += 1
    this.gameState.currentPlayer = player
    this.gameState.troopsToDeploy = this.calculateReinforcement(player, this.gameState.capitalMode ? this.mapController.getPlayerCapitalCount(player) : 0)
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

  // Whether `player` currently owns every capital territory in the game.
  // Pure query, no side effects -- not called from anywhere in this feature;
  // exposed for the separate Win Conditions & Elimination feature to consume.
  ownsAllCapitals(player: string): boolean {
    const capitalTerritories = Object.keys(this.gameState.capitals)
    return this.gameState.capitalMode
      && capitalTerritories.length > 0
      && capitalTerritories.every(t => this.mapController.getTerritoryOwner(t) === player)
  }

  isResigned(player: string): boolean {
    return this.gameState.resignedPlayers.includes(player)
  }

  // Lets a player resign at any time, regardless of whose turn it currently
  // is (FR-008). Territories/troops are left completely untouched (FR-009) --
  // this only records the resignation, snapshots their knockout moment (used
  // by getStandings()'s ranking), and re-checks the win condition, since a
  // resignation alone can satisfy the conquest-mode win condition (this
  // feature's resignation-triggers-win clarification). If the resigning
  // player is currently mid-turn, their turn ends now (mirrors how fortify()
  // already ends a turn) -- otherwise the current turn is left undisturbed.
  resign(player: string): GameController {
    if (!this.gameState.resignedPlayers.includes(player))
      this.gameState.resignedPlayers.push(player)

    this.recordKnockoutIfNeeded(player)
    this.checkWinCondition()

    // Only advance the turn if some other player is actually still eligible
    // to take it -- guards against an infinite skip-loop in
    // startNextPlayerTurn() for the rare case of the last remaining eligible
    // player resigning (e.g. after the game has already been won).
    const hasEligibleNextPlayer = this.gameState.playerConfigs
      .some(p => p.color !== player && !this.hasPlayerLost(p.color) && !this.isResigned(p.color))

    if (player === this.gameState.currentPlayer && hasEligibleNextPlayer)
      return this.startNextPlayerTurn()

    return this
  }

  // Snapshots `player`'s knockout moment (players still in, including
  // themselves, immediately before this transition) the first time they
  // resign or are defeated, whichever comes first. Never overwritten
  // afterward -- a player who resigns and is later defeated keeps their
  // resignation moment as their ranking snapshot (FR-016, US4 Acceptance
  // Scenario 4).
  private recordKnockoutIfNeeded(player: string): void {
    if (player in this.gameState.knockoutOrder)
      return

    this.gameState.knockoutOrder[player] = {
      playersRemaining: this.gameState.playerConfigs.length - Object.keys(this.gameState.knockoutOrder).length,
      turnAtKnockout: this.gameState.turnCount,
    }
  }

  // The conquest-mode winner, if any: the single player who owns every
  // territory that is neither blizzard-frozen nor still held by a resigned
  // player (FR-002). undefined if no such territory exists, or if the
  // remaining eligible territories are still split among more than one owner.
  private findConquestWinner(): string | undefined {
    const eligibleOwners = Object.keys(this.gameState.mapConfig.territories)
      .filter(t => !this.mapController.isTerritoryBlizzard(t))
      .map(t => this.mapController.getTerritoryOwner(t))
      .filter((owner): owner is string => owner !== undefined && !this.isResigned(owner))

    if (eligibleOwners.length === 0)
      return undefined

    const candidate = eligibleOwners[0]
    return eligibleOwners.every(owner => owner === candidate) ? candidate : undefined
  }

  // The capital-mode winner, if any: the single player who owns every
  // capital currently in the game (FR-003), regardless of resignation or
  // non-capital territory distribution.
  private findCapitalWinner(): string | undefined {
    return this.gameState.playerConfigs.find(p => this.ownsAllCapitals(p.color))?.color
  }

  // Checks whether the active win condition for the current game mode is now
  // met, and if so, ends the game (FR-001, FR-004). No-op once gameOver is
  // already true -- the game cannot "un-end" or switch winners.
  private checkWinCondition(): GameController {
    if (this.gameState.gameOver)
      return this

    if (this.getWinner() !== undefined)
      this.gameState.gameOver = true

    return this
  }

  // Public re-derivation of the current winner, if any, via the same logic
  // checkWinCondition() uses -- independent of gameOver's own truthiness.
  // Needed because gameOver is also used elsewhere as a pre-existing
  // "no game currently in progress" idle/reset sentinel (e.g. GameState's
  // constructor default, and GameLogic.defaultGameState()) that is NOT the
  // result of an actual win; UI wiring that needs to tell "a real win just
  // happened" apart from "no game has started yet" should check this,
  // rather than gameOver alone.
  //
  // A sole remaining active (non-defeated, non-resigned) player always wins
  // outright, regardless of game mode -- this overrides the mode-specific
  // check below rather than supplementing it, since it's possible for the
  // last active player to not yet technically satisfy that check (e.g. in
  // capital mode, resignation doesn't transfer capital ownership, so the
  // last active player might not yet "own every capital" even though no one
  // is left to contest them). Without this, a capital-mode game can never
  // end via resignation alone, only via an actual capital capture.
  getWinner(): string | undefined {
    const activePlayers = this.gameState.playerConfigs.filter(p => !this.hasPlayerLost(p.color) && !this.isResigned(p.color))
    if (activePlayers.length === 1)
      return activePlayers[0].color

    return this.gameState.capitalMode ? this.findCapitalWinner() : this.findConquestWinner()
  }

  // The full three-tier final ranking (winner, then still-alive non-winners
  // by troop count, then defeated/resigned by how many players remained at
  // their knockout moment), recomputed fresh on every call -- never cached,
  // matching calculateReinforcement()'s existing "recalculated fresh every
  // time" style. Also used mid-game (before gameOver) to drive the personal,
  // interim elimination view -- the winner tier is simply empty until the
  // game actually ends.
  getStandings(): PlayerStanding[] {
    const winner = this.gameState.gameOver ? this.getWinner() : undefined

    const standings: PlayerStanding[] = []

    if (winner !== undefined) {
      const winnerConfig = this.gameState.playerConfigs.find(p => p.color === winner)
      if (winnerConfig) {
        standings.push({
          player: winnerConfig,
          rank: 1,
          territories: this.getPlayerTerritoryTotal(winner),
          troops: this.getPlayerTroopTotal(winner),
          turnsAlive: this.gameState.turnCount,
        })
      }
    }

    const stillAlive = this.gameState.playerConfigs
      .filter(p => p.color !== winner && !this.hasPlayerLost(p.color) && !this.isResigned(p.color))
      .sort((a, b) => this.getPlayerTroopTotal(b.color) - this.getPlayerTroopTotal(a.color))

    for (const p of stillAlive) {
      standings.push({
        player: p,
        rank: standings.length + 1,
        territories: this.getPlayerTerritoryTotal(p.color),
        troops: this.getPlayerTroopTotal(p.color),
        turnsAlive: this.gameState.turnCount,
      })
    }

    // Ranked worst-last: a player eliminated while more players were still
    // in the game (a larger playersRemaining snapshot) ranks below a player
    // eliminated while fewer players remained (FR-016), so ascending order
    // puts the latest-eliminated player right after the still-alive tier and
    // the earliest-eliminated player at the very bottom of the standings.
    const knockedOut = this.gameState.playerConfigs
      .filter(p => p.color in this.gameState.knockoutOrder)
      .sort((a, b) => this.gameState.knockoutOrder[a.color].playersRemaining - this.gameState.knockoutOrder[b.color].playersRemaining)

    for (const p of knockedOut) {
      standings.push({
        player: p,
        rank: standings.length + 1,
        territories: null,
        troops: null,
        turnsAlive: this.gameState.knockoutOrder[p.color].turnAtKnockout,
      })
    }

    return standings
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
