import { describe, expect, it } from 'vitest'

import { BotDecision } from '@/bots/BotDecision'
import { decideAction } from '@/bots/decideAction'
import GameController from '@/controllers/GameController'
import GameState from '@/models/GameState'
import MapConfig from '@/models/MapConfig'
import type PlayerConfig from '@/models/PlayerConfig'

// An 8-territory ring (T0..T7, each adjacent to its neighbors, wrapping
// around) with ownership alternating red/blue -- every territory borders an
// enemy territory on both sides, so combat opportunities stay plentiful
// throughout, letting a 2-seat Easy-only game reliably run to a real
// elimination-based conclusion rather than stalling on a disconnected board.
function buildRingMapConfig(territoryCount: number): MapConfig {
  const config = new MapConfig()
  config.name = 'RingTestMap'
  config.continents = { Ring: { bonusTroops: 2, path: '' } }
  config.territories = {}
  for (let i = 0; i < territoryCount; i++) {
    const next = `T${(i + 1) % territoryCount}`
    const prev = `T${(i - 1 + territoryCount) % territoryCount}`
    config.territories[`T${i}`] = { coords: { x: i, y: 0 }, continent: 'Ring', path: '', adjacency: [next, prev] }
  }
  config.cards = { wildcards: 2, territories: {} }
  config.blizzards = 0
  return config
}

const red: PlayerConfig = { currentUser: false, name: 'Red', color: 'red', human: false, botSkill: 'easy', position: 0 }
const blue: PlayerConfig = { currentUser: false, name: 'Blue', color: 'blue', human: false, botSkill: 'easy', position: 1 }

function buildRingGameState(territoryCount: number): GameState {
  const gs = new GameState()
  gs.gameOver = false
  gs.mapConfig = buildRingMapConfig(territoryCount)
  gs.playerConfigs = [red, blue]
  gs.currentPlayer = 'red'
  gs.currentPhase = 'deploy'
  gs.troopsToDeploy = 3
  gs.troops = Array.from({ length: territoryCount }, (_, i) => ({
    territory: `T${i}`,
    count: 3,
    player: i % 2 === 0 ? red : blue,
  }))
  gs.playerCards = { red: [], blue: [] }
  gs.deck = []
  return gs
}

function applyDecision(controller: GameController, decision: BotDecision): GameController {
  switch (decision.type) {
    case 'deploy': return controller.deploy(decision.troops, decision.territory)
    case 'attack': return controller.attack(decision.attackingTroops, decision.attackingTerritory, decision.defendingTerritory)
    case 'confirm_post_conquest_move': return controller.confirmPostConquestMove(decision.troopsToMove)
    case 'fortify': return controller.fortify(decision.troops, decision.fromTerritory, decision.toTerritory)
    case 'trade_cards': return controller.tradeCards(decision.cardIndices, decision.bonusTerritory)
    case 'choose_capital': return controller.chooseCapital(decision.territory)
    case 'end_phase': return controller.startNextPhase()
  }
}

describe('decideAction integration (US1 AC3 / SC-002)', () => {
  it('plays a full Easy-bot-only game to a normal conclusion within a bounded number of actions', () => {
    // Loose safety-net cap, not a tight performance bound -- guards against
    // an actual stall (the failure mode this test exists to catch), not
    // against a slow-but-converging game.
    const MAX_ITERATIONS = 20_000

    let controller = new GameController(buildRingGameState(8))
    let iterations = 0
    while (!controller.gameState.gameOver && iterations < MAX_ITERATIONS) {
      iterations++
      const decision = decideAction(controller.gameState, controller.mapController, controller.gameState.currentPlayer)
      expect(decision).not.toBeNull()
      controller = applyDecision(controller, decision!)
    }

    expect(iterations).toBeLessThan(MAX_ITERATIONS)
    expect(controller.gameState.gameOver).toBe(true)
    expect(controller.getWinner()).toBeDefined()
  })
})
