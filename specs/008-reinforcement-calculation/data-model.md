# Phase 1 Data Model: Reinforcement Calculation

No new persisted entities or schema changes. This feature adds one
computation over data that already exists in `GameState`/`MapConfig`, plus
one new function-local return shape used to keep the calculation testable
and debuggable.

## Reinforcement Total (computed, not stored)

Not a stored field — the sum consumed once by `startPlayerTurn` to set
`GameState.troopsToDeploy` (existing field, unchanged shape/type).

| Component            | Type     | Source                                                                 |
|-----------------------|----------|-------------------------------------------------------------------------|
| `territoryAmount`     | `number` | `max(3, floor(territoryCount / 3))`                                     |
| `continentAmount`     | `number` | Sum of `mapConfig.continents[x].bonusTroops` for each continent where `MapController.getContinentOwner(x) === player` |
| `capitalAmount`       | `number` | `capitalsOwned * 2` (capital-mode bonus per FR-007); `0` when `capitalsOwned` is `0` (default, or capital mode inactive) |
| `total`                | `number` | `territoryAmount + continentAmount + capitalAmount`                     |

**Validation rules** (from FRs):
- `territoryAmount` is never below 3 (FR-002 / SC-001) — enforced by the
  `max(3, ...)` clamp itself, no separate validation needed.
- `continentAmount` only includes continents where *every* non-frozen
  territory is owned by the player (FR-003, FR-004) — delegated entirely to
  `MapController.getContinentOwner`, which already implements this via
  `getContinentTerritories`'s blizzard filter.
- `capitalAmount` is `0` whenever capital mode is off or `capitalsOwned` is
  `0` (FR-008) — both collapse to the same `capitalsOwned = 0` input path,
  so no separate "is capital mode active" branch is needed inside this
  function; the caller (`startPlayerTurn`) is responsible for passing `0`
  until feature 012 exists.
- Recomputed fresh every call, no caching (FR-009) — the function takes no
  memoized state and reads current `GameState`/`MapConfig` values only.

## Continent Bonus Configuration (existing entity, referenced not modified)

Already defined in `MapConfig.continents: Record<string, { bonusTroops:
number, path: string }>` (`src/models/MapConfig.ts`). This feature reads
`bonusTroops` per continent; it does not add or change fields here. Per the
spec's Assumptions, authoring/tuning these values for a given map is a
content task outside this feature's scope.

## Capital Ownership Count (external input, not modelled here)

Represented purely as a `number` parameter to the new reinforcement function.
This feature does not define where that number comes from — Capital Mode
(012) owns that data model. Passing `0` is the only contract this feature
depends on today.
