---

description: "Task list for Blizzard Connectivity Guarantee"
---

# Tasks: Blizzard Connectivity Guarantee

**Input**: Design documents from `/specs/010-blizzard-connectivity/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
quickstart.md

**Tests**: Included — the constitution requires test coverage for new
logic in `controllers/`, and this feature's correctness claim is
inherently statistical (holds across many randomized setups), making
automated tests the primary validation method rather than manual play.

**Organization**: This spec has a single user story (P1), so Setup →
Foundational → User Story 1 → Polish is the full structure; there is no
multi-story parallelism to organize around.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1)
- Exact file paths are included in every task description

## Path Conventions

Single project. All work lands in `src/controllers/GameLogic.ts` plus a new
`src/controllers/GameLogic.test.ts` (no test file currently exists for this
class) — no model changes, per plan.md's Structure Decision.

---

## Phase 1: Setup

**Purpose**: Confirm a clean starting point before touching blizzard setup
logic

- [ ] T001 Run `pnpm run lint && pnpm run test && pnpm run build` from the
  repo root and confirm all three pass with no pre-existing failures in
  `src/controllers/GameLogic.ts`, per the constitution's CI-gate principle.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the reusable graph-connectivity primitive that the
blizzard-selection algorithm depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 In `src/controllers/GameLogic.ts`, add a new private static
  method `isConnectedExcluding(territories: Record<string, TerritoryConfig>,
  excluded: Set<string>): boolean` that performs a BFS/DFS over `adjacency`
  edges among all territory names in `territories` not present in
  `excluded`, returning `true` only if every remaining territory is
  reachable from every other remaining territory (or if zero territories
  remain, vacuously `true`, consistent with `MapController.getContinentOwner`'s
  handling of an empty set).

**Checkpoint**: Connectivity primitive exists and is independently
correct; the User Story phase can now wire it into blizzard selection.

---

## Phase 3: User Story 1 - Every territory remains reachable despite blizzards (Priority: P1) 🎯 MVP

**Goal**: Blizzard territories are selected such that every non-frozen
territory remains reachable from every other non-frozen territory, without
changing the configured blizzard count or any other blizzard behavior.

**Independent Test**: Start many games with blizzards enabled on the same
map, and for each one, verify every non-frozen territory can reach every
other non-frozen territory through a path of non-frozen territories.

### Tests for User Story 1

- [ ] T003 [US1] Create `src/controllers/GameLogic.test.ts` (new file) with
  test cases: run `GameLogic.autoSetupTroops` (or the blizzard-selection
  logic directly, if factored out in T004) 100+ times against the classic
  map's `MapConfig` with `blizzardsEnabled = true`, and for each run assert
  `GameLogic.isConnectedExcluding(mapConfig.territories, new
  Set(blizzards))` is `true` (SC-001, SC-002, Acceptance Scenarios 1–2) and
  `blizzards.length === mapConfig.blizzards` (SC-003, FR-003); separately
  assert that with `blizzardsEnabled = false`, the returned blizzard list
  is empty (FR-004, Acceptance Scenario 3). These tests must fail against
  the current `shuffle(deck).slice(0, mapConfig.blizzards)` implementation
  before T004.

### Implementation for User Story 1

- [ ] T004 [US1] In `src/controllers/GameLogic.ts`, replace the
  `blizzardsEnabled` branch's body inside `autoSetupTroops` with a
  connectivity-safe selection: shuffle `Object.keys(mapConfig.territories)`
  (via the existing `shuffled()` from `lib/Random.ts`) as the candidate
  order, then walk it tentatively freezing one territory at a time and
  keeping it frozen only if `isConnectedExcluding` (T002) still returns
  `true` for the resulting frozen set, until `mapConfig.blizzards`
  territories are frozen or candidates are exhausted. Because
  `autoSetupTroops`'s existing `deck`/`topDeckIndex`/`remainingCardCount`
  bookkeeping assumes the blizzard set is exactly `deck.slice(0,
  mapConfig.blizzards)`, reorder `deck` in place so the chosen frozen
  territories occupy indices `[0, mapConfig.blizzards)` (in any order) and
  every other territory keeps its existing relative shuffled order after
  that point — this keeps the downstream player-card-assignment loop
  (`deck[topDeckIndex + j]`) correct without further changes. Depends on
  T002.

**Checkpoint**: User Story 1 is fully functional and independently
testable — blizzard selection now guarantees connectivity, blizzard count
and all other blizzard behavior unchanged.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [ ] T005 Manual validation: follow
  `specs/010-blizzard-connectivity/quickstart.md`'s manual steps —
  `pnpm run dev`, start several games with blizzards enabled on the
  classic map, and visually confirm frozen territories never appear to cut
  the map into isolated regions; start one game with blizzards disabled
  and confirm no territories are marked frozen.
- [ ] T006 Run `pnpm run lint && pnpm run test && pnpm run build` from the
  repo root and fix any failures, per the constitution's CI-gate principle.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1. BLOCKS User Story 1 (T004
  calls `isConnectedExcluding` from T002).
- **User Story 1 (Phase 3)**: Depends on Phase 2.
- **Polish (Phase 4)**: Depends on Phase 3 being complete.

### Within User Story 1

- T003 (tests) is written first and must fail against the current
  random-slice implementation before T004 (implementation).

### Parallel Opportunities

- None — this feature has a single user story and every task after Setup
  depends on the one before it in the same file
  (`src/controllers/GameLogic.ts` / its new test file).

---

## Implementation Strategy

### MVP First (and only) Scope

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (connectivity primitive).
3. Complete Phase 3: User Story 1 (connectivity-safe selection wired in).
4. **STOP and VALIDATE**: Run T003's statistical tests, confirm SC-001–003
   hold across all iterations.
5. Complete Phase 4: Polish (manual sanity check, full CI gate).

---

## Notes

- This feature has no UI changes and a single user story — the phase
  structure is intentionally minimal.
- Commit after each task or logical group.
