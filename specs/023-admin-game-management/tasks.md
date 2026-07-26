---

description: "Task list for Admin Game Management implementation"
---

# Tasks: Admin Game Management

**Input**: Design documents from `/specs/023-admin-game-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/admin-game-protocol.md, quickstart.md

**Tests**: Included, following the existing `server/src/handlers/lobby.test.ts` `FakeConnection`+`dispatch()` convention.

**Organization**: Tasks are grouped by user story (from `spec.md`).

**⚠️ Standing blocker**: FR-009 gates this entire feature behind an `is_admin` account flag owned by features 006/021, neither of which is implemented yet (no account/session model exists anywhere in `server/src`). Every task below builds and tests against a `requireOperator` test double (see T002). **This feature is not deployable/usable until 006/021 ship a real implementation to swap in** — that final swap is intentionally not a task here, since it belongs to whichever of 006/021 lands last.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US2)

## Path Conventions

Server-only: `server/src/handlers/`, `server/src/rooms/`, plus one new shared protocol file under `src/net/protocol/` (imported via `@`).

---

## Phase 1: Setup

- [ ] T001 [P] Define `AdminClientMessage` / `AdminServerMessage` discriminated unions in `src/net/protocol/admin.ts` per `contracts/admin-game-protocol.md`
- [ ] T002 [P] Add `requireOperator(ctx: HandlerContext): void` to `server/src/handlers/context.ts`, alongside `requireBoundRoom`/`requireHostRoom` — throws unless the connection is authenticated as the operator; body is an explicitly-named placeholder (e.g. checks a not-yet-defined `ctx.operatorAuth` hook) pending 006/021, with a doc comment stating that plainly

**Checkpoint**: Protocol types and the (placeholder) auth seam exist and compile.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 [P] Add `startedAt?: number` to `Room` in `server/src/rooms/Room.ts`
- [ ] T004 Set `room.startedAt = Date.now()` at the point `status` flips to `'started'` (today, in `handleStartGame` — feature 001's territory; if 001's handler doesn't exist yet in this working tree, add the assignment at the equivalent status-transition site once it does) (depends on T003)
- [ ] T005 [P] Add `listStartedRooms(): Room[]` to `RoomStore` in `server/src/rooms/RoomStore.ts` (filters `status === 'started'`)
- [ ] T006 [P] Test double helper for `requireOperator` in `server/src/handlers/testUtils.ts` (or alongside existing lobby test helpers): exports an always-pass and an always-throw variant for injection in handler tests (depends on T002)

**Checkpoint**: Room enumeration and duration tracking exist; the auth seam is testable in both directions.

---

## Phase 3: User Story 1 - See every in-progress game (Priority: P1) 🎯 MVP

**Goal**: The operator can list every currently in-progress game with players, settings, and duration.

**Independent Test**: With multiple online games in progress, confirm the operator's view lists every one of them with accurate player, mode/settings, and duration information.

### Tests for User Story 1

- [ ] T007 [P] [US1] Test `admin_list_games` returns every `status === 'started'` room (not lobby-phase rooms) with correct players/settings/duration, in `server/src/handlers/adminListGames.test.ts` (SC-001)
- [ ] T008 [P] [US1] Test a room no longer appears in `admin_list_games` after it concludes (simulate via `closeRoom` directly) (US1 AC2)
- [ ] T009 [P] [US1] Test `admin_list_games` is rejected with `error` when `requireOperator`'s reject-double is injected (SC-004)

### Implementation for User Story 1

- [ ] T010 [US1] Implement `server/src/handlers/adminListGames.ts`: `requireOperator(ctx)` → `roomStore.listStartedRooms()` → map to `AdminGameSummary[]` (players via `publicSeats()`, `settings`, `startedAt`, computed `durationMs`) → send `admin_games_list` to the requesting connection only (depends on T002, T003, T005)
- [ ] T011 [US1] Wire `admin_list_games` into the `dispatch()` switch in `server/src/handlers/index.ts` (depends on T010)

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Manually end a game as an operator override (Priority: P1)

**Goal**: The operator can immediately terminate a specific in-progress game; its resources free the same as a normal conclusion; still-connected, non-eliminated players get a clearly distinct notice.

**Independent Test**: As the operator, manually end an in-progress game and confirm it terminates immediately, its resources are freed the same way a normally-concluded game's would be, and every still-connected player is clearly told the game was ended by an operator rather than concluded by a normal win.

### Tests for User Story 2

- [ ] T012 [P] [US2] Test `admin_end_game` deletes the room from `RoomStore` (capacity freed) in `server/src/handlers/adminEndGame.test.ts` (US2 AC1/AC2, SC-002)
- [ ] T013 [P] [US2] Test still-active seats' connections receive `operator_game_ended`, while a seat already present in `gameState.knockoutOrder` does not (US2 AC3, FR-010, SC-003)
- [ ] T014 [P] [US2] Test `admin_end_game` for an unknown or already-concluded (not `'started'`) room code is rejected with `error` and has no other effect (the simultaneous-conclusion Edge Case)
- [ ] T015 [P] [US2] Test `admin_end_game` is rejected with `error` when `requireOperator`'s reject-double is injected, with `RoomStore` unchanged (SC-004)
- [ ] T016 [P] [US2] Test a room reaching a normal `game_over` never emits `operator_game_ended`, and `admin_end_game` never emits anything resembling a win notification — the two paths stay distinct (FR-006/FR-007, SC-005)

### Implementation for User Story 2

- [ ] T017 [US2] Implement `server/src/handlers/adminEndGame.ts` per data-model.md's sequencing: `requireOperator(ctx)` → resolve room by `payload.roomCode` (reject if missing/not started) → send `operator_game_ended` to every seat not in `gameState.knockoutOrder` → `closeRoom(ctx, room, 'operator_ended')` (depends on T002, T003, T005)
- [ ] T018 [US2] Wire `admin_end_game` into the `dispatch()` switch in `server/src/handlers/index.ts` (depends on T017)

**Checkpoint**: Both user stories independently functional — this is the feature's full MVP (both stories are P1).

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T019 [P] Run `pnpm run test && pnpm run server:typecheck && pnpm run lint && pnpm run build` (quickstart.md's automated section; constitution's CI gate)
- [ ] T020 Document in a code comment on `requireOperator` (T002) exactly what 006/021 need to implement to make this feature real (the account/session lookup + `is_admin` check), so the swap is a clearly-scoped follow-up rather than a rediscovery

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup (T004/T006 need T002/T003) — BLOCKS both user stories
- **US1 (Phase 3)**: Depends on Foundational — no dependency on US2
- **US2 (Phase 4)**: Depends on Foundational — no dependency on US1's handler, though both together form this feature's full MVP
- **Polish (Phase 5)**: Depends on both user stories being complete

### User Story Dependencies

- **US1 (P1)**: Independent of US2
- **US2 (P1)**: Independent of US1 in code terms (different handler file); both are P1 because visibility (US1) without the end action (US2) provides no operational remedy, per the spec's own "Why this priority"

### Parallel Opportunities

- T001, T002 (Setup) can run in parallel
- T003, T005 (Foundational) can run in parallel; T004 depends on T003, T006 depends on T002
- US1 (T007–T011) and US2 (T012–T018) can be implemented in parallel by different contributors once Foundational is done — different files throughout
- All US1 tests (T007–T009) can run in parallel; all US2 tests (T012–T016) can run in parallel

---

## Parallel Example: Foundational → US1/US2 split

```bash
# Foundational, in parallel:
Task: "Add startedAt to Room in server/src/rooms/Room.ts"
Task: "Add listStartedRooms() to server/src/rooms/RoomStore.ts"
Task: "requireOperator test-double helper in server/src/handlers/testUtils.ts"

