import { CardType } from '@/models/CardType'

export default interface Card {
  type: CardType
  /** Territory this card depicts. Undefined for wildcards, which have no territory. */
  territory?: string
}
