---

description: "Task list for Capital Mode"
---

# Tasks: Capital Mode

**Input**: Design documents from `/specs/012-capital-mode/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
quickstart.md

**Tests**: Included for all `GameController`/`MapController` logic, per
the constitution's Technology Stack Constraints ("New logic in
`controllers/` and `models/` requires corresponding test coverage").
UI-only wiring is validated manually per the constitution's UI rule
instead, referencing exact quickstart.md steps.

**Organization**: Tasks are grouped by user story (spec.md priorities) to
enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Exact file paths are included in every task description

## Path Conventions

Single project. Model (`src/models/GameState.ts`), controllers
(`src/controllers/GameController.ts`, `MapController.ts`, `GameLogic.ts`),
and UI (`src/App.tsx`, `src/components/menu/GameOver.tsx`,
`src/components/Game.tsx`, `src/components/actionMenu/`), per plan.md's
Structure Decision.

---

## Phase 1: Setup

**Purpose**: Confirm a clean starting point before touching capital-mode
state

- [x] T001 Run `pnpm run lint && pnpm run test && pnpm run build` from the
  repo root and confirm all three pass with no pre-existing failures, per
  the constitution's CI-gate principle.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Introduce the capital-mode state shape and entry point that
every user story depends on — without this, no capital can ever be
assigned, tracked, or queried.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] In `src/models/GameState.ts`, add `capitalMode: boolean`
  and `capitals: Record<string, string>` fields, defaulted to `false` and
  `{}` respectively in the constructor, following the exact style of the
  existing `blizzards: string[]` field.
- [x] T003 In `src/controllers/GameLogic.ts`, add a `capitalModeEnabled:
  boolean` parameter to `initState()`. When `true`, build the `GameState`
  with `capitalMode: true`, `capitals: {}`, `currentPhase: 'capitalDeploy'`,
  `currentPlayer: playerConfigs[0].color`, and return it directly —
  **without** calling `startPlayerTurn` (that only happens once every
  player has chosen a capital, via T006). When `false`, behavior is
  unchanged. Depends on T002.
- [x] T004 [P] In `src/controllers/MapController.ts`, add
  `isTerritoryCapital(territory: string): boolean` (mirrors
  `isTerritoryBlizzard()`), `getPlayerCapitalTerritory(player: string):
  string | undefined`, and `getPlayerCapitalCount(player: string): number`
  (counts capitals in `gameState.capitals` currently owned by `player`, via
  `getTerritoryOwner()`). Depends on T002.
- [x] T005 In `src/controllers/GameController.ts`, add a `'capitalDeploy'`
  branch to `isSelectable()`: `return owner === this.gameState.currentPlayer`
  (any of the current player's own territories is selectable; no
  forced-trade-in check, since no cards exist yet at round 1). Depends on
  T002.
- [x] T006 [P] In `src/controllers/GameController.test.ts`, add a
  `describe('capital mode — foundational', ...)` block covering:
  `initState()` with `capitalModeEnabled: true` produces `currentPhase:
  'capitalDeploy'` and does not call `startPlayerTurn` (no `troopsToDeploy`
  set); `isSelectable()` returns `true` for the current player's own
  territory and `false` for others' during `'capitalDeploy'`. Depends on
  T003, T005.

**Checkpoint**: A capital-mode game can be created and enters the
`'capitalDeploy'` phase; no capital can yet be chosen or observed — the
foundation is ready for User Story 1.

---

## Phase 3: User Story 1 - Choose a capital at the start of the game (Priority: P1) 🎯 MVP

**Goal**: Each player, in turn order, chooses one of their own territories
as their capital during a one-time round-1 placement step, gaining +2
troops immediately, before normal turns begin.

**Independent Test**: Start a game with capital mode enabled, have each
player choose one of their territories as their capital in turn order, and
confirm each chosen territory's troop count increases by 2 immediately
upon being chosen.

### Tests for User Story 1

- [x] T007 [P] [US1] In `src/controllers/GameController.test.ts`, add a
  `describe('chooseCapital()', ...)` block covering: choosing a territory
  adds 2 troops to it immediately; turn order advances through all
  `playerConfigs` in array order after each choice; after the last player
  chooses, `startPlayerTurn(playerConfigs[0].color)` fires and
  `currentPhase` becomes `'deploy'` with a nonzero `troopsToDeploy`.
  Depends on T006.

### Implementation for User Story 1

- [x] T008 [US1] In `src/controllers/GameController.ts`, add
  `chooseCapital(territory: string): GameController`: sets
  `gameState.capitals[territory] = gameState.currentPlayer`, adds 2 troops
  to that territory's `TroopState.count`, then advances to the next player
  in `playerConfigs` order — or, if the current player was last in order,
  calls `startPlayerTurn(playerConfigs[0].color)` to begin normal play.
  Depends on T005.
- [x] T009 [P] [US1] In `src/components/menu/GameOver.tsx`, add a "Capital
  mode" checkbox to the new-game form, mirroring the existing
  `blizzardsField`/`fogField` checkbox pattern (ref, `HandleStartParams`
  field, JSX row).
- [x] T010 [US1] In `src/App.tsx`, add `capitalMode: boolean` to
  `HandleStartParams` usage and thread it from `handleStart` into
  `GameLogic.initState(...)`'s new `capitalModeEnabled` parameter (T003).
  Depends on T009, T003.
- [x] T011 [P] [US1] In `src/components/Game.tsx`'s `handleClickTerritory`,
  add a `gameState.currentPhase === 'capitalDeploy'` branch that calls
  `gameController.chooseCapital(territory)` and updates game state,
  mirroring the existing `'deploy'` branch's shape. Depends on T008.
- [x] T012 [P] [US1] In `src/components/actionMenu/ActionMenu.tsx` (+
  `ActionMenu.module.scss`), show a "Choose your capital" prompt/indicator
  when `gameState.currentPhase === 'capitalDeploy'`, naming the current
  player, consistent with the existing `PhaseIndicator`/avatar area (no
  interactive control needed beyond the existing map-click selection —
  this is a status prompt, not a new picker). Depends on T008.
- [x] T013 [US1] Manual validation: follow
  `specs/012-capital-mode/quickstart.md` steps 1 and 2 in the browser
  (`pnpm run dev`) — placement in turn order with +2 troops applied
  immediately (SC-001, SC-002), and correct turn order at both the 2-player
  and 6-player extremes.

**Checkpoint**: User Story 1 is fully functional and independently
testable — a capital-mode game can be played from placement into normal
turns.

---

## Phase 4: User Story 2 - Capitals feed into reinforcement (Priority: P2)

**Goal**: A player who owns one or more capitals (their own or captured)
has that reflected in their start-of-turn reinforcement.

**Independent Test**: With capital mode active, capture an opponent's
capital territory and confirm the capturing player's next-turn
reinforcement calculation reflects an additional capital owned.

### Tests for User Story 2

- [x] T014 [P] [US2] In `src/controllers/GameController.test.ts`, add a
  case to the existing reinforcement `describe` block: a player owning N
  capitals (via `capitals` + current `TroopState` ownership) receives
  `calculateReinforcement`'s capital bonus at `startPlayerTurn()`; a
  non-capital-mode game never passes a nonzero count. Depends on T006.

### Implementation for User Story 2

- [x] T015 [US2] In `src/controllers/GameController.ts`'s
  `startPlayerTurn()`, change `this.calculateReinforcement(player)` to
  `this.calculateReinforcement(player, this.gameState.capitalMode ?
  this.mapController.getPlayerCapitalCount(player) : 0)`. Depends on T004.
- [x] T016 [US2] Manual validation: follow
  `specs/012-capital-mode/quickstart.md` step 3 — capture an opponent's
  capital and confirm the next reinforcement total increases accordingly
  (SC-003).

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Capitals defend more strongly (Priority: P2)

**Goal**: A territory with a capital can defend with one more die than its
troop count would otherwise allow, capped by what the troop count actually
supports.

**Independent Test**: Attack a capital territory with enough defending
troops to normally allow 2 dice, and confirm the defender can roll a 3rd
die; attack a capital territory with too few troops to support a 3rd die
even with the bonus, and confirm it is capped at what the troop count
allows.

### Tests for User Story 3

- [x] T017 [P] [US3] In `src/controllers/GameController.test.ts`, add
  cases to the existing `describe('attack()', ...)` block: a capital
  territory with troops that would normally cap at 2 dice can roll 3; a
  capital territory with only 1 troop is still capped at 1 die despite the
  bonus; a non-capital territory is never affected. Depends on T006.

### Implementation for User Story 3

- [x] T018 [US3] In `src/controllers/GameController.ts`'s `attack()`,
  change the hardcoded `maxDefender: 2` (passed to `attackRng()`) to
  `maxDefender: this.mapController.isTerritoryCapital(defendingTerritory)
  ? 3 : 2`. Depends on T004.
- [x] T019 [US3] Manual validation: follow
  `specs/012-capital-mode/quickstart.md` step 4 — capital territories
  defend with an extra die when troop count supports it, capped correctly
  when it doesn't, and non-capital territories are unaffected (SC-004).

**Checkpoint**: User Stories 1, 2, AND 3 all work independently.

---

## Phase 6: User Story 4 - Owning every capital is exposed as a fact (Priority: P2)

**Goal**: At any point in a capital-mode game, "does this player own every
capital" is a correctly computable fact.

**Independent Test**: Arrange a capital-mode game so one player captures
every other player's capital, and confirm that fact is correctly
determinable as true at that moment (and false at every prior moment).

### Tests for User Story 4

- [x] T020 [P] [US4] In `src/controllers/GameController.test.ts`, add a
  `describe('ownsAllCapitals()', ...)` block: `false` before any capital
  changes hands beyond starting placement (each player only owns their
  own); `true` only once a single player owns every capital territory;
  `false` for an "owns all but one" case. Depends on T006.

### Implementation for User Story 4

- [x] T021 [US4] In `src/controllers/GameController.ts`, add
  `ownsAllCapitals(player: string): boolean`: `capitalMode &&
  Object.keys(gameState.capitals).length > 0 &&
  Object.keys(gameState.capitals).every(t =>
  mapController.getTerritoryOwner(t) === player)`. Pure query, no side
  effects, not called from anywhere yet (exposed for feature 013 to
  consume later). Depends on T002.
- [x] T022 [US4] Run T020's tests and confirm they pass against T021's
  implementation.

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T023 Manual validation: follow
  `specs/012-capital-mode/quickstart.md` step 5 — start a game with
  capital mode off and confirm no placement step, no capital UI, and
  identical behavior to today (SC-006).
- [x] T024 Manual validation: follow
  `specs/012-capital-mode/quickstart.md` step 6 — reduce a player to only
  their capital territory remaining and confirm nothing capital-specific
  changes about how that last-territory state is handled.
- [x] T025 Manual validation: follow
  `specs/012-capital-mode/quickstart.md` step 7 — resize to the ≤640px
  mobile breakpoint and repeat the placement flow from User Story 1,
  confirming it's usable and nothing overlaps, per constitution Principle
  IV.
- [x] T026 Manual validation: follow
  `specs/012-capital-mode/quickstart.md` step 8 — confirm deploy/attack/
  fortify phases and their existing controls are unaffected once placement
  has completed (regression check).
- [x] T027 Run `pnpm run lint && pnpm run test && pnpm run build` from the
  repo root and fix any failures, per the constitution's CI-gate
  principle.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1. BLOCKS all user
  stories — every story reads/writes `capitals`/`capitalMode` or the
  `'capitalDeploy'` phase introduced here.
- **User Stories (Phase 3–6)**: All depend on Phase 2. US2, US3, and US4
  additionally depend on capitals actually being assignable, which only
  User Story 1's `chooseCapital()` (T008) provides — so while US2/US3/US4
  are each independently *testable* (their unit tests construct capital
  state directly without going through placement), a real end-to-end demo
  of any of them requires US1 to exist first.
- **Polish (Phase 7)**: Depends on Phases 3–6 being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2. No dependency on other
  stories.
- **User Story 2 (P2)**: Can start after Phase 2 (unit tests can construct
  capital state directly); a live demo needs US1's placement to exist.
- **User Story 3 (P2)**: Same as US2 — independently testable via T017's
  unit tests, live demo needs US1.
- **User Story 4 (P2)**: Same shape — independently testable via T020,
  live demo needs US1.

### Within Each User Story

- Tests before implementation (written first per the constitution's test
  coverage requirement for controller logic).
- Implementation before manual validation.
- Each story's checkpoint leaves the feature in a fully working, demoable
  state.

### Parallel Opportunities

- T002 and T004 (different files: `GameState.ts` vs `MapController.ts`)
  can be done in parallel once T002 lands (T004 depends on the `capitals`
  field existing).
- T009 (`GameOver.tsx`) can proceed in parallel with T008
  (`GameController.ts`) — different files, no dependency between them.
- T011 and T012 (different files: `Game.tsx` vs `ActionMenu.tsx`) can run
  in parallel once T008 lands.
- T014, T017, T020 (all in `GameController.test.ts` but independent
  `describe` blocks for different stories) can be drafted in parallel,
  though they land in the same file so should be merged carefully rather
  than committed as literal simultaneous edits.

---

## Parallel Example: User Story 1

```bash
# Launch these two together (different files, no dependency between them):
Task: "Add chooseCapital() to GameController.ts"
Task: "Add 'Capital mode' checkbox to GameOver.tsx"

