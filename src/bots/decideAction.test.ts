import { describe, expect, it } from 'vitest'

import { decideAction } from '@/bots/decideAction'
import { MapController } from '@/controllers/MapController'
import { buildGameState, card } from '@/controllers/testFixtures'
import GameState from '@/models/GameState'
import MapConfig from '@/models/MapConfig'
import type PlayerConfig from '@/models/PlayerConfig'

describe('decideAction', () => {
  it('returns null for a seat with no botSkill configured (not a bot seat)', () => {
    const gameState = buildGameState()
    const mapController = new MapController(gameState)
    expect(decideAction(gameState, mapController, 'red')).toBeNull()
  })

  it('resolves choose_capital for an owned territory during the capitalDeploy phase', () => {
    const gameState = buildGameState()
    gameState.playerConfigs = gameState.playerConfigs.map(p => ({ ...p, botSkill: 'easy' }))
    gameState.capitalMode = true
    gameState.capitals = {}
    gameState.currentPhase = 'capitalDeploy'
    const mapController = new MapController(gameState)

    const decision = decideAction(gameState, mapController, 'red')
    expect(decision?.type).toBe('choose_capital')
    if (decision?.type === 'choose_capital') expect(['A', 'B']).toContain(decision.territory)
  })

  it('resolves confirm_post_conquest_move with the mandatory minimum whenever one is pending, regardless of phase', () => {
    const gameState = buildGameState()
    gameState.playerConfigs = gameState.playerConfigs.map(p => ({ ...p, botSkill: 'easy' }))
    gameState.currentPhase = 'attack'
    gameState.pendingPostConquestMove = { sourceTerritory: 'B', conqueredTerritory: 'C', minTroopsToMove: 3 }
    const mapController = new MapController(gameState)

    expect(decideAction(gameState, mapController, 'red')).toEqual({ type: 'confirm_post_conquest_move', troopsToMove: 3 })
  })

  describe('card trading (FR-007 -- any tier, forced or optional, first opportunity)', () => {
    it('trades a forced set (5+ cards) instead of deploying', () => {
      const gameState = buildGameState()
      gameState.playerConfigs = gameState.playerConfigs.map(p => ({ ...p, botSkill: 'easy' }))
      gameState.playerCards.red = [card('infantry', 'A'), card('cavalry'), card('artillery'), card('wildcard'), card('wildcard')]
      const mapController = new MapController(gameState)

      const decision = decideAction(gameState, mapController, 'red')
      expect(decision).toEqual({ type: 'trade_cards', cardIndices: [0, 1, 2], bonusTerritory: 'A' })
    })

    it('trades an available-but-optional set (< 5 cards) instead of deploying, for Easy too', () => {
      const gameState = buildGameState()
      gameState.playerConfigs = gameState.playerConfigs.map(p => ({ ...p, botSkill: 'easy' }))
      gameState.playerCards.red = [card('infantry', 'A'), card('cavalry'), card('artillery')]
      const mapController = new MapController(gameState)

      const decision = decideAction(gameState, mapController, 'red')
      expect(decision).toEqual({ type: 'trade_cards', cardIndices: [0, 1, 2], bonusTerritory: 'A' })
    })

    it('does not trade outside deploy phase even if an available set sits unplayed', () => {
      const gameState = buildGameState()
      gameState.playerConfigs = gameState.playerConfigs.map(p => ({ ...p, botSkill: 'easy' }))
      gameState.currentPhase = 'attack'
      gameState.playerCards.red = [card('infantry', 'A'), card('cavalry'), card('artillery')]
      const mapController = new MapController(gameState)

      expect(decideAction(gameState, mapController, 'red')?.type).not.toBe('trade_cards')
    })
  })

  describe('fog-of-war (FR-012 cross-cutting)', () => {
    // Home (red) -- Mid (blue, adjacent to Home, visible) -- Hidden (blue,
    // two hops from Home, NOT visible to red, deliberately the "best"
    // possible target: minimal defenders). Neither tier should ever be able
    // to name Hidden in an attack decision, across many trials.
    function buildHiddenTemptationMapConfig(): MapConfig {
      const config = new MapConfig()
      config.name = 'HiddenTemptationMap'
      config.continents = { Land: { bonusTroops: 1, path: '' } }
      config.territories = {
        Home: { coords: { x: 0, y: 0 }, continent: 'Land', path: '', adjacency: ['Mid'] },
        Mid: { coords: { x: 1, y: 0 }, continent: 'Land', path: '', adjacency: ['Home', 'Hidden'] },
        Hidden: { coords: { x: 2, y: 0 }, continent: 'Land', path: '', adjacency: ['Mid'] },
      }
      config.cards = { wildcards: 2, territories: {} }
      config.blizzards = 0
      return config
    }

    function buildHiddenTemptationGameState(botSkill: PlayerConfig['botSkill']): GameState {
      const red: PlayerConfig = { currentUser: false, name: 'Red', color: 'red', human: false, botSkill, position: 0 }
      const blue: PlayerConfig = { currentUser: false, name: 'Blue', color: 'blue', human: false, position: 1 }
      const gs = new GameState()
      gs.gameOver = false
      gs.mapConfig = buildHiddenTemptationMapConfig()
      gs.playerConfigs = [red, blue]
      gs.currentPlayer = 'red'
      gs.currentPhase = 'attack'
      gs.fogEnabled = true
      gs.troops = [
        { territory: 'Home', count: 6, player: red },
        { territory: 'Mid', count: 5, player: blue },
        { territory: 'Hidden', count: 1, player: blue }, // the "obviously good" bait
      ]
      gs.playerCards = { red: [], blue: [] }
      gs.deck = []
      return gs
    }

    it.each(['easy', 'medium'] as const)('never proposes an attack on a non-visible territory (%s tier)', (botSkill) => {
      const gameState = buildHiddenTemptationGameState(botSkill)
      const mapController = new MapController(gameState)

      for (let i = 0; i < 50; i++) {
        const decision = decideAction(gameState, mapController, 'red')
        if (decision?.type === 'attack') expect(decision.defendingTerritory).not.toBe('Hidden')
      }
    })
  })

  describe('botBehavior: neutral wiring (US3/FR-009/FR-010)', () => {
    it('never attacks for a neutral-behavior seat, regardless of botSkill, resolved end-to-end through decideAction', () => {
      const gameState = buildGameState()
      gameState.playerConfigs = gameState.playerConfigs.map(p => p.color === 'red' ? { ...p, botSkill: 'medium', botBehavior: 'neutral' } : p)
      gameState.currentPhase = 'attack'
      // Overwhelmingly favorable -- a non-neutral Medium seat would take it.
      gameState.troops.find(t => t.territory === 'B')!.count = 20
      gameState.troops.find(t => t.territory === 'C')!.count = 1
      const mapController = new MapController(gameState)

      expect(decideAction(gameState, mapController, 'red')).toEqual({ type: 'end_phase' })
    })
  })

  describe('safe fallback (FR-012)', () => {
    it('returns end_phase instead of throwing when the resolved agent/precedence logic errors', () => {
      const gameState = buildGameState()
      gameState.playerConfigs = gameState.playerConfigs.map(p => ({ ...p, botSkill: 'easy' }))
      // Malformed fixture: hasAvailableTradeIn's playerCards[player] lookup
      // throws on a null playerCards object, simulating an unexpected/corrupt state.
      gameState.playerCards = null as unknown as GameState['playerCards']
      const mapController = new MapController(gameState)

      expect(() => decideAction(gameState, mapController, 'red')).not.toThrow()
      expect(decideAction(gameState, mapController, 'red')).toEqual({ type: 'end_phase' })
    })
  })
})
