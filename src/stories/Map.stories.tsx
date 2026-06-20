import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'

import classicMapConfig from '@/assets/maps/classic/config.json'
import Map from '@/components/board/Map'
import GameContext from '@/components/GameContext'
import GameLogic from '@/controllers/GameLogic'
import MapConfig from '@/models/MapConfig'

const mapConfig = classicMapConfig as MapConfig
const gameState = GameLogic.defaultGameState(mapConfig)

function GameContextWrapper({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(gameState)
  return (
    <GameContext.Provider value={{ gameState: state, setGameState: setState }}>
      {children}
    </GameContext.Provider>
  )
}

/** Player rail mock — mimics the fixed sidebar on desktop */
function PlayerRailMock({ visible = true }: { visible?: boolean }) {
  if (!visible) return null
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: '5%',
        height: '90%',
        width: 80,
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        zIndex: 100,
        gap: 8,
      }}
    >
      <div>P1</div>
      <div>P2</div>
      <div>P3</div>
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

/**
 * Desktop view at scale 1. The player rail sits on the left; the map is
 * offset by `padding-left: 80px` so territories are not hidden behind it.
 */
export const Default: Story = {
  parameters: {
    viewport: { defaultViewport: 'desktop' },
    chromatic: { viewports: [1280] },
  },
  render: () => (
    <>
      <PlayerRailMock />
      <div
        style={{
          width: '100%',
          height: '100%',
          paddingLeft: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
        }}
      >
        <Map />
      </div>
    </>
  ),
}

/**
 * Zoomed-in state (scale > 1.5). The map wrapper switches to
 * `position: fixed; inset: 0` so it uses the full viewport.
 * In the real game this is triggered by pinch/scroll zoom.
 * Here the CSS layout simulates the fullscreen container.
 */
export const ZoomedIn: Story = {
  parameters: {
    viewport: { defaultViewport: 'desktop' },
    chromatic: { viewports: [1280] },
    docs: {
      description: {
        story:
          'Simulates the fullscreen layout applied when transform.scale > 1.5. In the live game, pinch or scroll to zoom in.',
      },
    },
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

/**
 * Mobile viewport (375×667). The player bar moves to the top; no left
 * padding is applied to the map container.
 */
export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    chromatic: { viewports: [375] },
  },
  render: () => (
    <>
      {/* Mobile player bar at top */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: 60,
          background: 'rgba(0,0,0,0.8)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 100,
          fontSize: 12,
        }}
      >
        <div>P1</div>
        <div>P2</div>
        <div>P3</div>
      </div>
      <div style={{ width: '100%', height: '100%', paddingTop: 60, boxSizing: 'border-box' }}>
        <Map />
      </div>
    </>
  ),
}

/**
 * Regression reference: the OLD broken layout where the player rail overlaps
 * the map with no padding compensation. Keep this story to catch regressions.
 */
export const PlayerRailOverlap: Story = {
  name: 'PlayerRailOverlap (broken — regression ref)',
  parameters: {
    viewport: { defaultViewport: 'desktop' },
    chromatic: { viewports: [1280] },
    docs: {
      description: {
        story:
          'Shows the pre-fix layout: the player rail overlaps the left side of the map. Regression reference — the overlap is intentional here.',
      },
    },
  },
  render: () => (
    <>
      <PlayerRailMock />
      {/* No padding-left — intentionally broken layout */}
      <div style={{ width: '100%', height: '100%' }}>
        <Map />
      </div>
    </>
  ),
}
