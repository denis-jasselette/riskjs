import GameState from '@/models/GameState'
import { PlayerColor } from '@/models/PlayerConfig'
import { PlayerStanding } from '@/models/ResultsData'

export type GameActionType =
  | 'deploy'
  | 'attack'
  | 'confirm_post_conquest_move'
  | 'fortify'
  | 'trade_cards'
  | 'end_phase'
  | 'place_capital'
  | 'resign'

export type ClientGameMessage =
  | { type: 'deploy', payload: { troops: number, territory: string } }
  | { type: 'attack', payload: { attackingTroops: number, attackingTerritory: string, defendingTerritory: string, diceCount?: number } }
  | { type: 'confirm_post_conquest_move', payload: { troopsToMove: number } }
  | { type: 'fortify', payload: { troops: number, fromTerritory: string, toTerritory: string } }
  | { type: 'trade_cards', payload: { cardIndices: number[], bonusTerritory?: string } }
  | { type: 'end_phase', payload: Record<string, never> }
  | { type: 'place_capital', payload: { territory: string } }
  | { type: 'resign', payload: Record<string, never> }

export type ActionEventPayload =
  | { actionType: 'deploy', by: PlayerColor, troops: number, territory: string }
  | {
    actionType: 'attack'
    by: PlayerColor
    attackingTerritory: string
    defendingTerritory: string
    attackerDice: number[]
    defenderDice: number[]
    attackerLosses: number
    defenderLosses: number
    conqueredTerritory?: string
  }
  | { actionType: 'confirm_post_conquest_move', by: PlayerColor, troopsToMove: number }
  | { actionType: 'fortify', by: PlayerColor, troops: number, fromTerritory: string, toTerritory: string }
  | { actionType: 'trade_cards', by: PlayerColor, cardIndices: number[], bonusTerritory?: string }
  | { actionType: 'end_phase', by: PlayerColor }
  | { actionType: 'place_capital', by: PlayerColor, territory: string }
  | { actionType: 'resign', by: PlayerColor }

export type ServerGameMessage =
  | { type: 'action_event', payload: ActionEventPayload }
  | { type: 'state_snapshot', payload: { gameState: GameState } }
  | { type: 'elimination_notice', payload: { player: PlayerColor } }
  | { type: 'game_over', payload: { winner?: PlayerColor, standings: PlayerStanding[] } }
  | { type: 'error', payload: { message: string } }
