---

description: "Task list for Fortify Troop-Count Selection"
---

# Tasks: Fortify Troop-Count Selection

**Input**: Design documents from `/specs/009-fortify-troop-selection/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
quickstart.md

**Tests**: Not included as automated test tasks — per plan.md/research.md,
`GameController.fortify()` (the only controller-layer code involved) needs
no changes and is already correct for arbitrary troop counts. This is a
UI-only interaction change; per the constitution, UI-only changes are
validated via manual browser testing (see quickstart.md), not new unit
tests. Manual-validation tasks below reference the exact quickstart.md
steps they satisfy.

**Organization**: Tasks are grouped by user story (spec.md priorities) to
enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in every task description

## Path Conventions

Single project. All work lands in `src/components/Game.tsx` and
`src/components/actionMenu/` — no controller/model changes, per plan.md's
Structure Decision.

---

## Phase 1: Setup

**Purpose**: Confirm a clean starting point before touching the fortify
interaction

- [ ] T001 Run `pnpm run lint && pnpm run test && pnpm run build` from the
  repo root and confirm all three pass with no pre-existing failures in
  `src/components/Game.tsx` / `src/components/actionMenu/ActionMenu.tsx`,
  per the constitution's CI-gate principle.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Turn destination-selection into a distinct, non-executing step
(instead of the current immediate `fortify(1, ...)` on click), so a
troop-count/Confirm step can be layered on top. This is the shared
prerequisite for all three user stories below.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 In `src/components/Game.tsx`, add two new state hooks inside the
  `Game` component: `const [fortifyDestination, setFortifyDestination] =
  useState<string | undefined>(undefined)` and `const [fortifyTroopCount,
  setFortifyTroopCount] = useState<number>(1)`.
- [ ] T003 In `src/components/Game.tsx`, rewrite the `fortify` branch of
  `handleClickTerritory` (currently `gameController.fortify(1,
  selectedTerritory, territory)`, fired immediately on the second click) so
  that: clicking a valid destination while `fortifyDestination` is unset
  sets `fortifyDestination` to that territory and resets
  `fortifyTroopCount` to `1`, without calling `fortify()`; clicking the
  already-selected `fortifyDestination` again clears it (deselect,
  destination only); and the existing top-of-handler re-click-to-deselect
  branch for `selectedTerritory` (the source) is extended to also clear
  `fortifyDestination` and reset `fortifyTroopCount` when the source is
  deselected.

**Checkpoint**: Destination selection is now a distinct, non-executing
step. The existing "End turn" button still ends the turn with no move at
any point in this flow. Foundation ready for the troop-count control.

---

## Phase 3: User Story 1 - Move a chosen number of troops during fortify (Priority: P1) 🎯 MVP

**Goal**: Let the player pick any valid troop count (1 to N−1) for a
fortify move and execute it via an explicit Confirm action.

**Independent Test**: Select a source territory with several troops and a
valid destination, choose a troop count greater than 1, confirm the move,
and verify the source and destination troop counts changed by exactly that
amount.

### Implementation for User Story 1

- [ ] T004 [P] [US1] In `src/components/actionMenu/ActionMenu.tsx`, add new
  optional props (`fortifyTroopCount?: number`, `maxFortifyTroops?:
  number`, `onFortifyTroopCountChange?: (count: number) => void`,
  `onConfirmFortify?: () => void`) and render a troop-count control (a
  numeric stepper or range input bounded to `[1, maxFortifyTroops]` — not
  the fixed 1/2/3 `DiceSelector` button-row pattern, since fortify counts
  can exceed 3) plus a "Confirm" button, shown only when
  `gameState.currentPhase === 'fortify'` and all four fortify props are
  defined and `maxFortifyTroops > 0`.
- [ ] T005 [P] [US1] In `src/components/actionMenu/ActionMenu.module.scss`,
  add styles for the new fortify troop-count control and Confirm button,
  consistent with the existing `.DiceSelector`/`.DiceSelectorBtn` styling
  conventions.
- [ ] T006 [US1] In `src/components/Game.tsx`, compute `maxFortifyTroops`
  as `gameController.getTroopCount(selectedTerritory) - 1` whenever
  `selectedTerritory` and `fortifyDestination` are both set (else `0`),
  pass it plus `fortifyTroopCount`/`onFortifyTroopCountChange` down to
  `ActionMenu`, and wire `onConfirmFortify` to call
  `setGameState(gameController.fortify(fortifyTroopCount, selectedTerritory,
  fortifyDestination).gameState)`, then clear `selectedTerritory` and
  `fortifyDestination` and reset `fortifyTroopCount` to `1`. Depends on
  T004.
- [ ] T007 [US1] Manual validation: follow
  `specs/009-fortify-troop-selection/quickstart.md` steps 1, 3, 4, and 5 in
  the browser (`pnpm run dev`) — a multi-troop move transfers the exact
  chosen amount (SC-001, SC-002); re-clicking a selected source or
  destination deselects it without counting as a move, and clicking "End
  turn" instead of Confirm abandons a partial selection (clarified
  interaction, FR-005, FR-008); a 2-troop source only offers `1` (FR-003);
  large troop counts up to `N-1` are selectable (Assumptions, no upper
  bound).

**Checkpoint**: User Story 1 is fully functional and independently
testable — a player can choose and confirm an arbitrary valid troop count.

---

## Phase 4: User Story 2 - Skip fortifying entirely (Priority: P2)

**Goal**: A player who doesn't want to move any troops can end the fortify
phase without making a move, at any point — including mid-selection.

**Independent Test**: Enter the fortify phase, make no territory
selections, and end the phase manually; confirm no troop counts changed
anywhere on the board.

### Implementation for User Story 2

- [ ] T008 [US2] In `src/components/Game.tsx`, ensure `handleEndPhase` also
  resets `fortifyDestination` (to `undefined`) and `fortifyTroopCount`
  (to `1`) in addition to its existing `startNextPhase()` call, so no
  stale fortify-selection state leaks into a later fortify phase (FR-005).
- [ ] T009 [US2] Manual validation: follow
  `specs/009-fortify-troop-selection/quickstart.md` step 2 — enter the
  fortify phase, make no selections, click "End turn"; confirm no troop
  counts changed anywhere and the turn advances (SC-004, User Story 2
  Acceptance Scenario 1).

**Checkpoint**: User Stories 1 AND 2 both work independently — skipping
fortify remains fully functional alongside the new troop-count flow.

---

## Phase 5: User Story 3 - The phase ends automatically right after a move (Priority: P2)

**Goal**: Confirming a fortify move immediately ends the phase and turn,
with no separate manual step, and no second move is possible that turn.

**Independent Test**: Complete a valid fortify move and confirm the turn
passes to the next player immediately, without needing to press a separate
"end phase" action afterward.

### Implementation for User Story 3

- [ ] T010 [US3] Manual validation: follow
  `specs/009-fortify-troop-selection/quickstart.md` step 6 — after
  Confirm, verify the turn passes to the next player immediately with no
  separate manual step, and that no further fortify move is possible that
  turn (SC-003, Acceptance Scenarios 1–2). No new code is expected here:
  `GameController.fortify()` already calls `startNextPlayerTurn()`
  unconditionally, and T006 already wires Confirm directly to `fortify()`
  — this task exists to explicitly verify that composition holds.

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T011 Manual validation: follow
  `specs/009-fortify-troop-selection/quickstart.md` step 7 — resize to the
  ≤640px mobile breakpoint and repeat the golden-path fortify move from
  User Story 1; confirm the new control is usable and nothing
  overlaps/hides other UI, per constitution Principle IV.
- [ ] T012 Manual validation: follow
  `specs/009-fortify-troop-selection/quickstart.md` step 8 — confirm the
  attack-phase dice selector still works unaffected and the deploy phase is
  untouched (regression check).
- [ ] T013 Run `pnpm run lint && pnpm run test && pnpm run build` from the
  repo root and fix any failures, per the constitution's CI-gate principle.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1. BLOCKS all user stories —
  T004/T006/T008 all build on the `fortifyDestination`/`fortifyTroopCount`
  state and click-handling introduced here.
- **User Stories (Phase 3–5)**: All depend on Phase 2.
- **Polish (Phase 6)**: Depends on Phases 3–5 being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2. No dependency on other
  stories.
- **User Story 2 (P2)**: Can start after Phase 2. Independent of US1's new
  control — only touches the reset behavior of the existing End Phase path
  — but is naturally verified after US1 exists since that's what
  introduces the state being reset.
- **User Story 3 (P2)**: Can start after Phase 2, but its only task (T010)
  is a verification of behavior that falls out of T006 (US1), so in
  practice it is validated after US1 is implemented.

### Within Each User Story

- Implementation before manual validation.
- Each story's checkpoint leaves the feature in a fully working, demoable
  state.

### Parallel Opportunities

- T004 and T005 (different files: `ActionMenu.tsx` vs
  `ActionMenu.module.scss`) can be done in parallel.
- All Setup tasks marked [P] can run in parallel (only one exists here).
- User Stories 2 and 3 have no code dependency on each other and could be
  staffed in parallel once Phase 2 and T006 (US1) land, since both are
  effectively verification/reset tasks over the same shared state.

---

## Parallel Example: User Story 1

```bash
# Launch these two together (different files, no dependency between them):
Task: "Add fortify troop-count control + Confirm button props to ActionMenu.tsx"
Task: "Add styles for the fortify troop-count control in ActionMenu.module.scss"

# Then, once both land:
Task: "Wire Game.tsx's maxFortifyTroops/onConfirmFortify to the new ActionMenu props"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (destination selection becomes
   non-executing).
3. Complete Phase 3: User Story 1 (troop-count control + Confirm).
4. **STOP and VALIDATE**: Run T007's manual checks, confirm SC-001/SC-002
   hold.
5. A player can now choose and confirm an arbitrary fortify troop count —
   demoable on its own.

### Incremental Delivery

1. Setup + Foundational → destination selection no longer auto-executes.
2. Add User Story 1 → troop-count selection + Confirm → validate → demo.
3. Add User Story 2 → confirm skip-fortify still works cleanly with the new
   state → validate → demo.
4. Add User Story 3 → confirm auto-end-after-move still holds → validate →
   demo.
5. Polish → mobile breakpoint check, regression check, full CI gate.

---

## Notes

- This feature has no controller/model changes — `GameController.fortify()`
  is already correct. All tasks are UI/component work.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before
  continuing.
