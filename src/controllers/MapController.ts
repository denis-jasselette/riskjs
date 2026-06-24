import GameState from '@/models/GameState'
import TroopState from '@/models/TroopState'

export class PathingOptions {
  allowIdentityRoute?: boolean = false
  sameOwner?: boolean = false
  differentOwner?: boolean = false
  maxDepth?: number | undefined
}

export type TerritoryId = string

export type Route = TerritoryId[]

export class MapController {
  readonly gameState: GameState

  constructor(gameState: GameState) {
    this.gameState = gameState
  }

  isTerritoryBlizzard(territory: string): boolean {
    return this.gameState.blizzards.includes(territory)
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

  getPortalNeighbours(territory: TerritoryId): TerritoryId[] {
    const portals = this.gameState.portals ?? this.gameState.mapConfig.portals ?? []
    const neighbours: TerritoryId[] = []
    for (const [a, b] of portals) {
      if (a === territory) neighbours.push(b)
      else if (b === territory) neighbours.push(a)
    }
    return neighbours
  }

  _bfs(start: TerritoryId, end: TerritoryId, options: PathingOptions): Route | null {
    const initRoute = [start]
    if (start === end) {
      if (options.allowIdentityRoute)
        return initRoute
      else
        return null
    }

    const startOwner = this.getTerritoryOwner(start)
    const visitedSet = new Set<TerritoryId>([])
    const explorationQueue: Route[] = [initRoute]
    let route
    while ((route = explorationQueue.shift())) {
      const lastNode = route[route.length - 1]
      if (lastNode === end)
        return route

      if (options.maxDepth && route.length >= options.maxDepth)
        continue

      visitedSet.add(lastNode)

      const neighbours = [
        ...this.gameState.mapConfig.territories[lastNode].adjacency,
        ...this.getPortalNeighbours(lastNode),
      ]

      for (const nextNode of neighbours) {
        if (visitedSet.has(nextNode))
          continue

        if (this.isTerritoryBlizzard(nextNode))
          continue

        if (options.sameOwner && startOwner !== this.getTerritoryOwner(nextNode))
          continue

        if (options.differentOwner && startOwner === this.getTerritoryOwner(nextNode))
          continue

        explorationQueue.push([...route, nextNode])
      }
    }

    return null
  }

  shortestRoute(start: TerritoryId, end: TerritoryId, options: PathingOptions = {}): Route | null {
    return this._bfs(start, end, options)
  }

  areConnected(start: TerritoryId, end: TerritoryId, options: PathingOptions = {}): boolean {
    return this.shortestRoute(start, end, options) !== null
  }

  areAdjacent(start: TerritoryId, end: TerritoryId, options: PathingOptions = {}): boolean {
    return this.shortestRoute(start, end, { ...options, maxDepth: 2 }) !== null
  }

  getVisibleTerritories(playerId: string): string[] {
    const owned = this.gameState.troops
      .filter(t => t.player.color === playerId)
      .map(t => t.territory)

    const visible = new Set<string>(owned)
    for (const territory of owned) {
      const config = this.gameState.mapConfig.territories[territory]
      if (config) {
        for (const adj of config.adjacency) {
          visible.add(adj)
        }
      }
    }

    return Array.from(visible)
  }
}
