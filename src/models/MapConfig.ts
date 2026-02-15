import { CardType } from '@/models/CardType'
import TerritoryConfig from '@/models/TerritoryConfig'

export default class MapConfig {
  name: string
  width: number
  height: number
  troopSize: number
  continents: Record<string, {
    bonusTroops: number
    path: string
  }>

  territories: Record<string, TerritoryConfig>
  cards: {
    wildcards: number
    territories: Record<string, CardType>
  }

  blizzards: number

  constructor() {
    this.name = ''
    this.width = 0
    this.height = 0
    this.troopSize = 0
    this.continents = {}
    this.territories = {}
    this.cards = {
      wildcards: 0,
      territories: {},
    }
    this.blizzards = 0
  }
}