# Then, once chooseCapital() (T008) lands, launch these two together:
Task: "Add capitalDeploy click handling in Game.tsx"
Task: "Add capital-placement prompt in ActionMenu.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (state shape + placement phase entry).
3. Complete Phase 3: User Story 1 (placement mechanic + mode toggle).
4. **STOP and VALIDATE**: Run T013's manual checks, confirm SC-001/SC-002
   hold.
5. A capital-mode game can now be played from placement through normal
   turns (with no reinforcement bonus, no extra die, and no win-fact yet)
   — demoable on its own.

### Incremental Delivery

1. Setup + Foundational → capital-mode games can be created and enter
   placement.
2. Add User Story 1 → placement + mode toggle → validate → demo (MVP!).
3. Add User Story 2 → reinforcement bonus → validate → demo.
4. Add User Story 3 → extra defending die → validate → demo.
5. Add User Story 4 → owns-all-capitals fact (invisible until 013 consumes
   it, but independently unit-testable) → validate → demo.
6. Polish → non-capital-mode regression, mobile breakpoint, full CI gate.

---

## Notes

- This feature has no external interface — no `contracts/` tasks.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before
  continuing.
- User Story 4's `ownsAllCapitals()` has no consumer yet — feature 013
  (Win Conditions & Elimination) is the intended caller, planned
  separately.
