import type { Meta, StoryObj } from '@storybook/react'

import ResultsModal from '@/components/menu/ResultsModal'
import PlayerConfig from '@/models/PlayerConfig'
import { PlayerStanding, TurnSnapshot } from '@/models/ResultsData'

/* ── Fixture players ── */

const blue: PlayerConfig = { currentUser: true, name: 'Blue', color: 'blue', human: true, position: 1 }
const yellow: PlayerConfig = { currentUser: false, name: 'Yellow', color: 'yellow', human: true, position: 2 }
const green: PlayerConfig = { currentUser: false, name: 'Green', color: 'green', human: true, position: 3 }
const red: PlayerConfig = { currentUser: false, name: 'Red', color: 'red', human: true, position: 4 }

/* ── Fixture standings ── */

const standingsGameOver: PlayerStanding[] = [
  { player: blue, rank: 1, territories: 42, troops: 87, turnsAlive: 34, rating: 1540, ratingDelta: 28 },
  { player: yellow, rank: 2, territories: null, troops: null, turnsAlive: 28, rating: 1480, ratingDelta: -11 },
  { player: green, rank: 3, territories: null, troops: null, turnsAlive: 19, rating: 1390, ratingDelta: -9 },
  { player: red, rank: 4, territories: null, troops: null, turnsAlive: 12, rating: 1610, ratingDelta: -8 },
]

const standingsMidGame: PlayerStanding[] = [
  { player: blue, rank: 1, territories: 26, troops: 54, turnsAlive: 19 },
  { player: yellow, rank: 2, territories: 16, troops: 31, turnsAlive: 19 },
  { player: green, rank: 3, territories: null, troops: null, turnsAlive: 19, rating: 1390 },
]

/* ── Fixture history ── */

const history: TurnSnapshot[] = [
  { turn: 1, troops: { blue: 30, yellow: 28, green: 26, red: 20 }, territories: { blue: 11, yellow: 10, green: 10, red: 11 } },
  { turn: 5, troops: { blue: 35, yellow: 30, green: 24, red: 18 }, territories: { blue: 13, yellow: 11, green: 9, red: 9 } },
  { turn: 10, troops: { blue: 40, yellow: 32, green: 20, red: 14 }, territories: { blue: 16, yellow: 12, green: 8, red: 6 } },
  { turn: 12, troops: { blue: 42, yellow: 34, green: 18, red: 0 }, territories: { blue: 18, yellow: 13, green: 7, red: 0 } },
  { turn: 19, troops: { blue: 50, yellow: 36, green: 0, red: 0 }, territories: { blue: 22, yellow: 15, green: 0, red: 0 } },
  { turn: 28, troops: { blue: 62, yellow: 0, green: 0, red: 0 }, territories: { blue: 31, yellow: 0, green: 0, red: 0 } },
  { turn: 34, troops: { blue: 87, yellow: 0, green: 0, red: 0 }, territories: { blue: 42, yellow: 0, green: 0, red: 0 } },
]

const noOp = () => {}

/* ── Meta ── */

const meta: Meta<typeof ResultsModal> = {
  title: 'Menu / ResultsModal',
  component: ResultsModal,
  parameters: {
    // prevent the dialog from blocking story canvas
    docs: { story: { inline: false, height: '520px' } },
    chromatic: { viewports: [1280, 375] },
  },
}

export default meta
type Story = StoryObj<typeof ResultsModal>

/* ── Stories ── */

/** Winner view — local player is rank 1. All rating deltas shown. */
export const GameOverWinner: Story = {
  name: 'Game over — winner (You)',
  args: {
    winner: blue,
    standings: standingsGameOver,
    localPlayer: blue,
    fogOfWar: false,
    totalTurns: 34,
    history,
    onPlayAgain: noOp,
    onQuit: noOp,
  },
}

/** Game over — local player lost but the game has ended. Shows full standings with deltas. */
export const GameOverLoser: Story = {
  name: 'Game over — loser (You)',
  args: {
    winner: blue,
    standings: standingsGameOver,
    localPlayer: yellow,
    fogOfWar: false,
    totalTurns: 34,
    history,
    onPlayAgain: noOp,
    onQuit: noOp,
  },
}

/** Local player is eliminated, game still in progress, fog of war off — Spectate available. */
export const EliminatedFogOff: Story = {
  name: 'Eliminated mid-game — fog off',
  args: {
    winner: null,
    standings: standingsMidGame,
    localPlayer: green,
    fogOfWar: false,
    totalTurns: 19,
    history: history.slice(0, 5),
    onPlayAgain: noOp,
    onQuit: noOp,
    onSpectate: noOp,
  },
}

/** Fog of war on — Spectate disabled, chart tabs hidden, opponent counts show ?. */
export const EliminatedFogOn: Story = {
  name: 'Eliminated mid-game — fog on',
  args: {
    winner: null,
    standings: standingsMidGame,
    localPlayer: green,
    fogOfWar: true,
    totalTurns: 19,
    history: history.slice(0, 5),
    onPlayAgain: noOp,
    onQuit: noOp,
    onSpectate: noOp,
  },
}

/** No history data available — chart tab shows placeholder. */
export const NoHistory: Story = {
  name: 'Game over — no history data',
  args: {
    winner: blue,
    standings: standingsGameOver,
    localPlayer: blue,
    fogOfWar: false,
    totalTurns: 34,
    history: undefined,
    onPlayAgain: noOp,
    onQuit: noOp,
  },
}
