import { GamePhase } from '@/models/GamePhase'
import GameState from '@/models/GameState'
import TroopState from '@/models/TroopState'

export default class GameController {
  gameState: GameState

  constructor(gameState: GameState) {
    this.gameState = { ...gameState }
  }

  areTerritoriesConnected(a: string, b: string): boolean {
    /* TODO: implement full method */
    return this.areTerritoriesAdjacent(a, b)
  }

  areTerritoriesAdjacent(a: string, b: string): boolean {
    return (this.gameState.mapConfig.territories[a].adjacency.includes(b) || this.gameState.mapConfig.territories[b].adjacency.includes(a))
  }

  isSelectable(territory: string, selectedTerritory: string | null = null): boolean {
    if (this.isTerritoryBlizzard(territory))
      return false
    if (this.gameState.currentPlayer !== this.gameState.userPlayer)
      return false
    if (selectedTerritory === territory)
      return true

    const owner = this.getTerritoryOwner(territory)
    if (this.gameState.currentPhase === 'deploy')
      return owner === this.gameState.currentPlayer
    if (this.gameState.currentPhase === 'fortify')
      return owner === this.gameState.currentPlayer && (!selectedTerritory || this.areTerritoriesConnected(selectedTerritory, territory))
    if (this.gameState.currentPhase === 'attack') {
      if (owner === this.gameState.currentPlayer)
        return true

      return !!selectedTerritory && this.areTerritoriesAdjacent(selectedTerritory, territory)
    }
    return false
  }

  isTerritoryBlizzard(territory: string): boolean {
    return this.gameState.blizzards.includes(territory)
  }

  deploy(troops: number, territory: string): GameController {
    console.info(`Deploying ${troops} troops in ${territory}`)
    this.getTroopState(territory)!.count += troops
    this.gameState.troopsToDeploy -= troops

    if (this.gameState.troopsToDeploy <= 0)
      this.startPhase('attack')

    return this
  }

  attack(troops: number, attackingTerritory: string, defendingTerritory: string): GameController {
    console.info(`Attacking with ${troops} troops from ${attackingTerritory} to ${defendingTerritory}`)
    const attackingTroopState = this.getTroopState(attackingTerritory)
    const defendingTroopState = this.getTroopState(defendingTerritory)
    attackingTroopState!.count -= troops
    defendingTroopState!.count = troops
    defendingTroopState!.player = attackingTroopState!.player
    return this
  }

  fortify(troops: number, fromTerritory: string, toTerritory: string): GameController {
    console.info(`Fortifying ${troops} troops from ${fromTerritory} to ${toTerritory}`)
    const fromTroopState = this.getTroopState(fromTerritory)
    const toTroopState = this.getTroopState(toTerritory)
    fromTroopState!.count -= troops
    toTroopState!.count += troops
    return this.startNextPlayerTurn()
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

  getContinentTerritories(continent: string): string[] {
    return Object.entries(this.gameState.mapConfig.territories)
      .filter(([name, value]) => value.continent == continent && !this.isTerritoryBlizzard(name))
      .map(([name, _]) => name)
  }

  getTerritoryOwner(territory: string): string | undefined {
    return this.getTroopState(territory)?.player?.color
  }

  getTroopState(territory: string): TroopState | undefined {
    return this.gameState.troops.find(x => x.territory === territory)
  }

  getContinentOwner(continent: string): string | undefined {
    const continentTerritories = this.getContinentTerritories(continent)
    const owners = continentTerritories.map(x => this.getTerritoryOwner(x))
    if (owners.length === 0)
      return undefined

    const continentOwnerCandidate = owners[0]
    if (owners.every(x => x === continentOwnerCandidate))
      return continentOwnerCandidate

    return undefined
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
    const troopState = this.getTroopState(territory)
    if (!troopState) {
      console.warn(`Could not find territory ${territory}`)
      return
    }

    troopState.player = this.gameState.playerConfigs[troopState.player.position % this.gameState.playerConfigs.length]
  }
}
