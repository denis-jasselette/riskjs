export type PlayerColor = 'black' | 'white' | 'pink' | 'purple' | 'green' | 'blue' | 'red' | 'yellow' | 'orange'

export const PlayerColorValues: PlayerColor[] = ['black', 'white', 'pink', 'purple', 'green', 'blue', 'red', 'yellow', 'orange']

export type BotSkill = 'easy' | 'medium' | 'hard' | 'expert'
export type BotBehavior = 'automated' | 'neutral'

export default interface PlayerConfig {
  currentUser: boolean
  name: string
  color: PlayerColor
  human: boolean
  botSkill?: BotSkill
  /** Independent of botSkill (FR-009) -- absent/undefined on a bot seat means 'automated'. */
  botBehavior?: BotBehavior
  position: number

  host?: boolean
  country?: string
  avatar?: string
  decoration?: string
  troopShape?: string
}
