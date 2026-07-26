---

description: "Task list for Post-Conquest Troop Movement"
---

# Tasks: Post-Conquest Troop Movement

**Input**: Design documents from `/specs/024-post-conquest-troop-movement/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
quickstart.md. Independent of features 012/013/017 — no cross-feature
dependency.

**Tests**: Included for all new `GameController` logic (`attack()`'s
pending-state setup, `confirmPostConquestMove()`, `isSelectable()`
gating), per the constitution's Technology Stack Constraints ("New logic
in `controllers/` and `models/` requires corresponding test coverage").
The new UI control is validated manually per the constitution's UI rule.

**Organization**: Tasks are grouped by user story (spec.md priorities) to
enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in every task description

## Path Conventions

Single project. Model (`src/models/GameState.ts`), controller
(`src/controllers/GameController.ts`), and UI
(`src/components/Game.tsx`, `src/components/actionMenu/`), per plan.md's
Structure Decision.

---

## Phase 1: Setup

**Purpose**: Confirm a clean starting point before touching `attack()`

- [x] T001 Run `pnpm run lint && pnpm run test && pnpm run build` from the
  repo root and confirm all three pass with no pre-existing failures in
  `src/controllers/GameController.ts` / `src/components/actionMenu/`, per
  the constitution's CI-gate principle.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Introduce the transient pending-choice state every user
story reads or writes.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 In `src/models/GameState.ts`, add
  `pendingPostConquestMove: { sourceTerritory: string, conqueredTerritory:
  string, minTroopsToMove: number } | null`, defaulted to `null` in the
  constructor.

**Checkpoint**: The state shape exists but nothing populates or reads it
yet — foundation ready for User Story 1.

---

## Phase 3: User Story 1 - Choose how many troops occupy a newly conquered territory (Priority: P1) 🎯 MVP

**Goal**: Immediately after a successful conquest, the attacking player
chooses how many troops move into the newly conquered territory, rather
than the game moving everyone over automatically.

**Independent Test**: Conquer a territory with several surviving attacking
troops, and confirm the player is offered a choice of how many to move in
before the game proceeds, rather than all of them moving automatically.

### Tests for User Story 1

- [x] T003 [P] [US1] In `src/controllers/GameController.test.ts`, extend
  the existing `describe('attack()', ...)` block: a conquest where
  survivors exceed the winning roll's dice count sets
  `pendingPostConquestMove` with the correct `minTroopsToMove` and
  territory names, while still applying the default (max) transfer
  exactly as before the feature existed. Depends on T002.
- [x] T004 [P] [US1] In `src/controllers/GameController.test.ts`, add a
  `describe('confirmPostConquestMove()', ...)` block: a value within
  bounds moves exactly that many troops into the conquered territory and
  leaves the correct remainder in the source; calling it with no pending
  state is a no-op with no state change. Depends on T002.
- [x] T005 [P] [US1] In `src/controllers/GameController.test.ts`, extend
  the existing `describe` block for `isSelectable()`: returns `false` for
  every territory, regardless of phase or ownership, while
  `pendingPostConquestMove` is set. Depends on T002.

### Implementation for User Story 1

- [x] T006 [US1] In `src/controllers/GameController.ts`'s `attack()`
  conquest branch, after the existing unconditional default-transfer
  lines (`attackingTroopState!.count -= attackingTroops;
  defendingTroopState!.count = attackingTroops - result.attackerLosses;`,
  left unchanged): compute `min = result.attackerDice.length` and `max =
  attackingTroopState!.count + defendingTroopState!.count - 1`; if `min <
  max`, set `this.gameState.pendingPostConquestMove = { sourceTerritory:
  attackingTerritory, conqueredTerritory: defendingTerritory,
  minTroopsToMove: min }`. Depends on T002.
- [x] T007 [US1] In `src/controllers/GameController.ts`, add
  `confirmPostConquestMove(troopsToMove: number): GameController`: no-op
  with a console warning if `pendingPostConquestMove` is `null`, or if
  `troopsToMove` is outside `[minTroopsToMove,
  getTroopCount(sourceTerritory) + getTroopCount(conqueredTerritory) - 1]`.
  Otherwise sets the conquered territory's `TroopState.count` to
  `troopsToMove`, adjusts the source territory's `TroopState.count` by the
  opposite delta, and clears `pendingPostConquestMove`. Depends on T002.
- [x] T008 [US1] In `src/controllers/GameController.ts`'s
  `isSelectable()`, add an early check at the top: `if
  (this.gameState.pendingPostConquestMove) return false`. Depends on T002.
- [x] T009 [P] [US1] In `src/components/actionMenu/PhaseEndButton.tsx`,
  add an early check before the existing phase-specific branches,
  modeled on the existing forced-trade-in disabled branch: `if
  (gameState.pendingPostConquestMove) return <button
  disabled>Choose troops to move</button>`.
- [x] T010 [US1] In `src/components/actionMenu/ActionMenu.tsx` (+
  `ActionMenu.module.scss`), add a `PostConquestSelectorRow`, modeled
  directly on the existing `FortifySelectorRow` (stepper +/- pair, a
  range `<input>` using the existing `sliderTrackFill` helper, a live
  count display, and a Confirm button), shown when
  `gameState.pendingPostConquestMove` is set. Its minimum is
  `pendingPostConquestMove.minTroopsToMove` and its maximum is computed
  live via the same formula as T006/T007
  (`getTroopCount(sourceTerritory) + getTroopCount(conqueredTerritory) -
  1`) rather than stored. Depends on T006.
- [x] T011 [US1] In `src/components/Game.tsx`, wire the new control's
  Confirm action to call
  `gameController.confirmPostConquestMove(postConquestTroopCount)` and
  update game state, and thread the live troop-count value down to
  `ActionMenu` (component-local state for the in-progress slider value
  before Confirm, mirroring `fortifyTroopCount`'s pattern). Depends on
  T010.
- [x] T012 [US1] Manual validation: follow
  `specs/024-post-conquest-troop-movement/quickstart.md` step 1 in the
  browser (`pnpm run dev`) — a conquest where survivors exceed the winning
  roll's dice count shows the control; adjusting and confirming a value
  between the bounds moves exactly that many troops in with the remainder
  staying in the source (SC-001, SC-002).

**Checkpoint**: User Story 1 is fully functional and independently
testable — the player is offered a real choice after a qualifying
conquest.

---

## Phase 4: User Story 2 - The choice is bounded correctly (Priority: P1)

**Goal**: The offered range's minimum matches the winning roll's dice
count and its maximum leaves exactly 1 troop behind in the source; values
outside that range are never accepted.

**Independent Test**: Conquer a territory using a specific dice count in
the winning roll, and confirm the offered range's minimum matches that
dice count and its maximum leaves exactly 1 troop behind in the source;
attempt to select a value outside that range and confirm it is not
accepted.

### Tests for User Story 2

- [x] T013 [P] [US2] In `src/controllers/GameController.test.ts`, add
  explicit bounds-correctness cases (distinct from T003/T004's happier-path
  coverage): the minimum offered always exactly equals
  `result.attackerDice.length` for a range of different winning-roll dice
  counts (1, 2, and 3 dice); the maximum offered always exactly equals
  troops remaining in the source immediately after combat, minus 1, for a
  range of different survivor counts; `confirmPostConquestMove()` rejects
  values one below the minimum and one above the maximum, each leaving
  troop counts completely unchanged. Depends on T006, T007.

### Implementation for User Story 2

- [x] T014 [US2] Manual validation: follow
  `specs/024-post-conquest-troop-movement/quickstart.md` steps 3 and 4 —
  the range `<input>`'s `min`/`max` attributes prevent selecting outside
  the offered bounds via the UI itself (SC-003); separately, confirm a
  conquest where the winning roll's dice count exactly equals the maximum
  shows no control at all and proceeds immediately with that single valid
  value already applied (this session's clarification — no code expected
  here beyond T006's `min < max` guard, this task verifies it holds).

**Checkpoint**: User Stories 1 AND 2 both work independently — the choice
exists (US1) and is correctly bounded, with no way to select outside the
valid range (US2).

---

## Phase 5: User Story 3 - Moving the maximum happens by default (Priority: P2)

**Goal**: If the player takes no action to change the offered amount, the
maximum allowed number of troops moves in automatically.

**Independent Test**: Conquer a territory and, without adjusting the
offered troop count, confirm the game proceeds with the maximum amount
moved in, matching today's existing automatic behavior.

### Implementation for User Story 3

- [x] T015 [US3] Manual validation: follow
  `specs/024-post-conquest-troop-movement/quickstart.md` step 2 — conquer
  a territory and, without touching the new control, confirm play only
  continues once Confirm is clicked at its default (max) value, and the
  outcome matches today's pre-feature automatic behavior exactly (SC-004).
  No new code expected here: `attack()`'s existing unconditional default
  assignment (untouched by T006) already produces this — this task exists
  to explicitly verify that composition holds, the same way 009's User
  Story 3 verified an already-existing composition.

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T016 Manual validation: follow
  `specs/024-post-conquest-troop-movement/quickstart.md` step 6 — later
  in the same turn, use the fortify-phase move as normal; confirm it
  behaves identically regardless of how the earlier post-conquest choice
  was resolved (FR-008).
- [x] T017 Manual validation: follow
  `specs/024-post-conquest-troop-movement/quickstart.md` step 7 — resize
  to the ≤640px mobile breakpoint and repeat the golden-path conquest
  choice from User Story 1; confirm the new control is usable and nothing
  overlaps/hides other UI, per constitution Principle IV.
- [x] T018 Manual validation: follow
  `specs/024-post-conquest-troop-movement/quickstart.md` step 8 — confirm
  the attack-phase dice selector and fortify-phase slider both continue to
  work unaffected (regression check).
- [x] T019 Run `pnpm run lint && pnpm run test && pnpm run build` from the
  repo root and fix any failures, per the constitution's CI-gate
  principle.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1. BLOCKS all user
  stories — T006–T011 all read/write `pendingPostConquestMove`.
- **User Stories (Phase 3–5)**: All depend on Phase 2.
- **Polish (Phase 6)**: Depends on Phases 3–5 being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2. No dependency on other
  stories — this is where the actual mechanic is built.
- **User Story 2 (P1)**: Depends on User Story 1's implementation
  (T006/T007) existing — it adds bounds-focused test coverage and
  verification over the same code, the same relationship 009's US1/US2
  had.
- **User Story 3 (P2)**: Depends on User Story 1 (T006) — pure
  verification, no new code.

### Within Each User Story

- Tests before implementation (written first per the constitution's test
  coverage requirement for controller logic).
- Implementation before manual validation.
- Each story's checkpoint leaves the feature in a fully working, demoable
  state.

### Parallel Opportunities

- T003, T004, T005 (all in `GameController.test.ts` but independent
  `describe` blocks) can be drafted in parallel, then merged carefully
  into the same file.
- T009 (`PhaseEndButton.tsx`) can proceed in parallel with T006/T007
  (`GameController.ts`) — different files, no dependency between them.

---

## Parallel Example: User Story 1

```bash
# Launch these three together (independent test blocks, same file):
Task: "Add attack() pending-state test cases to GameController.test.ts"
Task: "Add confirmPostConquestMove() test cases to GameController.test.ts"
Task: "Add isSelectable() gating test cases to GameController.test.ts"

# Then, once T006/T007 land, these two together:
Task: "Add early disabled check to PhaseEndButton.tsx"
Task: "Add PostConquestSelectorRow to ActionMenu.tsx + styles"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (pending-state field).
3. Complete Phase 3: User Story 1 (the mechanic, end to end).
4. **STOP and VALIDATE**: Run T012's manual checks, confirm SC-001/SC-002
   hold.
5. Players can now choose how many troops move into a newly conquered
   territory — demoable on its own.

### Incremental Delivery

1. Setup + Foundational → pending-state field exists.
2. Add User Story 1 → the choice mechanic, end to end → validate → demo
   (MVP!).
3. Add User Story 2 → bounds-correctness verification → validate → demo.
4. Add User Story 3 → default-to-max verification → validate → demo.
5. Polish → fortify independence, mobile breakpoint, regression check,
   full CI gate.

---

## Notes

- This feature has no external interface — no `contracts/` tasks.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before
  continuing.
- Independent of features 012/013/017 — can be implemented in any order
  relative to them.
