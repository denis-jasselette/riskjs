import Card from '@/models/Card'
import { CardBonusMode } from '@/models/CardBonusMode'
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
  currentPhase: GamePhase
  /** Whether Capital Mode is enabled for this game. Set once at game creation, never changes. */
  capitalMode: boolean
  /** Capital assignments: territory name -> color of the player who chose it as their capital. Write-once per territory; stays empty when capitalMode is false. */
  capitals: Record<string, string>
  /** Full turn cycles completed since the capital-placement round, incremented by GameController.startNextPlayerTurn(). Meaningful only when capitalMode is true; never decremented. */
  roundsSincePlacement: number
  /** Player colors who have resigned. Append-only for the life of a game; territories/troops are untouched by resignation itself. */
  resignedPlayers: string[]
  /** Player color -> knockout snapshot, written exactly once per player (first of resignation or defeat, whichever comes first). Absent entries mean "never defeated or resigned" (still active, or the eventual winner). */
  knockoutOrder: Record<string, { playersRemaining: number, turnAtKnockout: number }>
  /** Individual player-turns elapsed so far, incremented once per GameController.startPlayerTurn() call, in every game mode. */
  turnCount: number

  /* TODO */
  portals?: string[]
  fogEnabled: boolean
  troopsToDeploy: number

  /** Remaining shuffled Risk-card deck, built from mapConfig.cards at game start. */
  deck: Card[]
  /** Cards currently held by each player, keyed by player color. */
  playerCards: Record<string, Card[]>
  /** Whether the current player has captured at least one territory this turn (resets each turn). */
  conqueredTerritoryThisTurn: boolean
  /** How many card-set trades have happened this game, across all players. */
  tradeCount: number
  /** Fixed vs progressive bonus-troop table for card trade-ins. */
  cardBonusMode: CardBonusMode
  /**
   * The attacking player's not-yet-resolved choice of how many troops to move
   * into a just-conquered territory, or null when no such choice is pending.
   * Set by GameController.attack()'s conquest branch only when there's an
   * actual choice to make (the winning roll's dice count is strictly less
   * than the troops available to move); cleared by
   * GameController.confirmPostConquestMove(). While non-null, blocks all
   * other action (see isSelectable()/PhaseEndButton). minTroopsToMove is the
   * only bound stored here -- the upper bound is always recomputed live from
   * current territory counts, never persisted.
   */
  pendingPostConquestMove: { sourceTerritory: string, conqueredTerritory: string, minTroopsToMove: number } | null

  constructor() {
    this.gameOver = true
    this.mapConfig = new MapConfig()
    this.playerConfigs = []
    this.troops = []
    this.blizzards = []
    this.currentPlayer = ''
    this.currentPhase = 'deploy'
    this.capitalMode = false
    this.capitals = {}
    this.roundsSincePlacement = 0
    this.resignedPlayers = []
    this.knockoutOrder = {}
    this.turnCount = 0
    this.fogEnabled = false
    this.troopsToDeploy = 0
    this.deck = []
    this.playerCards = {}
    this.conqueredTerritoryThisTurn = false
    this.tradeCount = 0
    this.cardBonusMode = 'fixed'
    this.pendingPostConquestMove = null
  }
}
