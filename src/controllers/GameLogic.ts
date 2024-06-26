import GameController from '@/controllers/GameController'
import { distribute, shuffle } from '@/lib/Random'
import GameState from '@/models/GameState'
import MapConfig from '@/models/MapConfig'
import PlayerConfig from '@/models/PlayerConfig'
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
        return deck.slice(0, mapConfig.blizzards)
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

  static initState(mapConfig: MapConfig, playerConfigs: PlayerConfig[], blizzardsEnabled: boolean, gameOver: boolean = false): GameState {
    const [troops, blizzards] = this.autoSetupTroops(mapConfig, playerConfigs, blizzardsEnabled)

    const state: GameState = {
      gameOver: gameOver,
      mapConfig: mapConfig,
      playerConfigs: playerConfigs,
      troops: troops,
      blizzards: blizzards,
      userPlayer: playerConfigs[0].color,
      currentPlayer: playerConfigs[0].color,
      currentPhase: 'deploy',
      troopsToDeploy: 0,
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
