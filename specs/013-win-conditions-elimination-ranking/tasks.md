---

description: "Task list for Win Conditions, Elimination, Resignation & Ranking"
---

# Tasks: Win Conditions, Elimination, Resignation & Ranking

**Input**: Design documents from `/specs/013-win-conditions-elimination-ranking/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
quickstart.md. Depends on feature 012 (Capital Mode) being implemented
first — `GameState.capitalMode` and `GameController.ownsAllCapitals()`
are read, not introduced, here.

**Tests**: Included for all new `GameController` logic, per the
constitution's Technology Stack Constraints ("New logic in `controllers/`
and `models/` requires corresponding test coverage"). Wiring the
already-built `ResultsModal` into `App.tsx` is validated manually per the
constitution's UI rule.

**Organization**: Tasks are grouped by user story (spec.md priorities) to
enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths are included in every task description

## Path Conventions

Single project. Model (`src/models/GameState.ts`), controller
(`src/controllers/GameController.ts`), and UI wiring
(`src/App.tsx`, `src/components/Game.tsx`), reusing the existing,
previously-orphaned `src/components/menu/ResultsModal.tsx` and
`src/models/ResultsData.ts`, per plan.md's Structure Decision.

---

## Phase 1: Setup

**Purpose**: Confirm a clean starting point, with feature 012 already in
place

- [x] T001 Run `pnpm run lint && pnpm run test && pnpm run build` from the
  repo root and confirm all three pass, including feature 012's
  `capitalMode`/`ownsAllCapitals()` already present, per the
  constitution's CI-gate principle.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Introduce resignation/knockout/turn-count state and the
turn-cycling change every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] In `src/models/GameState.ts`, add `resignedPlayers:
  string[]` (default `[]`), `knockoutOrder: Record<string, {
  playersRemaining: number, turnAtKnockout: number }>` (default `{}`), and
  `turnCount: number` (default `0`).
- [x] T003 In `src/controllers/GameController.ts`, add `isResigned(player:
  string): boolean` returning `gameState.resignedPlayers.includes(player)`.
  Depends on T002.
- [x] T004 In `src/controllers/GameController.ts`'s `getNextPlayer()`, add
  `|| this.isResigned(this.gameState.playerConfigs[nextPlayerIndex].color)`
  to the existing `while` condition (alongside `hasPlayerLost`), so
  resigned players are never handed a turn. Depends on T003.
- [x] T005 In `src/controllers/GameController.ts`'s `startPlayerTurn()`,
  increment `gameState.turnCount` by 1. Depends on T002.
- [x] T006 [P] In `src/controllers/GameController.ts`, add
  `recordKnockoutIfNeeded(player: string): void` (private): if `player` is
  not already a key in `gameState.knockoutOrder`, sets
  `gameState.knockoutOrder[player] = { playersRemaining:
  gameState.playerConfigs.length - Object.keys(gameState.knockoutOrder).length,
  turnAtKnockout: gameState.turnCount }`. Depends on T002.
- [x] T007 [P] In `src/controllers/GameController.test.ts`, add a
  `describe('resignation — foundational', ...)` block covering:
  `isResigned()` reflects `resignedPlayers` membership;
  `getNextPlayer()` skips a resigned player exactly like an eliminated
  one, including when both a resigned and an eliminated player are
  present; `startPlayerTurn()` increments `turnCount` by exactly 1 per
  call; `recordKnockoutIfNeeded()` writes once and never overwrites a
  second call for the same player. Depends on T004, T005, T006.

**Checkpoint**: Resignation/knockout/turn-count state exists and turn
cycling correctly skips resigned players — no way yet to actually resign,
end the game, or see results. Foundation ready for User Story 1.

---

## Phase 3: User Story 1 - The game actually ends when someone wins (Priority: P1) 🎯 MVP

**Goal**: When a player meets the active win condition, the game
immediately ends.

**Independent Test**: Play a game down to one player controlling every
non-frozen, non-resigned territory (conquest mode) and confirm the game
ends at that exact moment; separately, in a capital-mode game, capture
every capital and confirm the game ends at that exact moment even if
non-capital territories remain split among other players.

### Tests for User Story 1

- [x] T008 [P] [US1] In `src/controllers/GameController.test.ts`, add a
  `describe('checkWinCondition()', ...)` block: a conquest-mode capture
  leaving one player owning every non-frozen, non-resigned territory sets
  `gameOver = true` immediately; a game with territory still split does
  not; a capital-mode capture leaving one player owning every capital
  ends the game regardless of non-capital territory split; a game that
  has already ended (`gameOver` already `true`) is unaffected by further
  calls. Depends on T002.

### Implementation for User Story 1

- [x] T009 [US1] In `src/controllers/GameController.ts`, add
  `findConquestWinner(): string | undefined` (private):
  `eligible = Object.keys(gameState.mapConfig.territories).filter(t =>
  !mapController.isTerritoryBlizzard(t) &&
  !isResigned(mapController.getTerritoryOwner(t)))`; if `eligible.length >
  0` and every entry resolves to the same owner (via
  `getTerritoryOwner`), return that owner. Depends on T003.
- [x] T010 [US1] In `src/controllers/GameController.ts`, add
  `findCapitalWinner(): string | undefined` (private): returns the one
  `playerConfigs` entry for which `ownsAllCapitals(player)` (feature 012)
  is `true`, if any.
- [x] T011 [US1] In `src/controllers/GameController.ts`, add
  `checkWinCondition(): GameController` (private): no-op if
  `gameState.gameOver` is already `true`; otherwise sets `gameState.gameOver
  = true` if `gameState.capitalMode ? findCapitalWinner() :
  findConquestWinner()` returns a player. Depends on T009, T010.
- [x] T012 [US1] In `src/controllers/GameController.ts`'s `attack()`
  conquest branch, call `this.checkWinCondition()` immediately after the
  existing territory-transfer lines. Depends on T011.
- [x] T013 [US1] Manual validation: follow
  `specs/013-win-conditions-elimination-ranking/quickstart.md` steps 1
  and 2 in the browser (`pnpm run dev`) — a conquest-mode win ends the
  game immediately (SC-001), and a capital-mode win ends the game
  regardless of non-capital territory split.

**Checkpoint**: User Story 1 is fully functional and independently
testable — `gameOver` now actually flips `true` when a win condition is
met.

---

## Phase 4: User Story 2 - A defeated player sees their own game-over screen (Priority: P1)

**Goal**: A player who loses their last territory immediately sees a
personal result screen, distinct from the eventual full-game results
screen.

**Independent Test**: Reduce a player to zero territories and confirm
that player's view immediately shows a personal game-over/eliminated
screen, independent of whether the overall game continues for others.

### Tests for User Story 2

- [x] T014 [P] [US2] In `src/controllers/GameController.test.ts`, add a
  `describe('getStandings()', ...)` block covering the winner tier only
  for now: when `gameOver`, the winner (re-derived via
  `findConquestWinner()`/`findCapitalWinner()`) is always rank 1 with
  `turnsAlive = turnCount`. (Still-alive and defeated/resigned tiers are
  covered in User Story 5, once resignation exists to populate them
  meaningfully.) Depends on T011.

### Implementation for User Story 2

- [x] T015 [US2] In `src/controllers/GameController.ts`, add
  `getStandings(): PlayerStanding[]` (import `PlayerStanding` from
  `src/models/ResultsData.ts`): computes the three-tier ranking fresh on
  every call (winner if `gameOver`; still-alive non-winners ordered by
  `getPlayerTroopTotal` descending; defeated/resigned — present in
  `knockoutOrder` — ordered by `playersRemaining` descending, with
  `territories`/`troops` set to `null` and `turnsAlive` taken from
  `turnAtKnockout`). `rating`/`ratingDelta`/`history` are left `undefined`
  everywhere (out of scope). Depends on T006.
- [x] T016 [US2] In `src/App.tsx`, mount `<ResultsModal>` when
  `gameState.gameOver || (gameController.hasPlayerLost(viewingPlayer) &&
  !gameController.isResigned(viewingPlayer))`, passing: `winner` (the
  player found by `findConquestWinner()`/`findCapitalWinner()` re-derived
  when `gameOver`, else `null`), `standings={gameController.getStandings()}`,
  `localPlayer` (the `PlayerConfig` for `viewingPlayer`), `fogOfWar=
  {gameState.fogEnabled}`, `totalTurns={gameState.turnCount}`,
  `onPlayAgain`/`onQuit` wired to return to the existing `GameOver`
  new-game menu, and `onSpectate` dismissing the modal without ending the
  game (only meaningful pre-`gameOver`). Depends on T015.
- [x] T017 [US2] Manual validation: follow
  `specs/013-win-conditions-elimination-ranking/quickstart.md` step 3 —
  as a non-resigned player, lose your last territory mid-game and confirm
  you immediately see the personal "You were eliminated" view, distinct
  from the eventual full results screen (SC-002).

**Checkpoint**: User Stories 1 AND 2 both work independently — a defeated
player sees their own screen, and the game genuinely ends when won.

---

## Phase 5: User Story 3 - Cards transfer on defeat, unless it's the winning blow (Priority: P2)

**Goal**: A defeated player's cards transfer to their conqueror, except
when that conquest is simultaneously the game's winning move.

**Independent Test**: Defeat a player who is not the last remaining
opponent and confirm their cards transfer to the attacker; separately,
defeat the last remaining opponent (ending the game) and confirm no card
transfer occurs.

### Tests for User Story 3

- [x] T018 [P] [US3] In `src/controllers/GameController.test.ts`, extend
  the existing `describe('card transfer on elimination', ...)` block: a
  non-winning defeat still transfers the full hand (existing behavior,
  regression-check it still holds); a defeat that is simultaneously the
  winning move transfers no cards; `knockoutOrder` gains an entry for the
  defeated player in both cases. Depends on T006, T011.

### Implementation for User Story 3

- [x] T019 [US3] In `src/controllers/GameController.ts`'s `attack()`,
  inside the existing `if (this.hasPlayerLost(defendingPlayer))` branch:
  call `this.recordKnockoutIfNeeded(defendingPlayer)` first, then call
  `this.checkWinCondition()` (already called once per T012 right after
  transfer — reuse that same call, do not call it twice), and only call
  the existing `this.transferCardsOnElimination(defendingPlayer)` when
  `!this.gameState.gameOver` after that check (i.e. skip the transfer
  when this same conquest was the winning move). Depends on T012, T006.
- [x] T020 [US3] Manual validation: follow
  `specs/013-win-conditions-elimination-ranking/quickstart.md` step 4 —
  defeat a non-final opponent and confirm card transfer; defeat the final
  opponent (winning move) and confirm no transfer (SC-003).

**Checkpoint**: User Stories 1, 2, AND 3 all work independently.

---

## Phase 6: User Story 4 - A player can resign without disrupting the board (Priority: P2)

**Goal**: A player can resign at any time; their territories/troops stay
unchanged, their turn is permanently skipped, they get no reinforcement,
and they keep their cards until eventually defeated.

**Independent Test**: Have a player resign mid-game, confirm their
territories/troops are unchanged and remain on the board, confirm their
turn is skipped from that point forward, confirm they receive no further
reinforcements, and confirm they still hold their cards until another
player eventually conquers their last territory.

### Tests for User Story 4

- [x] T021 [P] [US4] In `src/controllers/GameController.test.ts`, add a
  `describe('resign()', ...)` block: territories/troops are completely
  unchanged immediately after resigning (SC-004); resigning on one's own
  turn ends that turn (`startNextPlayerTurn()` fires); resigning off-turn
  leaves the current turn untouched; `getNextPlayer()` never returns the
  resigned player afterward; no reinforcement is ever calculated for them
  (`startPlayerTurn` never invoked for them again); `knockoutOrder` gains
  an entry immediately on resignation. Depends on T006, T011.
- [x] T022 [P] [US4] In `src/controllers/GameController.test.ts`, add a
  case: the second-to-last active player resigning (no capture involved)
  still ends the game for the sole remaining player (this session's
  clarification). Depends on T011.
- [x] T023 [P] [US4] In `src/controllers/GameController.test.ts`, add a
  case: a resigned player's eventual defeat (their last territory later
  captured) still transfers their held cards to the conqueror per the
  normal defeat rule (FR-011), and does **not** create a second
  `knockoutOrder` entry (first-write-wins). Depends on T019.

### Implementation for User Story 4

- [x] T024 [US4] In `src/controllers/GameController.ts`, add
  `resign(player: string): GameController`: appends `player` to
  `gameState.resignedPlayers` (no-op if already present); calls
  `this.recordKnockoutIfNeeded(player)`; calls `this.checkWinCondition()`;
  if `player === gameState.currentPlayer`, calls
  `this.startNextPlayerTurn()`. Depends on T006, T011.
- [x] T025 [US4] In `src/components/Game.tsx`, add a resign entry point
  (a confirm-guarded button/menu item, e.g. alongside `PhaseEndButton` in
  `ActionMenu`) that calls `gameController.resign(viewingPlayer).gameState`
  and updates game state via `setGameState`. Depends on T024.
- [x] T026 [US4] Manual validation: follow
  `specs/013-win-conditions-elimination-ranking/quickstart.md` step 5 —
  resign mid-game; confirm unchanged territories/troops, permanently
  skipped turn, no reinforcement, cards kept until eventual defeat, and no
  duplicate personal "you lost" popup at that later moment (this session's
  clarification, verified via US2's gating condition from T016).
- [x] T027 [US4] Manual validation: follow
  `specs/013-win-conditions-elimination-ranking/quickstart.md` step 6 —
  with exactly two active players remaining, have one resign; confirm the
  game ends immediately for the sole remaining player with no capture
  required.

**Checkpoint**: User Stories 1–4 all work independently.

---

## Phase 7: User Story 5 - The game ends with a full ranking for everyone (Priority: P2)

**Goal**: When the game ends, every remaining connected participant sees
a results screen with the complete three-tier final ranking.

**Independent Test**: Play a game to completion with a mix of a winner, at
least one still-active non-winner, and at least one defeated/resigned
player, and confirm the final results screen shows all of them in the
correct relative order.

### Tests for User Story 5

- [x] T028 [P] [US5] In `src/controllers/GameController.test.ts`, extend
  `describe('getStandings()', ...)` (T014) with the remaining two tiers:
  still-alive non-winners ordered by troop count descending, ties broken
  by a stable secondary order; defeated/resigned players ordered by
  `playersRemaining` descending (more players remaining at knockout =
  ranks worse/lower), with a resigned-then-later-defeated player appearing
  exactly once, ranked by their resignation moment. Depends on T015, T024.

### Implementation for User Story 5

- [x] T029 [US5] Manual validation: follow
  `specs/013-win-conditions-elimination-ranking/quickstart.md` step 7 —
  play a game to completion with a mix of winner, still-alive
  non-winner(s), and defeated/resigned player(s); confirm every remaining
  connected participant sees the same, correctly-ordered final ranking
  (SC-005). No new code expected here: T015/T016 (US2) already wire
  `getStandings()` and `<ResultsModal>`'s `gameOver` branch — this task
  verifies that composition holds for the full three-tier case, the same
  way 009's User Story 3 verified an already-existing composition.

**Checkpoint**: All five user stories are independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T030 Manual validation: follow
  `specs/013-win-conditions-elimination-ranking/quickstart.md` step 8 —
  confirm normal play (deploy/attack/fortify, reinforcement, card
  trade-ins) is completely unaffected until an actual win condition or
  resignation occurs (regression check).
- [x] T031 Manual validation: confirm `ResultsModal` renders correctly at
  the ≤640px mobile breakpoint now that it's actually mounted in a live
  game, per constitution Principle IV.
- [x] T032 Run `pnpm run lint && pnpm run test && pnpm run build` from the
  repo root and fix any failures, per the constitution's CI-gate
  principle.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1. BLOCKS all user
  stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2. `checkWinCondition()`
  built here is reused by US3 (T019) and US4 (T024).
- **User Story 2 (Phase 4)**: Depends on Phase 3 (`getStandings()`'s
  winner tier needs `findConquestWinner()`/`findCapitalWinner()` from
  US1).
- **User Story 3 (Phase 5)**: Depends on Phase 3 (reuses
  `checkWinCondition()`) and Phase 2 (`recordKnockoutIfNeeded()`).
- **User Story 4 (Phase 6)**: Depends on Phase 3 (reuses
  `checkWinCondition()`) and Phase 2.
- **User Story 5 (Phase 7)**: Depends on Phase 4 (`getStandings()`
  already built) and Phase 6 (needs resignation to populate a realistic
  defeated/resigned tier) — mostly a verification/completion phase over
  already-existing wiring.
- **Polish (Phase 8)**: Depends on Phases 3–7 being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2. No dependency on other
  stories — this is the true foundation the rest build on.
- **User Story 2 (P1)**: Depends on User Story 1's win-detection existing
  (`getStandings()`'s winner tier needs it).
- **User Story 3 (P2)**: Depends on User Story 1 (`checkWinCondition()`).
- **User Story 4 (P2)**: Depends on User Story 1 (`checkWinCondition()`).
  Independent of User Story 2/3.
- **User Story 5 (P2)**: Depends on User Story 2 (`getStandings()`,
  `<ResultsModal>` wiring) and benefits from User Story 4 existing for a
  meaningful demo, though its own ranking-order tests (T028) only need
  `knockoutOrder` entries, which Foundational's `recordKnockoutIfNeeded()`
  already supports directly (not strictly blocked on US4's `resign()`
  wrapper).

### Within Each User Story

- Tests before implementation (written first per the constitution's test
  coverage requirement for controller logic).
- Implementation before manual validation.
- Each story's checkpoint leaves the feature in a fully working, demoable
  state.

### Parallel Opportunities

- T002 (`GameState.ts`) has no code dependency on anything else in Phase
  2 and can start immediately.
- T008 (US1 tests) can be drafted in parallel with T009–T011
  (implementation), though tests should fail first per the constitution's
  TDD-adjacent test-coverage expectation.
- T021, T022, T023 (all US4 tests, independent scenarios) can be drafted
  in parallel, then merged into the same `describe` block.

---

## Parallel Example: Foundational Phase

```bash
# Launch these two together (different concerns, T003/T004/T005/T006 all
# build on T002 but are otherwise independent of each other):
Task: "Add resignedPlayers/knockoutOrder/turnCount fields to GameState.ts"
# Then, once that lands, these three together:
Task: "Add isResigned() to GameController.ts"
Task: "Add turnCount increment to startPlayerTurn()"
Task: "Add recordKnockoutIfNeeded() to GameController.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (resignation/knockout/turn-count state).
3. Complete Phase 3: User Story 1 (win detection).
4. **STOP and VALIDATE**: Run T013's manual checks, confirm SC-001 holds.
5. The game now actually ends when a win condition is met (no personal
   screens, no card-transfer exception, no resignation, no ranking yet) —
   demoable on its own as the core gap-closer.

### Incremental Delivery

1. Setup + Foundational → resignation/knockout/turn-count state exists.
2. Add User Story 1 → the game actually ends → validate → demo (MVP!).
3. Add User Story 2 → personal defeat screen + `ResultsModal` wired →
   validate → demo.
4. Add User Story 3 → card-transfer winning-move exception → validate →
   demo.
5. Add User Story 4 → resignation → validate → demo.
6. Add User Story 5 → full ranking (mostly verification of already-wired
   `getStandings()`/`ResultsModal`) → validate → demo.
7. Polish → regression check, mobile breakpoint, full CI gate.

---

## Notes

- This feature has no external interface — no `contracts/` tasks.
- `ResultsModal` and `ResultsData` (`PlayerStanding`/`TurnSnapshot`) are
  pre-existing, unmodified by this feature — only their wiring/data-source
  is new.
- `history`/`rating`/`ratingDelta` are left `undefined` throughout — out
  of scope (belong to the separate Game Replay feature, 016, and a
  not-yet-specified rating system).
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before
  continuing.
