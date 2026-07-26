# Quickstart: Validating Admin Game Management

## Prerequisites

```bash
pnpm install --ignore-scripts
```

## Automated validation (primary)

Handler tests use the existing `FakeConnection` + `dispatch()` pattern
(`server/src/handlers/lobby.test.ts`), with a test double injected for
`requireOperator` since no real 006/021 implementation exists yet to test
against:

```bash
pnpm run test
pnpm run server:typecheck
pnpm run lint
pnpm run build
```

Scenarios each acceptance criterion maps to:

1. **US1 AC1 (list every in-progress game)**: with the operator-double
   passing and two started rooms + one still-in-lobby room in the store,
   `admin_list_games` returns exactly the two started rooms with their
   players/settings/duration (SC-001).
2. **US1 AC2 (concluded game disappears)**: end one of those rooms (via
   `closeRoom` directly, simulating a normal conclusion, or via
   `admin_end_game`), then send `admin_list_games` again and confirm only
   the remaining room appears.
3. **US2 AC1/AC2 (end action + capacity freed)**: `admin_end_game` on a
   started room; assert the room no longer exists in `RoomStore` afterward
   (`RoomStore.getRoom` returns undefined) — the same check that would
   prove a normal conclusion freed its slot (SC-002).
4. **US2 AC3 (distinct operator notice, non-eliminated only)**: a 3-seat
   room where one seat is already present in `gameState.knockoutOrder`;
   `admin_end_game`; assert the two still-active seats' connections receive
   `operator_game_ended` and the already-eliminated seat's connection does
   not (FR-010, SC-003).
5. **US2 AC4 / FR-006/FR-007 (no confusion with normal conclusion)**: a
   test that drives a room to a normal `game_over` (win) and confirms no
   `operator_game_ended` is ever sent for that path, and conversely that
   `admin_end_game` never emits anything resembling a win notification
   (SC-005).
6. **FR-008/FR-009 (unreachable by non-operators)**: with the
   operator-double set to reject, `admin_list_games`/`admin_end_game` both
   return `error` and have no other effect (SC-004).
7. **Edge case (simultaneous normal + operator conclusion)**: a room whose
   `status` has already flipped away from `'started'` (simulating it
   having just concluded normally) receives `admin_end_game` for its old
   code; assert it's rejected with `error` as "not found," not double-torn-down.

## Manual validation

None possible yet beyond the automated handler tests above — this feature
has no client-facing UI in scope, and its authorization gate has no real
implementation to click through until 006/021 ship. Once an operator page
exists (a later feature, per this spec's Assumptions) and 006/021 are
implemented, the manual check is: as a non-admin account, confirm the page/
messages are unreachable; as the admin account, list in-progress games,
end one, and confirm every other still-connected, non-eliminated player in
that game sees a clear "ended by an operator" message rather than a win
screen.

## Expected outcome

All `Done When` items in `spec.md`'s acceptance scenarios pass against the
`requireOperator` test double; `pnpm run lint && pnpm run test && pnpm run
build` is green. Full end-to-end (real operator auth) validation remains
blocked on 006/021 shipping, as documented in plan.md.
