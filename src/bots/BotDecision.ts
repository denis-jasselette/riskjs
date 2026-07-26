// Structurally aligned with feature 001's ClientGameMessage action variants
// (same field names/shapes) by deliberate design, without importing that
// type directly -- see specs/002-bot-ai/research.md decision 2.
export type BotDecision =
  | { type: 'choose_capital', territory: string }
  | { type: 'deploy', troops: number, territory: string }
  | { type: 'attack', attackingTerritory: string, defendingTerritory: string, attackingTroops: number }
  | { type: 'confirm_post_conquest_move', troopsToMove: number }
  | { type: 'fortify', fromTerritory: string, toTerritory: string, troops: number }
  | { type: 'trade_cards', cardIndices: number[], bonusTerritory?: string }
  | { type: 'end_phase' }
