---

description: "Task list for Online Gameplay Protocol implementation"
---

# Tasks: Online Gameplay Protocol

**Input**: Design documents from `/specs/001-online-game-protocol/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/game-protocol.md, quickstart.md

**Tests**: Included. `plan.md`'s Testing section and `quickstart.md` both specify handler-level tests using the existing `FakeConnection` + `dispatch()` pattern (`server/src/handlers/lobby.test.ts`) as a project convention already established for every handler — this feature follows it, not a new TDD requirement.

**Organization**: Tasks are grouped by user story (from `spec.md`) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths are included in each description

## Path Conventions

Existing web-app split (per `plan.md`'s Structure Decision): `src/` (React client + shared game logic, `@` alias) and `server/` (Node WebSocket server, `@server` alias). No new project.

---

## Phase 1: Setup

**Purpose**: Establish the new protocol's type surface before anything consumes it

- [ ] T001 Define `ClientGameMessage` / `ServerGameMessage` discriminated unions in `src/net/protocol/game.ts`, following the existing style of `src/net/protocol/lobby.ts`, per the exact shapes in `contracts/game-protocol.md`

**Checkpoint**: Protocol types compile and are importable from both `src/` and `server/` via `@`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure every user story's handlers depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 [P] Add `actionInFlight: boolean` field to `RoomSeat` in `server/src/rooms/Room.ts`, initialized to `false` wherever other seat fields are initialized (data-model.md's server-side runtime addition, FR-012)
- [ ] T003 [P] Implement `filterGameStateForSeat(gameState, mapController, viewerColor): GameState` in `src/controllers/GameStateView.ts` per the redaction rules table in `data-model.md` (fog-of-war territory/troop redaction via `MapController.getVisibleTerritories`, opponent `playerCards` replaced with placeholders, `deck` cleared)
- [ ] T004 [P] Unit tests for `filterGameStateForSeat` in `src/controllers/GameStateView.test.ts` covering: fog-enabled redaction of a non-visible territory's owner/count, always-redacted opponent card identities, cleared deck, and pass-through of unaffected fields (`currentPlayer`, `currentPhase`, `capitals`, `knockoutOrder`, etc.)
- [ ] T005 Implement the shared `server/src/handlers/gameAction.ts` helper: resolves the sending connection's bound seat, calls the matching `GameController` method, replaces `room.gameState` with the controller's returned `.gameState`, broadcasts `action_event` to every connected seat, and sends each connected seat its own `state_snapshot` via `filterGameStateForSeat` (T003) (depends on T002, T003)
- [ ] T006 Wire `deploy` / `attack` / `confirm_post_conquest_move` / `fortify` / `trade_cards` / `end_phase` / `place_capital` / `resign` cases into the `dispatch()` switch in `server/src/handlers/index.ts`, routing each to its (as-yet-unwritten) handler via the `gameAction.ts` helper (depends on T005)

**Checkpoint**: Foundation ready — user story handlers can now be implemented.

---

## Phase 3: User Story 1 - Play a turn in an online game (Priority: P1) 🎯 MVP

**Goal**: A connected player can deploy, attack, fortify, trade cards, place their capital, resign, or end their phase, and every connected player's view reflects it — the online equivalent of local pass-and-play's core loop.

**Independent Test**: Start an online game with two connected players, have the current player submit a legal action (e.g. deploy troops to an owned territory), and confirm both players' views update to reflect it.

### Tests for User Story 1 ⚠️

> Write these tests FIRST, ensure they FAIL before implementation (no handler exists yet)

- [ ] T007 [P] [US1] Test deploy happy path in `server/src/handlers/deploy.test.ts`: two `FakeConnection`s in one started room, current player deploys, assert both receive `action_event` and an updated `state_snapshot` (quickstart scenario 1)
- [ ] T008 [P] [US1] Test attack happy path in `server/src/handlers/attack.test.ts`: valid attack from an adjacent owned territory, assert `action_event` carries dice/outcome and `room.gameState` reflects troop/ownership changes
- [ ] T009 [P] [US1] Test fortify happy path in `server/src/handlers/fortify.test.ts`
- [ ] T010 [P] [US1] Test trade_cards happy path in `server/src/handlers/tradeCards.test.ts`
- [ ] T011 [P] [US1] Test end_phase happy path in `server/src/handlers/endPhase.test.ts`: asserts turn/phase advances for every connected seat
- [ ] T012 [P] [US1] Test place_capital happy path in `server/src/handlers/placeCapital.test.ts` (012's rules; this feature only carries the action)
- [ ] T013 [P] [US1] Test resign happy path in `server/src/handlers/resign.test.ts` (013's rules; this feature only carries the action)

### Implementation for User Story 1

- [ ] T014 [P] [US1] Implement `server/src/handlers/deploy.ts`: validate payload shape, call `GameController.deploy(troops, territory)` via the `gameAction.ts` helper (T005)
- [ ] T015 [P] [US1] Implement `server/src/handlers/attack.ts`: call `GameController.attackRng`/`attack(...)` via the helper, ensuring dice values from the one authoritative call are what `action_event` carries
- [ ] T016 [P] [US1] Implement `server/src/handlers/fortify.ts`: call `GameController.fortify(...)` via the helper
- [ ] T017 [P] [US1] Implement `server/src/handlers/tradeCards.ts`: call `GameController.tradeCards(...)` via the helper
- [ ] T018 [P] [US1] Implement `server/src/handlers/endPhase.ts`: call `GameController.startNextPhase()`/`startNextPlayerTurn()` via the helper
- [ ] T019 [P] [US1] Implement `server/src/handlers/placeCapital.ts`: call `GameController.chooseCapital(territory)` via the helper
- [ ] T020 [P] [US1] Implement `server/src/handlers/resign.ts`: call `GameController.resign(currentPlayer)` via the helper

**Checkpoint**: User Story 1 fully functional and independently testable — an online game can be played turn-by-turn through the new protocol, matching local `Game.tsx` behavior.

---

## Phase 4: User Story 2 - Everyone sees the same live battle outcome (Priority: P2)

**Goal**: Confirm the "one authoritative computation, broadcast to all" design (already built into `gameAction.ts` in Phase 2/3) actually delivers byte-identical outcomes, and that historical outcomes are never replayed as new events.

**Independent Test**: With three or more players connected to one game, have one player attack; confirm all connected players independently observe an identical battle outcome (same dice values, same territories/troops affected).

- [ ] T021 [US2] Extend `server/src/handlers/attack.test.ts` with a 3-connection scenario: assert all three connections' `action_event` payloads for the same attack contain byte-identical dice values and effect deltas (SC-004)
- [ ] T022 [US2] Test in `server/src/handlers/reconnect.test.ts` (or alongside T030) that reconnecting after a past attack does not re-deliver that attack's `action_event` — only a current `state_snapshot` is sent, so no historical outcome is replayed as new

**Checkpoint**: Shared-outcome guarantee verified; no implementation changes expected beyond what US1/Foundational already built (this phase is verification-only, per the design already recorded in `research.md`).

---

## Phase 5: User Story 3 - Illegal or out-of-turn actions are rejected safely (Priority: P2)

**Goal**: Harden the happy-path handlers from Phase 3 so that out-of-turn, illegal, duplicate, eliminated-seat, ended-game, and malformed actions are all rejected via one consistent path, with zero effect on shared state.

**Independent Test**: Attempt an action that violates a game rule (e.g. attack out of turn, attack a non-adjacent territory), and confirm the game state is unchanged for all players and only the attempting player receives a rejection.

### Implementation for User Story 3

- [ ] T023 [US3] Extend `server/src/handlers/gameAction.ts` (from T005) with the full validation gate run before any `GameController` call: sender's seat matches `gameState.currentPlayer` (out-of-turn reject), `actionInFlight` lock check (FR-012, using T002's field), seat-eliminated / game-already-over reject, and type-specific legality via `isSelectable`/`isAttackAllowed`/`isFortifyAllowed`/`hasAvailableTradeIn`; on any failure send `error` to the sender only and leave `room.gameState` untouched (depends on T005, T006, T014–T020)
- [ ] T024 Handle malformed/unrecognized message types in `server/src/handlers/index.ts`'s `dispatch()` with the same sender-only `error` response (depends on T006)

### Tests for User Story 3

- [ ] T025 [P] [US3] Test out-of-turn rejection in `server/src/handlers/gameAction.test.ts`: non-current-player sends `deploy`, assert only that sender gets `error`, no `action_event`/`state_snapshot` sent to anyone, `room.gameState` unchanged
- [ ] T026 [P] [US3] Test illegal-shaped action rejection (e.g. attack on a non-adjacent territory) with the same assertions
- [ ] T027 [P] [US3] Test FR-012 single-flight: two `attack` messages for the same seat sent back-to-back within one synchronous step; assert the second is rejected with `error` and only the first produces an `action_event`
- [ ] T028 [P] [US3] Test rejection of an action for an already-eliminated seat and for an already-ended game
- [ ] T029 [P] [US3] Test rejection of a malformed/unknown message type: sender-only generic `error`, no broadcast, state unchanged

**Checkpoint**: Game state is safe against out-of-turn, illegal, duplicate, and malformed client input.

---

## Phase 6: User Story 4 - Resume seeing the game correctly after reconnecting (Priority: P3)

**Goal**: A player who reconnects mid-game gets their current, correctly filtered view — not the raw, unfiltered state the lobby-era `reconnect` handler sends today.

**Independent Test**: Disconnect a player mid-game, reconnect using their existing session, and confirm they receive a current, correctly fog-of-war-filtered view without needing to rejoin or restart.

- [ ] T030 [US4] Update `server/src/handlers/reconnect.ts`'s `room.status === 'started'` branch to send a `state_snapshot` filtered via `filterGameStateForSeat` (T003) for the reconnecting seat, instead of today's raw `room.gameState` inside the `game_started`-shaped payload
- [ ] T031 [P] [US4] Test in `server/src/handlers/reconnect.test.ts`: reconnect mid-game with fog of war enabled, assert the payload is the filtered `state_snapshot` shape (no opponent card identities, no data for territories outside the seat's visibility) and not raw `gameState`

**Checkpoint**: Reconnection during an active game is safe and correctly scoped.

---

## Phase 7: User Story 5 - A defeated player is told they're out (Priority: P2)

**Goal**: The instant a player loses their last territory, that seat's connection gets a personal `elimination_notice`, distinct from and prior to any later whole-game `game_over`.

**Independent Test**: Reduce a connected player to zero territories via a conquest and confirm that specific player receives a personal notification of their own defeat, distinct from the shared action outcome of the attack that defeated them and from any later whole-game end notification.

### Implementation for User Story 5

- [ ] T032 [US5] Add elimination detection to `gameAction.ts` (T005): diff `gameState.knockoutOrder` before/after the action; if a new entry appears, send that seat's connection (if still connected) an `elimination_notice` after the `action_event`/`state_snapshot` pair, before any `game_over`
- [ ] T033 [US5] Add game-over broadcast to `gameAction.ts`: if the action set `gameState.gameOver` to `true`, broadcast `game_over` with `GameController.getWinner()`/`getStandings()` to every connected seat (depends on T032)

### Tests for User Story 5

- [ ] T034 [P] [US5] Test in `server/src/handlers/gameAction.test.ts` (or `attack.test.ts`): a capture that empties a seat's territories causes that seat's connection to receive `elimination_notice` before any `game_over`, while a still-active seat does not receive `elimination_notice`
- [ ] T035 [P] [US5] Test that a later whole-game `game_over` does not replace or duplicate an already-delivered `elimination_notice` for a previously defeated seat

**Checkpoint**: All five user stories independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all stories

- [ ] T036 [P] Run full automated validation: `pnpm run test && pnpm run server:typecheck && pnpm run lint && pnpm run build` (quickstart.md's automated section; constitution's CI gate)
- [ ] T037 [P] Perform quickstart.md's manual two-browser-tab validation, including the devtools Network/WS-frame check that fog-of-war-hidden data (e.g. opponent cards) is absent from the wire payload itself, not just hidden by the UI

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (needs `game.ts` types) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — no dependency on other stories
- **User Story 2 (Phase 4)**: Depends on Foundational + US1's `attack.ts` (T015) existing to extend its test
- **User Story 3 (Phase 5)**: Depends on Foundational + US1's handlers (T014–T020) existing to validate against
- **User Story 4 (Phase 6)**: Depends on Foundational (T003's `filterGameStateForSeat`) — independent of US1/US2/US3 otherwise
- **User Story 5 (Phase 7)**: Depends on Foundational (`gameAction.ts`, T005) — independent of US1–US4 otherwise
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories — this is the MVP
- **US2 (P2)**: Extends US1's `attack.ts`/tests; cannot be verified before US1 exists
- **US3 (P2)**: Hardens US1's handlers; cannot be verified before US1 exists
- **US4 (P3)**: Independent of US1–US3 — only needs Foundational's `filterGameStateForSeat`
- **US5 (P2)**: Independent of US1–US4 in code terms, but its test scenarios drive a game through `attack.ts` (US1), so is easiest to validate after US1

### Within Each User Story

- Tests written first, confirmed failing before implementation
- Shared helper (`gameAction.ts`) before individual handlers that call it
- Story complete and checkpointed before moving to the next priority

### Parallel Opportunities

- All Foundational tasks marked [P] (T002, T003, T004) can run in parallel
- All US1 test tasks (T007–T013) can run in parallel; all US1 implementation tasks (T014–T020) can run in parallel once their corresponding test exists
- US4 and US5 can be implemented in parallel with each other (and with US2/US3) once Foundational is done, by different contributors
- All US3 test tasks (T025–T029) can run in parallel
- T036/T037 can run in parallel with each other

---

## Parallel Example: User Story 1

```bash
# Tests (write first, confirm failing):
Task: "Test deploy happy path in server/src/handlers/deploy.test.ts"
Task: "Test attack happy path in server/src/handlers/attack.test.ts"
Task: "Test fortify happy path in server/src/handlers/fortify.test.ts"
Task: "Test trade_cards happy path in server/src/handlers/tradeCards.test.ts"
Task: "Test end_phase happy path in server/src/handlers/endPhase.test.ts"
Task: "Test place_capital happy path in server/src/handlers/placeCapital.test.ts"
Task: "Test resign happy path in server/src/handlers/resign.test.ts"

