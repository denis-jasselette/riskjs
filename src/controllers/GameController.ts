import { MapController } from '@/controllers/MapController'
import { diceRoll } from '@/lib/Random'
import { GamePhase } from '@/models/GamePhase'
import GameState from '@/models/GameState'

export default class GameController {
  gameState: GameState
  mapController: MapController

  constructor(gameState: GameState) {
    this.gameState = { ...gameState }
    this.mapController = new MapController(this.gameState)
  }

  isFortifyAllowed(a: string, b: string): boolean {
    return this.mapController.areConnected(a, b, { sameOwner: true })
  }

  isAttackAllowed(a: string, b: string): boolean {
    return this.mapController.areAdjacent(a, b, { differentOwner: true })
  }

  isSelectable(territory: string, selectedTerritory: string | null = null): boolean {
    if (this.mapController.isTerritoryBlizzard(territory))
      return false
    if (this.gameState.currentPlayer !== this.gameState.userPlayer)
      return false
    if (selectedTerritory === territory)
      return true

    const troopCount = this.getTroopCount(territory)
    const owner = this.mapController.getTerritoryOwner(territory)
    if (this.gameState.currentPhase === 'deploy')
      return owner === this.gameState.currentPlayer
    if (this.gameState.currentPhase === 'fortify')
      return owner === this.gameState.currentPlayer && ((!selectedTerritory && troopCount > 1) || (!!selectedTerritory && this.isFortifyAllowed(selectedTerritory, territory)))
    if (this.gameState.currentPhase === 'attack') {
      if (owner === this.gameState.currentPlayer && troopCount > 1)
        return true

      return !!selectedTerritory && this.isAttackAllowed(selectedTerritory, territory)
    }
    return false
  }

  deploy(troops: number, territory: string): GameController {
    console.info(`Deploying ${troops} troops in ${territory}`)
    this.mapController.getTroopState(territory)!.count += troops
    this.gameState.troopsToDeploy -= troops

    if (this.gameState.troopsToDeploy <= 0)
      this.startPhase('attack')

    return this
  }

  attackRng(attackingTroops: number, defendingTroops: number, options: { rngType: 'TrueRandom', maxAttacker: number, maxDefender: number } = { rngType: 'TrueRandom', maxAttacker: 3, maxDefender: 2 }): [number, number] {
    const losses: [number, number] = [0, 0]
    while (attackingTroops > 0 && defendingTroops > 0) {
      const diceCount = [Math.min(options.maxAttacker, attackingTroops), Math.min(options.maxDefender, defendingTroops)]
      const attackingDice = [...Array(diceCount[0]).keys()].map(() => diceRoll()).sort()
      const defendingDice = [...Array(diceCount[1]).keys()].map(() => diceRoll()).sort()
      for (let i = 0; i < Math.min(...diceCount); i++) {
        if (attackingDice[attackingDice.length - 1 - i] > defendingDice[defendingDice.length - 1 - i]) {
          losses[1] += 1
          defendingTroops -= 1
        }
        else {
          losses[0] += 1
          attackingTroops -= 1
        }
      }
    }

    return losses
  }

  attack(attackingTroops: number, attackingTerritory: string, defendingTerritory: string): GameController {
    const attackingTroopState = this.mapController.getTroopState(attackingTerritory)
    const defendingTroopState = this.mapController.getTroopState(defendingTerritory)
    const defendingTroops = defendingTroopState!.count
    console.info(`Attacking ${attackingTroops} against ${defendingTroops} troops from ${attackingTerritory} to ${defendingTerritory}`)
    const losses = this.attackRng(attackingTroops, defendingTroops)
    if (losses[0] === attackingTroops) {
      console.info(`Attacker lost (attacker: ${-losses[0]}, defender: ${-losses[1]})`)
      attackingTroopState!.count -= losses[0]
      defendingTroopState!.count -= losses[1]
    }
    else {
      console.info(`Defender lost (attacker: ${-losses[0]}, defender: ${-losses[1]})`)
      attackingTroopState!.count -= attackingTroops
      defendingTroopState!.count = attackingTroops - losses[0]
      defendingTroopState!.player = attackingTroopState!.player
    }
    return this
  }

  fortify(troops: number, fromTerritory: string, toTerritory: string): GameController {
    console.info(`Fortifying ${troops} troops from ${fromTerritory} to ${toTerritory}`)
    const fromTroopState = this.mapController.getTroopState(fromTerritory)
    const toTroopState = this.mapController.getTroopState(toTerritory)
    fromTroopState!.count -= troops
    toTroopState!.count += troops
    return this.startNextPlayerTurn()
  }

  getTroopCount(territory: string): number {
    const troopState = this.mapController.getTroopState(territory)
    return troopState!.count
  }

  getNextPlayer(): string {
    const currentPlayerIndex = this.gameState.playerConfigs.findIndex(x => x.color === this.gameState.currentPlayer)
    let nextPlayerIndex = currentPlayerIndex
    do {
      nextPlayerIndex = (nextPlayerIndex + 1) % this.gameState.playerConfigs.length
    } while (this.hasPlayerLost(this.gameState.playerConfigs[nextPlayerIndex].color))
    return this.gameState.playerConfigs[nextPlayerIndex].color
  }

  startNextPlayerTurn(): GameController {
    return this.startPlayerTurn(this.getNextPlayer())
  }

  startPlayerTurn(player: string): GameController {
    this.gameState.currentPlayer = player
    this.gameState.troopsToDeploy = 3
    console.info(`Starting player ${player}'s turn with ${this.gameState.troopsToDeploy} troops to deploy`)
    return this.startPhase('deploy')
  }

  startNextPhase(): GameController {
    if (this.gameState.currentPhase === 'deploy')
      return this.startPhase('attack')
    if (this.gameState.currentPhase === 'attack')
      return this.startPhase('fortify')

    return this.startNextPlayerTurn()
  }

  startPhase(phase: GamePhase): GameController {
    console.info(`Starting ${phase} phase`)
    this.gameState.currentPhase = phase
    return this
  }

  getPlayerTerritoryTotal(player: string): number {
    return this.gameState.troops.filter(x => x.player.color === player).map(_ => 1).reduce((a, b) => a + b, 0)
  }

  getPlayerTroopTotal(player: string): number {
    return this.gameState.troops.filter(x => x.player.color === player).map(x => x.count).reduce((a, b) => a + b, 0)
  }

  getPlayerCardTotal(_player: string): number {
    /* TODO */
    return 0
  }

  hasPlayerLost(_player: string) {
    /* TODO */
    return false
  }

  cycleTerritory(territory: string) {
    const troopState = this.mapController.getTroopState(territory)
    if (!troopState) {
      console.warn(`Could not find territory ${territory}`)
      return
    }

    troopState.player = this.gameState.playerConfigs[troopState.player.position % this.gameState.playerConfigs.length]
  }
}
