import { afterEach, describe, expect, it, vi } from 'vitest'

import { getBotAgent } from '@/bots/getBotAgent'
import HeuristicBotAgent from '@/bots/HeuristicBotAgent'
import NeutralBotAgent from '@/bots/NeutralBotAgent'
import RandomBotAgent from '@/bots/RandomBotAgent'
import GameState from '@/models/GameState'
import MapConfig from '@/models/MapConfig'
import type PlayerConfig from '@/models/PlayerConfig'
import type { BotSkill } from '@/models/PlayerConfig'

// A -- B, both owned by red except where noted; red has an overwhelming, entirely
// legal attack available (B has 20 troops vs A's 1) so any non-null decideAttack
// would be trivially easy to justify — the only thing keeping Neutral from taking it
// should be the dispatch wiring itself, not a lack of opportunity.
function buildGameStateWithFavorableAttack(): GameState {
  const config = new MapConfig()
  config.name = 'TestMap'
  config.width = 10
  config.height = 10
  config.troopSize = 20
  config.continents = { Land: { bonusTroops: 1, path: '' } }
  config.territories = {
    A: { coords: { x: 0, y: 0 }, continent: 'Land', path: '', adjacency: ['B'] },
    B: { coords: { x: 1, y: 0 }, continent: 'Land', path: '', adjacency: ['A'] },
  }
  config.cards = { wildcards: 2, territories: {} }
  config.blizzards = 0

  const player1: PlayerConfig = { currentUser: true, name: 'Player 1', color: 'red', human: false, botSkill: 'neutral', position: 0 }
  const player2: PlayerConfig = { currentUser: false, name: 'Player 2', color: 'blue', human: false, position: 1 }

  const gs = new GameState()
  gs.gameOver = false
  gs.mapConfig = config
  gs.playerConfigs = [player1, player2]
  gs.blizzards = []
  gs.currentPlayer = 'red'
  gs.userPlayer = 'red'
  gs.currentPhase = 'attack'
  gs.troopsToDeploy = 0
  gs.troops = [
    { territory: 'B', count: 20, player: player1 },
    { territory: 'A', count: 1, player: player2 },
  ]
  return gs
}

describe('getBotAgent()', () => {
  it('resolves easy to RandomBotAgent', () => {
    expect(getBotAgent('easy')).toBeInstanceOf(RandomBotAgent)
  })

  it('resolves medium to HeuristicBotAgent', () => {
    expect(getBotAgent('medium')).toBeInstanceOf(HeuristicBotAgent)
  })

  it('resolves hard and expert to HeuristicBotAgent (deferred tiers fall back to Medium)', () => {
    expect(getBotAgent('hard')).toBeInstanceOf(HeuristicBotAgent)
    expect(getBotAgent('expert')).toBeInstanceOf(HeuristicBotAgent)
  })

  it('resolves neutral to NeutralBotAgent', () => {
    expect(getBotAgent('neutral')).toBeInstanceOf(NeutralBotAgent)
  })
})

describe('Neutral behavior', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('never attacks regardless of assigned difficulty tier, even with an overwhelming favorable matchup', () => {
    const tiers: BotSkill[] = ['easy', 'medium', 'hard', 'expert', 'neutral']

    // Bypass RandomBotAgent's (Easy) stop-probability so the sanity check below is
    // deterministic rather than a ~30%-flaky assertion.
    vi.spyOn(Math, 'random').mockReturnValue(0.99)

    for (const tier of tiers) {
      const gameState = buildGameStateWithFavorableAttack()
      expect(getBotAgent('neutral').decideAttack(gameState, 'red')).toBeNull()
      // Sanity: the underlying tier's own agent WOULD attack given this matchup,
      // confirming the null above comes from neutral dispatch, not a lack of opportunity.
      if (tier !== 'neutral')
        expect(getBotAgent(tier).decideAttack(gameState, 'red')).not.toBeNull()
    }
  })

  it('never fortifies', () => {
    const gameState = buildGameStateWithFavorableAttack()
    expect(getBotAgent('neutral').decideFortify(gameState, 'red')).toBeNull()
  })

  it('still deploys, so the turn can progress', () => {
    const gameState = buildGameStateWithFavorableAttack()
    gameState.currentPhase = 'deploy'
    gameState.troopsToDeploy = 3
    const { allocations } = getBotAgent('neutral').decideDeploy(gameState, 'red')
    expect(allocations.reduce((sum, a) => sum + a.troops, 0)).toBe(3)
  })
})
