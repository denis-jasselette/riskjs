import GameState from '@/models/GameState'

const KEY = 'riskjs_save'

export const saveGame = (state: GameState): void => {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export const loadGame = (): GameState | null => {
  try {
    const s = localStorage.getItem(KEY)
    return s ? JSON.parse(s) : null
  }
  catch {
    return null
  }
}

export const clearSave = (): void => {
  localStorage.removeItem(KEY)
}