# Implementation (once tests exist and fail):
Task: "Implement server/src/handlers/deploy.ts"
Task: "Implement server/src/handlers/attack.ts"
Task: "Implement server/src/handlers/fortify.ts"
Task: "Implement server/src/handlers/tradeCards.ts"
Task: "Implement server/src/handlers/endPhase.ts"
Task: "Implement server/src/handlers/placeCapital.ts"
Task: "Implement server/src/handlers/resign.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T006) — CRITICAL, blocks everything else
3. Complete Phase 3: User Story 1 (T007–T020)
4. **STOP and VALIDATE**: play a full turn cycle (deploy → attack → fortify → end phase) across two connected clients
5. Demo if ready — this alone makes online Risk playable, matching local pass-and-play's core loop

### Incremental Delivery

1. Setup + Foundational → protocol types and shared guard/broadcast plumbing ready
2. Add US1 → test independently → demo (MVP: a full turn works online)
3. Add US2 → verify shared-outcome guarantee holds under 3+ viewers
4. Add US3 → harden against illegal/duplicate/malformed input
5. Add US4 → reconnection mid-game is safe and correctly scoped
6. Add US5 → personal elimination notices land correctly
7. Polish → full CI gate + manual two-tab + devtools payload check

### Parallel Team Strategy

With multiple contributors, after Foundational (Phase 2) is done:

- Contributor A: US1 (the MVP critical path)
- Contributor B: US4 (reconnection) — only needs `filterGameStateForSeat` from Foundational
- Contributor C: US5 (elimination notices) — only needs `gameAction.ts` from Foundational

US2 and US3 should follow after US1 lands, since both extend/harden US1's handlers rather than introducing independent code paths.

---

## Notes

- [P] tasks touch different files with no unfinished dependency between them
- [Story] label maps each task to its user story for traceability back to `spec.md`
- Every "happy path" handler test in US1 must fail before its handler (T014–T020) exists
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before continuing
- The one deliberately shared, non-story-specific artifact is `gameAction.ts` (T005) — it is extended, not duplicated, by US3 (T023) and US5 (T032, T033); this is intentional per `plan.md`'s Project Structure, not a violation of story independence, since each story's *tests* remain independently runnable
