import TroopState from "./TroopState";
import MapConfig from "./MapConfig";
import PlayerConfig from "./PlayerConfig";
import { GamePhase } from "./GamePhase";

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
  portals?: any
  fog?: any

  constructor() {
    this.gameOver = true
    this.mapConfig = new MapConfig()
    this.playerConfigs = []
    this.troops = []
    this.blizzards = []
    this.userPlayer = ""
    this.currentPlayer = ""
    this.currentPhase = "deploy"
  }
}