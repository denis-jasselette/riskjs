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
  troopsToDeploy: number

  constructor() {
    this.gameOver = true
    this.mapConfig = new MapConfig()
    this.playerConfigs = []
    this.troops = []
    this.blizzards = []
    this.userPlayer = ''
    this.currentPlayer = ''
    this.currentPhase = 'deploy'
    this.troopsToDeploy = 0
  }
}
