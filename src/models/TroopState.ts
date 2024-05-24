import PlayerConfig from "./PlayerConfig";

export default interface TroopState {
  territory: string
  count: number
  player: PlayerConfig
}