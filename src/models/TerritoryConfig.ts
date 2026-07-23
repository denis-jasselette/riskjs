export default interface TerritoryConfig {
  coords: { x: number, y: number }
  continent: string
  path: string
  adjacency: string[]
  /**
   * Territories whose path is drawn as several disconnected landmasses (e.g.
   * an island group) leave a "dead zone" between them with no fill to click
   * — the empty gap doesn't belong to any territory. Set true to add an
   * invisible click-catch covering the path's full bounding box, so clicks
   * anywhere between the landmasses still resolve to this territory. Safe
   * only when nothing else's clickable area falls within that bounding box.
   */
  expandedHitbox?: boolean
}
