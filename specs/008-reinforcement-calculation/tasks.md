---

description: "Task list for Reinforcement Calculation"
---

# Tasks: Reinforcement Calculation

**Input**: Design documents from `/specs/008-reinforcement-calculation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included — the constitution requires test coverage for new logic
in `controllers/`, so each user story phase adds test cases before its
implementation task.

**Organization**: Tasks are grouped by user story (spec.md priorities) to
enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in every task description

## Path Conventions

Single project (existing `src/` React+TS app). All work lands in
`src/controllers/GameController.ts` and its colocated test file — no new
files or directories, per plan.md's Structure Decision.

---

## Phase 1: Setup

**Purpose**: Confirm a clean starting point before touching turn-start logic

- [x] T001 Run `pnpm run lint && pnpm run test && pnpm run build` from the
  repo root and confirm all three pass with no pre-existing failures in
  `src/controllers/GameController.ts` / `src/controllers/GameController.test.ts`,
  per the constitution's CI-gate principle.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire a single, extensible reinforcement calculation into
turn-start, without changing observable behavior yet (still flat 3) — this
is the scaffold every user story below extends.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 In `src/controllers/GameController.ts`, add a new method
  `calculateReinforcement(player: string, capitalsOwned: number = 0): number`
  that currently just `return 3` (preserves existing behavior exactly), and
  update `startPlayerTurn()` to replace the hardcoded
  `this.gameState.troopsToDeploy = 3` with
  `this.gameState.troopsToDeploy = this.calculateReinforcement(player)`.

**Checkpoint**: Game behaves identically to before (flat 3 troops/turn),
now routed through one extensible method. User story implementation can
begin.

---

## Phase 3: User Story 1 - Reinforcements grow with territory held (Priority: P1) 🎯 MVP

**Goal**: Replace the flat reinforcement amount with
`max(3, floor(territories/3))`, so holding more territory yields more
troops.

**Independent Test**: Give a player a small number of territories and
confirm they receive 3; give another player a large number of territories
(e.g. 12) and confirm their reinforcement is proportionally higher (4).

### Tests for User Story 1

- [x] T003 [US1] In `src/controllers/GameController.test.ts`, add test
  cases for `calculateReinforcement`/`startPlayerTurn` asserting: a player
  owning 1–8 territories receives exactly 3 (SC-001, Acceptance Scenario 1);
  a player owning 12 territories receives 4, and 15 territories receives 5
  (SC-002, Acceptance Scenario 2). These tests must fail against the
  Phase 2 stub before Phase 3's implementation task.

### Implementation for User Story 1

- [x] T004 [US1] In `src/controllers/GameController.ts`, implement the
  territory rule inside `calculateReinforcement`: replace the flat `3` with
  `Math.max(3, Math.floor(this.getPlayerTerritoryTotal(player) / 3))`
  (FR-002).

**Checkpoint**: User Story 1 is fully functional and independently
testable — reinforcement now scales with territory count.

---

## Phase 4: User Story 2 - Controlling a whole continent earns a bonus (Priority: P1)

**Goal**: Add each fully-controlled continent's configured bonus on top of
the territory-based amount, ignoring blizzard-frozen territories when
checking full control.

**Independent Test**: Have a player own every non-frozen territory in one
continent and confirm the continent's bonus is added on top of the
territory-rule amount; have a player own all-but-one (unfrozen) territory
in a continent and confirm no bonus is awarded for it.

### Tests for User Story 2

- [x] T005 [US2] In `src/controllers/GameController.test.ts`, add test
  cases covering: owning every non-frozen territory in a continent awards
  its `bonusTroops` (Acceptance Scenario 1, SC-003); owning all but one
  unfrozen territory in a continent awards nothing for it (Acceptance
  Scenario 2); a continent whose only missing territory is blizzard-frozen
  still counts as fully controlled and awards its bonus (Acceptance
  Scenario 3, FR-004); owning two full continents sums both bonuses
  (Acceptance Scenario 4, FR-005); a resigned player's untouched
  territories still count toward another player's full-control check
  (FR-006). These tests must fail before this phase's implementation task.

### Implementation for User Story 2

- [x] T006 [US2] In `src/controllers/GameController.ts`, extend
  `calculateReinforcement` to add a continent bonus term: iterate
  `Object.keys(this.gameState.mapConfig.continents)`, and for each
  continent `c` where `this.mapController.getContinentOwner(c) === player`,
  add `this.gameState.mapConfig.continents[c].bonusTroops` to the returned
  total (FR-003, FR-004, FR-005 — full-control and frozen-territory
  exclusion are already handled by the existing `getContinentOwner`/
  `getContinentTerritories`).

**Checkpoint**: User Stories 1 AND 2 both work independently — reinforcement
now includes territory + continent bonus; capital term still contributes 0.

---

## Phase 5: User Story 3 - Owning capitals adds to reinforcement (Priority: P2)

**Goal**: Add a fixed per-capital bonus for each capital territory the
player owns, contributing nothing when capital mode is inactive.

**Independent Test**: With capital mode active and a player owning a known
number of capital territories, confirm reinforcement includes the correct
additional amount; with capital mode inactive (default), confirm no such
amount is ever added.

### Tests for User Story 3

- [x] T007 [US3] In `src/controllers/GameController.test.ts`, add test
  cases asserting: `calculateReinforcement(player, 1)` adds the per-capital
  bonus once (Acceptance Scenario 1); `calculateReinforcement(player, 3)`
  adds three times the bonus (Acceptance Scenario 2, FR-007); calling
  `calculateReinforcement(player)` with no `capitalsOwned` argument (the
  default) adds nothing (Acceptance Scenario 3, FR-008, SC-004). These
  tests must fail before this phase's implementation task.

### Implementation for User Story 3

- [x] T008 [US3] In `src/controllers/GameController.ts`, add a named
  constant `CAPITAL_REINFORCEMENT_BONUS = 2` near the top of the file
  (matching the existing card-bonus constant style in `GameLogic.ts`), and
  add `capitalsOwned * CAPITAL_REINFORCEMENT_BONUS` to
  `calculateReinforcement`'s returned total.

**Checkpoint**: All three user stories now work independently — full
reinforcement formula (territory + continent + capital) is implemented.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Close remaining spec requirements that cut across all three
stories

- [x] T009 [US1] In `src/controllers/GameController.test.ts`, add a
  regression test for SC-005: after a player captures a
  continent-completing territory during turn N, their
  `calculateReinforcement` result (and `troopsToDeploy` via
  `startPlayerTurn`) reflects the new continent bonus the next time their
  turn starts.
- [x] T010 In `src/controllers/GameController.test.ts`, add a boundary test
  for the Edge Cases section: a continent with zero non-frozen territories
  awards its bonus to no one (covered by `getContinentOwner` returning
  `undefined` for an empty territory list — add an explicit regression test
  so this doesn't silently regress).
- [x] T011 Run `pnpm run lint && pnpm run test && pnpm run build` from the
  repo root and fix any failures, per the constitution's CI-gate principle.
- [x] T012 Follow `specs/008-reinforcement-calculation/quickstart.md`'s
  manual validation steps in the browser (`pnpm run dev`): confirm the
  deploy-phase troop count shown at turn start matches the new formula for
  territory count, continent control, and (once testable) capital
  ownership.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1. BLOCKS all user stories
  (T004/T006/T008 all edit the same method `calculateReinforcement`
  introduced in T002).
- **User Stories (Phase 3–5)**: All depend on Phase 2. Each story's
  implementation task (T004, T006, T008) touches the same method in the
  same file, so stories must be implemented sequentially in priority order
  (P1 → P1 → P2) even though they are independently testable in isolation
  once their own task is done.
- **Polish (Phase 6)**: Depends on Phases 3–5 being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2. No dependency on other
  stories.
- **User Story 2 (P1)**: Can start after Phase 2. Additive to US1's term in
  the same sum; independently testable via `calculateReinforcement` even
  before US1's task lands (continent term is unconditional), though tasks
  are sequenced T004 → T006 for file-conflict reasons above.
- **User Story 3 (P2)**: Can start after Phase 2. Additive to US1/US2's
  terms; independently testable via the `capitalsOwned` parameter.

### Within Each User Story

- Tests (T003, T005, T007) are written first and must fail against the
  Phase 2 stub before their story's implementation task.
- Each story's checkpoint leaves the feature in a fully working,
  demoable state.

### Parallel Opportunities

- None across implementation tasks — T002, T004, T006, T008 all edit the
  same method in `src/controllers/GameController.ts` and must be done
  sequentially.
- T003, T005, T007 each touch the same test file as their story's sibling
  test task set, but different stories' test tasks could be drafted in
  parallel by different people if working ahead of the sequential
  implementation order (not marked [P] here since they still land in the
  same file, `GameController.test.ts`, one story at a time in this
  single-file feature).

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (scaffold, still flat 3).
3. Complete Phase 3: User Story 1 (territory rule).
4. **STOP and VALIDATE**: Run T003's tests, confirm SC-001/SC-002 hold.
5. Reinforcement now scales with territory — demoable on its own.

### Incremental Delivery

1. Setup + Foundational → scaffold ready, behavior unchanged.
2. Add User Story 1 → territory rule live → validate → demo.
3. Add User Story 2 → continent bonus live → validate → demo.
4. Add User Story 3 → capital bonus live (inert until Capital Mode exists)
   → validate → demo.
5. Polish → close SC-005 and the zero-non-frozen-continent edge case, run
   full CI gate, manual browser check.

---

## Notes

- All implementation tasks (T002, T004, T006, T008) modify the same
  `calculateReinforcement` method in `src/controllers/GameController.ts`,
  so despite being organized by independent user story, they must be
  executed in the listed order to avoid merge/edit conflicts within one
  file.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before
  continuing.
