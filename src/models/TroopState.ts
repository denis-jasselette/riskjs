import PlayerConfig from '@/models/PlayerConfig'

export default interface TroopState {
  territory: string
  count: number
  player: PlayerConfig
}
