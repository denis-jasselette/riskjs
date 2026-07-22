import GameState from '@/models/GameState'
import { PlayerColor } from '@/models/PlayerConfig'

export type RoomSettings = {
  seatCount: number
  blizzards: boolean
  fog: boolean
}

export type Seat = {
  index: number
  nickname: string | null
  connected: boolean
  isHost: boolean
}

export type StartedSeat = Seat & {
  color: PlayerColor
}

export type ClientMessage =
  | { type: 'create_room', payload: { nickname: string, settings: RoomSettings } }
  | { type: 'join_room', payload: { code: string, nickname: string } }
  | { type: 'reconnect', payload: { token: string } }
  | { type: 'update_settings', payload: { settings: RoomSettings } }
  | { type: 'start_game', payload: Record<string, never> }
  | { type: 'leave_room', payload: Record<string, never> }
  | { type: 'end_game', payload: Record<string, never> }

export type ServerMessage =
  | { type: 'joined', payload: { code: string, token: string, seatIndex: number, seats: Seat[], settings: RoomSettings, hostSeatIndex: number } }
  | { type: 'lobby_state', payload: { seats: Seat[], settings: RoomSettings, hostSeatIndex: number } }
  | { type: 'game_started', payload: { seats: StartedSeat[], settings: RoomSettings, gameState: GameState } }
  | { type: 'room_closed', payload: { reason: string } }
  | { type: 'error', payload: { message: string } }
