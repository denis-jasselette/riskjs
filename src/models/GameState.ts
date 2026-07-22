import { CardBonusMode } from '@/models/CardBonusMode'
import { CardType } from '@/models/CardType'
import { GamePhase } from '@/models/GamePhase'
import MapConfig from '@/models/MapConfig'
import PlayerConfig from '@/models/PlayerConfig'
import TroopState from '@/models/TroopState'

export default class GameState {
  gameOver: boolean
  mapConfig: MapConfig
  playerConfigs: PlayerConfig[]
  troops: TroopState[]
  blizzards: string[]
  currentPlayer: string
  userPlayer: string
  currentPhase: GamePhase

  /* TODO */
  portals?: string[]
  fog?: string[]
  fogEnabled: boolean
  troopsToDeploy: number

  /** Remaining shuffled Risk-card deck, built from mapConfig.cards at game start. */
  deck: CardType[]
  /** Cards currently held by each player, keyed by player color. */
  playerCards: Record<string, CardType[]>
  /** Whether the current player has captured at least one territory this turn (resets each turn). */
  conqueredTerritoryThisTurn: boolean
  /** How many card-set trades have happened this game, across all players. */
  tradeCount: number
  /** Fixed vs progressive bonus-troop table for card trade-ins. */
  cardBonusMode: CardBonusMode

  constructor() {
    this.gameOver = true
    this.mapConfig = new MapConfig()
    this.playerConfigs = []
    this.troops = []
    this.blizzards = []
    this.userPlayer = ''
    this.currentPlayer = ''
    this.currentPhase = 'deploy'
    this.fogEnabled = false
    this.troopsToDeploy = 0
    this.deck = []
    this.playerCards = {}
    this.conqueredTerritoryThisTurn = false
    this.tradeCount = 0
    this.cardBonusMode = 'fixed'
  }
}
