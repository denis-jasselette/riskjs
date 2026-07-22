# Phase 1 Data Model: Blizzard Connectivity Guarantee

No `GameState` schema changes — `blizzards: string[]` (already on
`GameState`, set once at setup) keeps its exact shape and meaning. This
feature only changes the *algorithm* that produces its initial value.

## Territory Adjacency Graph (existing data, read-only)

Sourced from `MapConfig.territories: Record<string, TerritoryConfig>`,
specifically each entry's `adjacency: string[]` (`src/models/
TerritoryConfig.ts`). Treated as an undirected graph for this feature's
purposes: territory names are nodes, `adjacency` entries are edges. This
feature reads this structure; it does not modify `TerritoryConfig` or
`MapConfig`.

## Blizzard Selection (setup-time computation, not a new persisted entity)

| Concept                | Type              | Notes                                                                 |
|--------------------------|-------------------|--------------------------------------------------------------------------|
| Candidate order          | `string[]`        | All territory names, randomized via existing `shuffled()` (`lib/Random.ts`). |
| Frozen set (in progress) | `Set<string>`     | Grows one territory at a time; a candidate is added only if the remaining graph (all territories minus this set) stays fully connected. |
| Result                   | `string[]`        | Final frozen set, length `mapConfig.blizzards` under normal (satisfiable) map configuration — same type/shape as today's `GameState.blizzards`. |

**Validation rules** (from FRs):
- The result's length equals `mapConfig.blizzards` in every normal case
  (FR-003, SC-003) — the classic map (42 territories, 3 blizzards) is
  assumed always satisfiable per the spec's Assumptions.
- Removing the result set from the full territory list must leave every
  remaining territory reachable from every other remaining territory via
  `adjacency` edges (FR-001, FR-002, SC-001, SC-002) — enforced by checking
  connectivity after each tentative addition, not just once at the end.
- When `blizzardsEnabled` is `false`, this computation does not run at all
  (FR-004) — the existing `if (blizzardsEnabled) ... else return []` branch
  in `autoSetupTroops` already short-circuits this; only the `if` branch's
  body changes.

## Existing entities referenced, not modified

- **`GameState.blizzards: string[]`** — receives this feature's output,
  same field, same type, same downstream consumers
  (`MapController.isTerritoryBlizzard` and everything built on it).
- **`MapConfig.blizzards: number`** — the configured count this feature must
  keep matching exactly.
