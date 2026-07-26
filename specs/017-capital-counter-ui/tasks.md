---

description: "Task list for Capital Counter UI"
---

# Tasks: Capital Counter UI

**Input**: Design documents from `/specs/017-capital-counter-ui/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
quickstart.md. Depends on feature 012 (Capital Mode) being implemented
first — `GameState.capitalMode`, `GameState.capitals`, and
`MapController.getPlayerCapitalCount()` are read, not introduced, here.

**Tests**: Included for the new `GameState.roundsSincePlacement`
increment logic in `GameController`, per the constitution's Technology
Stack Constraints ("New logic in `controllers/` and `models/` requires
corresponding test coverage"). The display component itself is pure
props-in/JSX-out with no interaction, validated manually per the
constitution's UI rule.

**Organization**: Tasks are grouped by user story (spec.md priorities) to
enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Exact file paths are included in every task description

## Path Conventions

Single project. One `GameState` field, one `GameController` change, and a
new `src/components/capitalCounter/` component directory, per plan.md's
Structure Decision.

---

## Phase 1: Setup

**Purpose**: Confirm a clean starting point, with feature 012 already in
place

- [x] T001 Run `pnpm run lint && pnpm run test && pnpm run build` from the
  repo root and confirm all three pass, including feature 012's
  `capitalMode`/`capitals` state and `MapController.getPlayerCapitalCount()`
  already present, per the constitution's CI-gate principle.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Introduce round counting and the display component's mount
point — both user stories render through the same component and depend on
the same counter.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] In `src/models/GameState.ts`, add
  `roundsSincePlacement: number`, defaulted to `0` in the constructor.
- [x] T003 In `src/controllers/GameController.ts`'s `startNextPlayerTurn()`,
  before delegating to `startPlayerTurn(this.getNextPlayer())`: compute
  `currentPlayerIndex` (index of `gameState.currentPlayer` in
  `playerConfigs`) and resolve the upcoming player's index the same way
  `getNextPlayer()` does internally; if `gameState.capitalMode &&
  nextPlayerIndex <= currentPlayerIndex`, increment
  `gameState.roundsSincePlacement` by 1. Depends on T002.
- [x] T004 [P] In `src/controllers/GameController.test.ts`, add a
  `describe('roundsSincePlacement', ...)` block: increments exactly once
  per full cycle through `playerConfigs` when `capitalMode` is `true`,
  including correctly around an eliminated player mid-cycle; stays `0` and
  never increments when `capitalMode` is `false`. Depends on T003.
- [x] T005 [P] Create `src/components/capitalCounter/CapitalCounter.tsx`:
  reads `gameState` via `GameContext` (mirrors `PlayerStatus`'s
  `useContext(GameContext)` pattern); renders nothing when
  `!gameState.capitalMode`. No round/leader display logic yet (that's
  each user story's job) — this task only establishes the component shell
  and its mount point.
- [x] T006 [P] Create `src/components/capitalCounter/CapitalCounter.module.scss`,
  modeled on `PlayerStatus.module.scss`'s fixed-position badge styling
  (`position: fixed`, themed background/border, `@media (max-width: 640px)`
  collapse).
- [x] T007 In `src/components/Game.tsx`, mount `<CapitalCounter />`
  alongside the existing `<PlayerStatus />`. Depends on T005.

**Checkpoint**: A capital-mode game renders an (empty, for now) counter
badge; a non-capital-mode game renders nothing. Foundation ready for both
user stories.

---

## Phase 3: User Story 1 - See a round counter early in the game (Priority: P1) 🎯 MVP

**Goal**: During the first three rounds following capital placement,
players see a simple round counter ("Round: 2") instead of any
capital-related information.

**Independent Test**: Start a capital-mode game, complete the
capital-placement round, and confirm the display shows a round counter
(not any capital count) through the first three following rounds,
incrementing each round.

### Implementation for User Story 1

- [x] T008 [US1] In `src/components/capitalCounter/CapitalCounter.tsx`,
  when `gameState.capitalMode && gameState.roundsSincePlacement < 3`,
  render `` `Round: ${gameState.roundsSincePlacement + 1}` `` (displays 1,
  2, or 3). Depends on T007.
- [x] T009 [US1] Manual validation: follow
  `specs/017-capital-counter-ui/quickstart.md` step 1 in the browser
  (`pnpm run dev`) — after placement, the badge shows "Round: 1", then
  "Round: 2", then "Round: 3" as full turn cycles complete, never showing
  a capital count during these three rounds.
- [x] T010 [US1] Manual validation: follow
  `specs/017-capital-counter-ui/quickstart.md` step 2 — start a
  non-capital-mode game and confirm neither the round counter nor the
  leader count ever appears (Acceptance Scenario 3).

**Checkpoint**: User Story 1 is fully functional and independently
testable.

---

## Phase 4: User Story 2 - See the leading capital count as the game progresses (Priority: P1)

**Goal**: Starting with the fourth round following capital placement, the
round counter is replaced by a single, global, anonymized indicator
showing the highest number of capitals currently owned by any one player,
out of the total capitals in the game — never reverting back.

**Independent Test**: Progress a capital-mode game to its fourth round
following capital placement, confirm the display switches from the round
counter to a leader capital count, then capture a capital such that the
single-player maximum changes, and confirm the displayed count updates
immediately without identifying who now holds the lead.

### Implementation for User Story 2

- [x] T011 [US2] In `src/components/capitalCounter/CapitalCounter.tsx`,
  when `gameState.capitalMode && gameState.roundsSincePlacement >= 3`,
  compute `leader = Math.max(...gameState.playerConfigs.map(p =>
  mapController.getPlayerCapitalCount(p.color)))` and `total =
  gameState.playerConfigs.length`, and render `` `Leader:
  ${leader}/${total}` `` instead of the round counter. No per-player
  breakdown is ever computed or rendered (FR-005 holds structurally).
  Depends on T007.
- [x] T012 [US2] Manual validation: follow
  `specs/017-capital-counter-ui/quickstart.md` step 3 — continue past
  round 3, confirm the badge switches to "Leader: N/total" and never
  reverts to the round counter on subsequent rounds.
- [x] T013 [US2] Manual validation: follow
  `specs/017-capital-counter-ui/quickstart.md` step 4 — capture an
  opponent's capital such that the single-player maximum changes; confirm
  the displayed count updates immediately with no stale value and no
  indication of who holds the lead.
- [x] T014 [US2] Manual validation: follow
  `specs/017-capital-counter-ui/quickstart.md` step 5 — arrange two
  players tied for the highest capital count; confirm the badge just shows
  that value with no tie indicator (pre-answered Edge Case).
- [x] T015 [US2] Manual validation: follow
  `specs/017-capital-counter-ui/quickstart.md` step 6 — with a resigned
  player who still owns their capital, confirm their capitals still count
  toward the leader max exactly like an active player's (this session's
  clarification).

**Checkpoint**: Both user stories are independently functional.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T016 Manual validation: follow
  `specs/017-capital-counter-ui/quickstart.md` step 7 — resize to the
  ≤640px mobile breakpoint and confirm the badge collapses/positions
  sensibly alongside `PlayerStatus`'s mobile top-bar layout, per
  constitution Principle IV.
- [x] T017 Manual validation: follow
  `specs/017-capital-counter-ui/quickstart.md` step 8 — confirm
  `PlayerStatus`, `ActionMenu`, and the rest of the game chrome render
  unaffected by the new component's presence (regression check).
- [x] T018 Run `pnpm run lint && pnpm run test && pnpm run build` from the
  repo root and fix any failures, per the constitution's CI-gate
  principle.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1. BLOCKS both user
  stories — both read `roundsSincePlacement` and render through the same
  `CapitalCounter` mount point introduced here.
- **User Stories (Phase 3–4)**: Both depend on Phase 2. They are mutually
  exclusive render branches of the same component, so in practice they're
  implemented together, but each has its own independent test.
- **Polish (Phase 5)**: Depends on Phases 3–4 being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2. No dependency on User
  Story 2.
- **User Story 2 (P1)**: Can start after Phase 2. Independent of User
  Story 1's branch (different `roundsSincePlacement` range), though both
  land in the same file (`CapitalCounter.tsx`) so should be merged
  carefully rather than committed as literal simultaneous edits.

### Within Each User Story

- Implementation before manual validation.
- Each story's checkpoint leaves the feature in a fully working, demoable
  state.

### Parallel Opportunities

- T002 (`GameState.ts`), T005 (`CapitalCounter.tsx` shell), and T006
  (`CapitalCounter.module.scss`) can all be done in parallel — different
  files, no dependency between them.
- T004 (test) can be drafted in parallel with T005/T006 once T003 lands.

---

## Parallel Example: Foundational Phase

```bash
# Launch these three together (different files, no dependency between them):
Task: "Add roundsSincePlacement field to GameState.ts"
Task: "Create CapitalCounter.tsx component shell"
Task: "Create CapitalCounter.module.scss"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (round counter + component mount).
3. Complete Phase 3: User Story 1 (round counter display).
4. **STOP and VALIDATE**: Run T009/T010's manual checks, confirm SC-001
   holds.
5. Players see a round counter for the first 3 rounds of a capital-mode
   game — demoable on its own, even without the leader count yet.

### Incremental Delivery

1. Setup + Foundational → round counting works, badge mounts (empty).
2. Add User Story 1 → round counter display → validate → demo (MVP!).
3. Add User Story 2 → leader count display + permanent switchover →
   validate → demo.
4. Polish → mobile breakpoint check, regression check, full CI gate.

---

## Notes

- This feature has no external interface — no `contracts/` tasks.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before
  continuing.
- Requires feature 012 (Capital Mode) implemented first — do not start
  Phase 1 until `GameState.capitalMode`/`capitals` and
  `MapController.getPlayerCapitalCount()` exist.