# Once Foundational lands, US1 and US2 in parallel:
Task: "Implement adminListGames.ts (US1)"
Task: "Implement adminEndGame.ts (US2)"
```

---

## Implementation Strategy

### MVP First (both user stories — both P1)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T006) — CRITICAL
3. Complete Phase 3: US1 (T007–T011) and Phase 4: US2 (T012–T018)
4. **STOP and VALIDATE**: run the full automated suite against the
   `requireOperator` test double; there is no manual validation possible
   yet (no operator UI, no real auth) per quickstart.md
5. Leave `requireOperator`'s real implementation as an explicitly-flagged
   follow-up for whichever of 006/021 ships last

### Incremental Delivery

1. Setup + Foundational → auth seam, room enumeration, duration tracking ready
2. Add US1 → operator can see what's running (against the test double)
3. Add US2 → operator can act on it — feature is code-complete
4. (Later, separate work) 006/021 ship → swap `requireOperator`'s body →
   feature becomes actually usable

### Parallel Team Strategy

After Foundational (Phase 2):

- Contributor A: US1 (`adminListGames.ts`)
- Contributor B: US2 (`adminEndGame.ts`)

---

## Notes

- [P] tasks touch different files with no unfinished dependency between them
- `requireOperator` (T002) is the one deliberately incomplete piece — every other task is fully finishable now
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before continuing
