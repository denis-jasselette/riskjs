import { PlayerColor } from '@/models/PlayerConfig'

/** Mirrors $troop-colors in src/theme/_colors.scss. Keep in sync. */
export const TROOP_COLORS: Record<PlayerColor, string> = {
  white: '#beb6b6',
  black: '#333333',
  red: '#e40a1c',
  green: '#3ca73c',
  blue: '#3636e4',
  purple: 'purple',
  pink: '#ff00aa',
  orange: '#f07a0b',
  yellow: '#e9b025',
}
