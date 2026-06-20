import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'

import classicMapConfig from '@/assets/maps/classic/config.json'
import Map from '@/components/board/Map'
import GameContext from '@/components/GameContext'
import GameState from '@/models/GameState'
import MapConfig from '@/models/MapConfig'
import PlayerConfig from '@/models/PlayerConfig'

const mapConfig = classicMapConfig as MapConfig

// Fixed player roster — deterministic colors for Chromatic snapshots
const PLAYERS: PlayerConfig[] = [
  { currentUser: true, name: 'Albert', color: 'white', human: true, position: 1 },
  { currentUser: false, name: 'Bernard', color: 'black', human: true, position: 2 },
  { currentUser: false, name: 'Cédric', color: 'red', human: true, position: 3 },
  { currentUser: false, name: 'David', color: 'green', human: true, position: 4 },
  { currentUser: false, name: 'Eric', color: 'blue', human: true, position: 5 },
  { currentUser: false, name: 'Fabien', color: 'purple', human: true, position: 6 },
]

// Fixed territory assignment — 7 territories per player, same order every time
const TERRITORY_OWNERS: [string, number][] = [
  // white (Albert) — North America north
  ['Alaska', 3], ['NorthwestTerritory', 2], ['Greenland', 2],
  ['Alberta', 2], ['Ontario', 3], ['Quebec', 2], ['WesternUnitedStates', 2],
  // black (Bernard) — North America south + South America
  ['EasternUnitedStates', 2], ['CentralAmerica', 2], ['Venezuela', 2],
  ['Peru', 2], ['Brazil', 3], ['Argentina', 2], ['Iceland', 2],
  // red (Cédric) — Europe
  ['GreatBritain', 2], ['Scandinavia', 2], ['Ukraine', 3],
  ['NorthernEurope', 2], ['SouthernEurope', 2], ['WesternEurope', 2], ['NorthAfrica', 2],
  // green (David) — Africa
  ['Egypt', 2], ['EastAfrica', 2], ['Congo', 2],
  ['SouthAfrica', 2], ['Madagascar', 2], ['Ural', 2], ['Siberia', 3],
  // blue (Eric) — Asia north
  ['Yakutsk', 2], ['Kamchatka', 3], ['Irkutsk', 2],
  ['Mongolia', 2], ['Japan', 2], ['Afghanistan', 2], ['MiddleEast', 2],
  // purple (Fabien) — Asia south + Oceania
  ['India', 2], ['Siam', 2], ['China', 3],
  ['Indonesia', 2], ['NewGuinea', 2], ['WesternAustralia', 2], ['EasternAustralia', 2],
]

function buildFixedGameState(): GameState {
  const troops = TERRITORY_OWNERS.map(([territory, count], i) => ({
    territory,
    count,
    player: PLAYERS[Math.floor(i / 7)],
  }))

  return {
    gameOver: false,
    mapConfig,
    playerConfigs: PLAYERS,
    troops,
    blizzards: [],
    userPlayer: 'white',
    currentPlayer: 'white',
    currentPhase: 'deploy',
    troopsToDeploy: 3,
  }
}

const FIXED_STATE = buildFixedGameState()

function GameContextWrapper({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(FIXED_STATE)
  return (
    <GameContext.Provider value={{ gameState: state, setGameState: setState }}>
      {children}
    </GameContext.Provider>
  )
}

function PlayerRailMock({ visible = true }: { visible?: boolean }) {
  if (!visible) return null
  return (
    <div style={{
      position: 'fixed', left: 0, top: '5%', height: '90%', width: 80,
      background: 'rgba(0,0,0,0.7)', color: '#fff', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, zIndex: 100, gap: 8,
    }}
    >
      {PLAYERS.map(p => (
        <div key={p.color} style={{ color: p.color === 'white' ? '#eee' : p.color }}>
          {p.name.slice(0, 2)}
        </div>
      ))}
    </div>
  )
}

const meta: Meta = {
  title: 'Board / Map',
  decorators: [
    Story => (
      <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e', position: 'relative' }}>
        <GameContextWrapper>
          <Story />
        </GameContextWrapper>
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj

/** Desktop — safe area layout. Map is offset by the player rail width. */
export const Default: Story = {
  parameters: {
    viewport: { defaultViewport: 'desktop' },
    chromatic: { viewports: [1280] },
  },
  render: () => (
    <>
      <PlayerRailMock />
      <div style={{
        width: '100%', height: '100%', paddingLeft: 80,
        display: 'flex', alignItems: 'center', boxSizing: 'border-box',
      }}
      >
        <Map />
      </div>
    </>
  ),
}

/** Zoomed-in — fullscreen layout applied when scale > 1.5. */
export const ZoomedIn: Story = {
  parameters: {
    viewport: { defaultViewport: 'desktop' },
    chromatic: { viewports: [1280] },
  },
  render: () => (
    <>
      <PlayerRailMock />
      <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh' }}>
        <Map />
      </div>
    </>
  ),
}

/** Mobile (375px) — horizontal player bar at top, no left padding. */
export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    chromatic: { viewports: [375] },
  },
  render: () => (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: 52,
        background: 'rgba(0,0,0,0.8)', color: '#fff', display: 'flex',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
        zIndex: 100, fontSize: 12,
      }}
      >
        {PLAYERS.map(p => (
          <div key={p.color} style={{ color: p.color === 'white' ? '#eee' : p.color }}>
            {p.name.slice(0, 2)}
          </div>
        ))}
      </div>
      <div style={{ width: '100%', height: '100%', paddingTop: 52, boxSizing: 'border-box' }}>
        <Map />
      </div>
    </>
  ),
}

/** Regression reference: pre-fix layout where the rail overlaps the map. */
export const PlayerRailOverlap: Story = {
  name: 'PlayerRailOverlap (regression ref)',
  parameters: {
    viewport: { defaultViewport: 'desktop' },
    chromatic: { viewports: [1280] },
  },
  render: () => (
    <>
      <PlayerRailMock />
      <div style={{ width: '100%', height: '100%' }}>
        <Map />
      </div>
    </>
  ),
}
