# Implementation Plan: Blizzard Connectivity Guarantee

**Branch**: `010-blizzard-connectivity` | **Date**: 2026-07-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-blizzard-connectivity/spec.md`

## Summary

`GameLogic.autoSetupTroops()` currently picks blizzard territories via
`shuffle(deck).slice(0, mapConfig.blizzards)` — the deck being all territory
names — with no connectivity awareness at all. Replace this with a
selection routine that only ever freezes a territory if doing so leaves the
remaining (non-frozen) territory graph connected, using `MapConfig.
territories[x].adjacency` as the graph. Nothing else in `autoSetupTroops`
changes: the blizzard *count* stays exactly `mapConfig.blizzards`, and troop
distribution over the remaining deck is untouched.

## Technical Context

**Language/Version**: TypeScript 5 (strict), no new runtime dependency.

**Primary Dependencies**: None new. Pure graph traversal (BFS/DFS) over data
already in `MapConfig.territories`; no library needed for a ~42-node graph.

**Storage**: N/A.

**Testing**: Vitest 2. This is the one Phase 1 feature with a genuine
algorithmic correctness property (SC-001/SC-002), so it gets the most
property-style test coverage: run selection many times over the classic map
and assert full connectivity of the non-frozen set every time, plus assert
the frozen count always matches `mapConfig.blizzards` (SC-003).

**Target Platform**: N/A beyond existing app — this runs once at game setup,
synchronously, before the first `startPlayerTurn`.

**Project Type**: Single project. Change is confined to `GameLogic.ts`
(setup-time logic), plus a new small connectivity-check helper.

**Performance Goals**: Setup-time only, runs once per new game on a ~42-node
graph with (per Assumptions) 3 blizzards — negligible cost for any
reasonable selection strategy; no explicit budget needed.

**Constraints**: Must not change blizzard *count* (FR-003) or touch any
other blizzard behavior — pathing exclusion (`MapController._bfs`'s
`isTerritoryBlizzard` skip), continent-control exclusion
(`getContinentTerritories`), non-selectability (`isSelectable`) — all of
which read `gameState.blizzards` and are already correct and out of scope.
Must do nothing when blizzards are disabled (FR-004) — already true today
via the `blizzardsEnabled` branch in `autoSetupTroops`; the new logic only
replaces the `if (blizzardsEnabled)` branch's body.

**Scale/Scope**: Classic map only (42 territories) for now, per the spec's
Assumptions; algorithm should be map-agnostic (operates on whatever
`mapConfig.territories` adjacency graph it's given) but is not required to
handle a hypothetical always-disconnected future map gracefully — that's
explicitly out of scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. CI Gate is Law** — Validated via `pnpm run lint/test/build`; the new
  connectivity property is exactly the kind of thing that belongs in an
  automated test rather than manual verification.
- **II. Strict Typing, No Silent Escapes** — New helper takes a typed
  `MapConfig`/territory-name-keyed adjacency structure and a `Set<string>`
  of candidate-frozen territories; returns `boolean`/`string[]`, no `any`.
- **III. CSS Module Isolation** — N/A, no UI change.
- **IV. Mobile Rendering Discipline** — N/A, no rendering change.
- **V. Convention Over Improvisation** — No new dependencies (graph
  traversal is small enough to hand-roll consistent with the existing
  hand-rolled BFS in `MapController._bfs`); no lockfile changes.

**Result**: PASS — no violations, no Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/010-blizzard-connectivity/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md            # /speckit-tasks — not yet created
```

No `contracts/` directory — setup-time internal algorithm change, no
external interface.

### Source Code (repository root)

```text
src/
├── controllers/
│   └── GameLogic.ts               # autoSetupTroops() — replace random slice with connectivity-aware selection
├── lib/
│   └── Random.ts                  # shuffled() reused for randomizing candidate order
└── models/
    └── MapConfig.ts                # territories[x].adjacency — existing graph data, read-only
```

**Structure Decision**: Single project. The new connectivity-check helper is
added alongside `GameLogic` (either as a private static method on
`GameLogic` or a small colocated pure function) since it's only ever called
from `autoSetupTroops`; it operates purely on `MapConfig` data and does not
need a `GameState`/`MapController` instance (none exists yet at setup time).

## Complexity Tracking

*No Constitution Check violations — table intentionally omitted.*
