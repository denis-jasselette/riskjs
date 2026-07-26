import { describe, expect, it } from 'vitest'

import { HeuristicBotAgent } from '@/bots/HeuristicBotAgent'
import { RandomBotAgent } from '@/bots/RandomBotAgent'
import { MapController } from '@/controllers/MapController'
import { buildGameState } from '@/controllers/testFixtures'
import GameState from '@/models/GameState'
import MapConfig from '@/models/MapConfig'
import type PlayerConfig from '@/models/PlayerConfig'

const red: PlayerConfig = { currentUser: false, name: 'Red', color: 'red', human: false, botSkill: 'medium', position: 0 }
const blue: PlayerConfig = { currentUser: false, name: 'Blue', color: 'blue', human: false, botSkill: 'medium', position: 1 }

describe('HeuristicBotAgent', () => {
  describe('decideAttack -- favorability (SC-003)', () => {
    it('never initiates an unfavorable attack that RandomBotAgent sometimes takes', () => {
      // Default fixture's only legal attack (B(5) -> C(4)) is a 4-vs-4
      // committed-troop matchup -- not a comfortable advantage, so it's
      // unfavorable (see BotUtils.test.ts).
      const gameState = buildGameState()
      const mapController = new MapController(gameState)

      const randomSeenTypes = new Set<string>()
      for (let i = 0; i < 100; i++) randomSeenTypes.add(RandomBotAgent.decideAttack(gameState, mapController, 'red').type)
      expect(randomSeenTypes.has('attack')).toBe(true)

      for (let i = 0; i < 100; i++) expect(HeuristicBotAgent.decideAttack(gameState, mapController, 'red')).toEqual({ type: 'end_phase' })
    })
  })

  describe('decideDeploy / decideFortify -- border priority', () => {
    // Home1 (interior: only adjacent to own Home2) -- Home2 (border:
    // adjacent to Home1 and enemy-owned Enemy1).
    function buildBorderMapConfig(): MapConfig {
      const config = new MapConfig()
      config.name = 'BorderTestMap'
      config.continents = { Home: { bonusTroops: 1, path: '' }, Away: { bonusTroops: 1, path: '' } }
      config.territories = {
        Home1: { coords: { x: 0, y: 0 }, continent: 'Home', path: '', adjacency: ['Home2'] },
        Home2: { coords: { x: 1, y: 0 }, continent: 'Home', path: '', adjacency: ['Home1', 'Enemy1'] },
        Enemy1: { coords: { x: 2, y: 0 }, continent: 'Away', path: '', adjacency: ['Home2'] },
      }
      config.cards = { wildcards: 2, territories: {} }
      config.blizzards = 0
      return config
    }

    function buildBorderGameState(): GameState {
      const gs = new GameState()
      gs.gameOver = false
      gs.mapConfig = buildBorderMapConfig()
      gs.playerConfigs = [red, blue]
      gs.currentPlayer = 'red'
      gs.currentPhase = 'deploy'
      gs.troopsToDeploy = 3
      gs.troops = [
        { territory: 'Home1', count: 5, player: red },
        { territory: 'Home2', count: 2, player: red },
        { territory: 'Enemy1', count: 4, player: blue },
      ]
      gs.playerCards = { red: [], blue: [] }
      gs.deck = []
      return gs
    }

    it('deploys to a border territory over an interior one', () => {
      const gameState = buildBorderGameState()
      const mapController = new MapController(gameState)
      const decision = HeuristicBotAgent.decideDeploy(gameState, mapController, 'red')
      expect(decision).toEqual({ type: 'deploy', troops: 3, territory: 'Home2' })
    })

    it('fortifies from an interior territory toward a border one', () => {
      const gameState = buildBorderGameState()
      const mapController = new MapController(gameState)
      const decision = HeuristicBotAgent.decideFortify(gameState, mapController, 'red')
      expect(decision).toEqual({ type: 'fortify', fromTerritory: 'Home1', toTerritory: 'Home2', troops: 4 })
    })
  })

  describe('decideAttack -- continent completion', () => {
    // Alpha continent: Home1, Home2 (red-owned) + AlphaTarget (blue, weakly
    // held -- favorable to attack, and completes Alpha for red). Beta
    // continent: Home3 (red) + BetaTarget (blue, also weakly held/favorable,
    // but doesn't complete anything since Beta has other blue territories).
    function buildContinentMapConfig(): MapConfig {
      const config = new MapConfig()
      config.name = 'ContinentTestMap'
      config.continents = { Alpha: { bonusTroops: 3, path: '' }, Beta: { bonusTroops: 2, path: '' } }
      config.territories = {
        Home1: { coords: { x: 0, y: 0 }, continent: 'Alpha', path: '', adjacency: ['Home2'] },
        Home2: { coords: { x: 1, y: 0 }, continent: 'Alpha', path: '', adjacency: ['Home1', 'AlphaTarget'] },
        AlphaTarget: { coords: { x: 2, y: 0 }, continent: 'Alpha', path: '', adjacency: ['Home2'] },
        Home3: { coords: { x: 0, y: 1 }, continent: 'Beta', path: '', adjacency: ['BetaTarget'] },
        BetaTarget: { coords: { x: 1, y: 1 }, continent: 'Beta', path: '', adjacency: ['Home3', 'BetaOther'] },
        BetaOther: { coords: { x: 2, y: 1 }, continent: 'Beta', path: '', adjacency: ['BetaTarget'] },
      }
      config.cards = { wildcards: 2, territories: {} }
      config.blizzards = 0
      return config
    }

    function buildContinentGameState(): GameState {
      const gs = new GameState()
      gs.gameOver = false
      gs.mapConfig = buildContinentMapConfig()
      gs.playerConfigs = [red, blue]
      gs.currentPlayer = 'red'
      gs.currentPhase = 'attack'
      gs.troopsToDeploy = 0
      gs.troops = [
        { territory: 'Home1', count: 2, player: red },
        { territory: 'Home2', count: 6, player: red },
        { territory: 'AlphaTarget', count: 1, player: blue },
        { territory: 'Home3', count: 6, player: red },
        { territory: 'BetaTarget', count: 1, player: blue },
        { territory: 'BetaOther', count: 3, player: blue },
      ]
      gs.playerCards = { red: [], blue: [] }
      gs.deck = []
      return gs
    }

    it('prefers a favorable attack that completes continent control over an equally-favorable one that does not', () => {
      const gameState = buildContinentGameState()
      const mapController = new MapController(gameState)
      const decision = HeuristicBotAgent.decideAttack(gameState, mapController, 'red')
      expect(decision).toEqual({ type: 'attack', attackingTerritory: 'Home2', defendingTerritory: 'AlphaTarget', attackingTroops: 5 })
    })
  })

  describe('decideAttack -- capital-mode pressure (FR-008)', () => {
    function buildCapitalMapConfig(): MapConfig {
      const config = new MapConfig()
      config.name = 'CapitalTestMap'
      config.continents = { Land: { bonusTroops: 2, path: '' } }
      config.territories = {
        RedCapital: { coords: { x: 0, y: 0 }, continent: 'Land', path: '', adjacency: ['Border', 'RedHome'] },
        RedHome: { coords: { x: 0, y: 1 }, continent: 'Land', path: '', adjacency: ['RedCapital'] },
        Border: { coords: { x: 1, y: 0 }, continent: 'Land', path: '', adjacency: ['RedCapital', 'BlueCapital', 'BlueOther'] },
        BlueCapital: { coords: { x: 2, y: 0 }, continent: 'Land', path: '', adjacency: ['Border'] },
        BlueOther: { coords: { x: 1, y: 1 }, continent: 'Land', path: '', adjacency: ['Border'] },
      }
      config.cards = { wildcards: 2, territories: {} }
      config.blizzards = 0
      return config
    }

    // Red owns 3 territories (RedCapital, RedHome, Border) to blue's 2
    // (BlueCapital, BlueOther) -- blue is the "weaker opponent" FR-008 refers to.
    function buildCapitalGameState(): GameState {
      const gs = new GameState()
      gs.gameOver = false
      gs.mapConfig = buildCapitalMapConfig()
      gs.playerConfigs = [red, blue]
      gs.currentPlayer = 'red'
      gs.currentPhase = 'attack'
      gs.troopsToDeploy = 0
      gs.capitalMode = true
      gs.capitals = { RedCapital: 'red', BlueCapital: 'blue' }
      gs.troops = [
        { territory: 'RedCapital', count: 5, player: red },
        { territory: 'RedHome', count: 1, player: red },
        { territory: 'Border', count: 8, player: red },
        { territory: 'BlueCapital', count: 1, player: blue },
        { territory: 'BlueOther', count: 1, player: blue },
      ]
      gs.playerCards = { red: [], blue: [] }
      gs.deck = []
      return gs
    }

    it('weights its attack toward the weaker opponent\'s capital when a plausible opportunity exists', () => {
      const gameState = buildCapitalGameState()
      const mapController = new MapController(gameState)
      const decision = HeuristicBotAgent.decideAttack(gameState, mapController, 'red')
      expect(decision).toEqual({ type: 'attack', attackingTerritory: 'Border', defendingTerritory: 'BlueCapital', attackingTroops: 7 })
    })

    it('does not attack from its own capital if doing so would leave it under-garrisoned', () => {
      const gameState = buildCapitalGameState()
      // Only the capital itself can reach the enemy capital this time.
      gameState.mapConfig.territories.Border.adjacency = ['RedCapital', 'BlueOther']
      gameState.mapConfig.territories.BlueCapital.adjacency = ['RedCapital']
      gameState.mapConfig.territories.RedCapital.adjacency = ['Border', 'BlueCapital']
      const mapController = new MapController(gameState)

      const decision = HeuristicBotAgent.decideAttack(gameState, mapController, 'red')
      // Falls back to some other favorable attack (Border -> BlueOther) or
      // end_phase -- but never the capital-draining attack from RedCapital.
      if (decision.type === 'attack')
        expect(decision.attackingTerritory === 'RedCapital' && decision.defendingTerritory === 'BlueCapital').toBe(false)
    })
  })
})
