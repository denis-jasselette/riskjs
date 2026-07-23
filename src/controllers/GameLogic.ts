import GameController from '@/controllers/GameController'
import { distribute, shuffle, shuffled } from '@/lib/Random'
import { CardBonusMode } from '@/models/CardBonusMode'
import { CardType } from '@/models/CardType'
import GameState from '@/models/GameState'
import MapConfig from '@/models/MapConfig'
import PlayerConfig from '@/models/PlayerConfig'
import TerritoryConfig from '@/models/TerritoryConfig'
import TroopState from '@/models/TroopState'

const initTroopsTable: Record<number, number> = {
  6: 20,
  5: 25,
  4: 30,
  3: 35,
  2: 40,
}

export default class GameLogic {
  static autoSetupTroops(mapConfig: MapConfig, playerConfigs: PlayerConfig[], blizzardsEnabled: boolean): [TroopState[], string[]] {
    const playerCount = playerConfigs.length
    const initTroops = initTroopsTable[playerCount]

    const deck = Object.keys(mapConfig.cards.territories)
    shuffle(deck)
    let remainingCardCount = deck.length
    let topDeckIndex = 0

    const blizzards = (() => {
      if (blizzardsEnabled) {
        remainingCardCount -= mapConfig.blizzards
        topDeckIndex += mapConfig.blizzards

        const frozen = this.selectConnectivitySafeBlizzards(mapConfig)

        // Reorder deck in place so the chosen frozen territories occupy
        // indices [0, mapConfig.blizzards), preserving the relative order of
        // the rest so the topDeckIndex/remainingCardCount dealing below keeps
        // working unmodified.
        const frozenSet = new Set(frozen)
        const rest = deck.filter(territory => !frozenSet.has(territory))
        deck.splice(0, deck.length, ...frozen, ...rest)

        return frozen
      }
      else {
        return []
      }
    })()

    const troops: TroopState[] = []
    for (let i = 0; i < playerCount; i++) {
      const playerCardCount = Math.floor(remainingCardCount / (playerCount - i))
      const deployedTroops = distribute(initTroops - playerCardCount, playerCardCount)

      for (let j = 0; j < playerCardCount; j++) {
        troops.push({
          territory: deck[topDeckIndex + j],
          count: deployedTroops[j] + 1,
          player: playerConfigs[i],
        })
      }

      remainingCardCount -= playerCardCount
      topDeckIndex += playerCardCount
    }

    return [troops, blizzards]
  }

  // Randomly selects mapConfig.blizzards territories to freeze such that the
  // remaining (non-frozen) territories always stay fully connected.
  //
  // Repeatedly sweeps the not-yet-frozen territories in a freshly shuffled
  // order; within a sweep, greedily freezes a candidate only if the graph
  // formed by the territories NOT yet frozen (including this candidate)
  // still has a single connected component, otherwise skips it. A single
  // sweep alone is not enough: whether freezing a given territory is safe
  // depends on what else is already frozen (e.g. on a path graph, freezing
  // an interior node is only safe once its neighbor toward one end is
  // already frozen), so a candidate skipped early in one sweep may become
  // safe later once other freezes have happened. Sweeping repeatedly until
  // a full sweep makes no further progress lets those candidates be
  // reconsidered instead of being permanently discarded.
  //
  // Runs before any GameState exists, so it operates directly on mapConfig
  // rather than via MapController.
  private static selectConnectivitySafeBlizzards(mapConfig: MapConfig): string[] {
    const allTerritories = Object.keys(mapConfig.territories)
    const frozen = new Set<string>()

    let progressed = true
    while (frozen.size < mapConfig.blizzards && progressed) {
      progressed = false

      const candidates = shuffled(allTerritories.filter(territory => !frozen.has(territory)))
      for (const territory of candidates) {
        if (frozen.size >= mapConfig.blizzards)
          break

        frozen.add(territory)
        if (this.isConnectedExcluding(mapConfig.territories, frozen))
          progressed = true
        else
          frozen.delete(territory)
      }
    }

    return Array.from(frozen)
  }

  // Plain BFS reachability check: are all territories NOT in `excluded`
  // reachable from one another via a path through only non-excluded
  // territories? 0 or 1 remaining territories are vacuously connected.
  private static isConnectedExcluding(territories: Record<string, TerritoryConfig>, excluded: Set<string>): boolean {
    const remaining = Object.keys(territories).filter(territory => !excluded.has(territory))
    if (remaining.length <= 1)
      return true

    const visited = new Set<string>([remaining[0]])
    const queue: string[] = [remaining[0]]

    while (queue.length > 0) {
      const current = queue.shift() as string
      const adjacency = territories[current]?.adjacency ?? []

      for (const neighbor of adjacency) {
        if (excluded.has(neighbor) || visited.has(neighbor))
          continue

        visited.add(neighbor)
        queue.push(neighbor)
      }
    }

    return visited.size === remaining.length
  }

  // The classic Risk card deck: one card per territory (per mapConfig.cards.territories)
  // plus a handful of wildcards, shuffled into a persistent draw pile.
  static buildCardDeck(mapConfig: MapConfig): CardType[] {
    const deck: CardType[] = [
      ...Object.values(mapConfig.cards.territories),
      ...Array(mapConfig.cards.wildcards).fill('wildcard' as CardType),
    ]
    shuffle(deck)
    return deck
  }

  static initState(mapConfig: MapConfig, playerConfigs: PlayerConfig[], blizzardsEnabled: boolean, gameOver: boolean = false, fogEnabled: boolean = false, cardBonusMode: CardBonusMode = 'fixed'): GameState {
    const [troops, blizzards] = this.autoSetupTroops(mapConfig, playerConfigs, blizzardsEnabled)

    const playerCards: Record<string, CardType[]> = {}
    playerConfigs.forEach((player) => {
      playerCards[player.color] = []
    })

    const state: GameState = {
      gameOver: gameOver,
      mapConfig: mapConfig,
      playerConfigs: playerConfigs,
      troops: troops,
      blizzards: blizzards,
      currentPlayer: playerConfigs[0].color,
      currentPhase: 'deploy',
      fogEnabled: fogEnabled,
      troopsToDeploy: 0,
      deck: this.buildCardDeck(mapConfig),
      playerCards: playerCards,
      conqueredTerritoryThisTurn: false,
      tradeCount: 0,
      cardBonusMode: cardBonusMode,
    }
    if (gameOver)
      return state

    return new GameController(state).startPlayerTurn(playerConfigs[0].color).gameState
  }

  static defaultGameState(mapConfig: MapConfig): GameState {
    const playerConfigs: PlayerConfig[] = [
      { currentUser: false, name: 'Albert', color: 'white', human: true, position: 1 },
      { currentUser: false, name: 'Bernard', color: 'black', human: true, position: 2 },
      { currentUser: false, name: 'Cédric', color: 'red', human: true, position: 3 },
      { currentUser: false, name: 'David', color: 'green', human: true, position: 4 },
      { currentUser: false, name: 'Eric', color: 'blue', human: true, position: 5 },
      { currentUser: false, name: 'Fabien', color: 'purple', human: true, position: 6 },
    ]

    const state = this.initState(mapConfig, playerConfigs, false, true)
    return state
  }
}
