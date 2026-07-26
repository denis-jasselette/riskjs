import { describe, expect, it } from 'vitest'

import { filterGameStateForSeat } from '@/controllers/GameStateView'
import { MapController } from '@/controllers/MapController'
import Card from '@/models/Card'
import GameState from '@/models/GameState'
import MapConfig from '@/models/MapConfig'
import type PlayerConfig from '@/models/PlayerConfig'

// A -- B -- C     E (isolated, no adjacency into the A/B/C cluster)
// A, B owned by red; C, E owned by blue.
// C is adjacent to B, so it's visible to red under fog; E is not.
function buildMapConfig(): MapConfig {
  const config = new MapConfig()
  config.name = 'TestMap'
  config.territories = {
    A: { coords: { x: 0, y: 0 }, continent: 'North', path: '', adjacency: ['B'] },
    B: { coords: { x: 1, y: 0 }, continent: 'North', path: '', adjacency: ['A', 'C'] },
    C: { coords: { x: 2, y: 0 }, continent: 'North', path: '', adjacency: ['B'] },
    E: { coords: { x: 5, y: 5 }, continent: 'South', path: '', adjacency: [] },
  }
  config.cards = { wildcards: 2, territories: {} }
  config.blizzards = 0
  return config
}

const red: PlayerConfig = { currentUser: true, name: 'Red', color: 'red', human: true, position: 0 }
const blue: PlayerConfig = { currentUser: false, name: 'Blue', color: 'blue', human: true, position: 1 }

function buildGameState(fogEnabled: boolean): GameState {
  const gs = new GameState()
  gs.gameOver = false
  gs.mapConfig = buildMapConfig()
  gs.playerConfigs = [red, blue]
  gs.currentPlayer = 'red'
  gs.currentPhase = 'attack'
  gs.capitals = { A: 'red' }
  gs.knockoutOrder = {}
  gs.fogEnabled = fogEnabled
  gs.troops = [
    { territory: 'A', count: 3, player: red },
    { territory: 'B', count: 5, player: red },
    { territory: 'C', count: 4, player: blue },
    { territory: 'E', count: 2, player: blue },
  ]
  const redHand: Card[] = [{ type: 'infantry', territory: 'A' }, { type: 'cavalry', territory: 'B' }]
  const blueHand: Card[] = [{ type: 'artillery', territory: 'C' }]
  gs.playerCards = { red: redHand, blue: blueHand }
  gs.deck = [{ type: 'wildcard' }, { type: 'infantry', territory: 'E' }]
  return gs
}

describe('filterGameStateForSeat', () => {
  it('redacts a non-visible territory under fog of war', () => {
    const gameState = buildGameState(true)
    const mapController = new MapController(gameState)
    const filtered = filterGameStateForSeat(gameState, mapController, 'red')

    expect(filtered.troops.find(t => t.territory === 'E')).toBeUndefined()
    expect(filtered.troops.find(t => t.territory === 'A')).toBeDefined()
    expect(filtered.troops.find(t => t.territory === 'B')).toBeDefined()
    // C is adjacent to B, so it's still visible to red despite being blue's.
    expect(filtered.troops.find(t => t.territory === 'C')).toBeDefined()
  })

  it('passes through every territory unfiltered when fog of war is disabled', () => {
    const gameState = buildGameState(false)
    const mapController = new MapController(gameState)
    const filtered = filterGameStateForSeat(gameState, mapController, 'red')

    expect(filtered.troops).toHaveLength(4)
    expect(filtered.troops.find(t => t.territory === 'E')).toBeDefined()
  })

  it('always redacts opponent card identities, independent of fog of war', () => {
    const gameState = buildGameState(false)
    const mapController = new MapController(gameState)
    const filtered = filterGameStateForSeat(gameState, mapController, 'red')

    expect(filtered.playerCards.red).toEqual(gameState.playerCards.red)
    expect(filtered.playerCards.blue).toHaveLength(1)
    expect(filtered.playerCards.blue[0]).not.toEqual(gameState.playerCards.blue[0])
    expect(filtered.playerCards.blue[0].type).toBe('wildcard')
    expect(filtered.playerCards.blue[0].territory).toBeUndefined()
  })

  it('clears the deck', () => {
    const gameState = buildGameState(false)
    const mapController = new MapController(gameState)
    const filtered = filterGameStateForSeat(gameState, mapController, 'red')

    expect(filtered.deck).toEqual([])
  })

  it('passes through unaffected fields unchanged', () => {
    const gameState = buildGameState(true)
    const mapController = new MapController(gameState)
    const filtered = filterGameStateForSeat(gameState, mapController, 'red')

    expect(filtered.currentPlayer).toBe(gameState.currentPlayer)
    expect(filtered.currentPhase).toBe(gameState.currentPhase)
    expect(filtered.capitals).toEqual(gameState.capitals)
    expect(filtered.knockoutOrder).toEqual(gameState.knockoutOrder)
  })
})
