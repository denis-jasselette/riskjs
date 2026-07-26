# Quickstart: Validating the Online Gameplay Protocol

## Prerequisites

```bash
pnpm install --ignore-scripts
```

## Automated validation (primary — mirrors existing `lobby.test.ts`)

The existing lobby handlers are tested without a real socket, using a
`FakeConnection` + `dispatch()` pair (`server/src/handlers/lobby.test.ts`).
This feature's handlers should be validated the same way, added as sibling
`*.test.ts` files (e.g. `server/src/handlers/deploy.test.ts`,
`attack.test.ts`, `gameAction.test.ts`):

```bash
pnpm run test        # vitest run — includes server/src/**/*.test.ts
pnpm run server:typecheck
pnpm run lint
pnpm run build
```

Scenarios each acceptance criterion in `spec.md` maps to, using the
`FakeConnection` pattern (two or three fake connections bound to seats in
the same room, one `RoomStore`/`SessionStore` pair):

1. **US1 (play a turn)**: `create_room` → `join_room` (2 seats) →
   `start_game` → sender A sends `deploy`; assert A and B both receive an
   `action_event` and a `state_snapshot` reflecting the new troop count.
2. **US2 (shared battle outcome)**: 3 fake connections in one room; A
   attacks B; assert all three connections' `action_event` for that attack
   carry byte-identical dice values (SC-004).
3. **US3 (illegal/out-of-turn rejected)**: B (not the current player) sends
   `deploy`; assert only B receives `error`, A receives nothing, and
   `room.gameState` is unchanged (compare before/after).
4. **US4 (reconnect)**: mid-game, simulate a dropped connection, then send
   `reconnect{token}` on a new `FakeConnection`; assert the payload's
   `gameState` is the filtered `state_snapshot` shape, not raw state.
5. **US5 (personal elimination notice)**: drive a fake game to a capture
   that empties a seat's territories; assert that seat's connection
   receives `elimination_notice` before any `game_over`, and that a
   still-active seat does not receive `elimination_notice`.
6. **FR-012 (single-flight)**: send two `attack` messages for the same seat
   back-to-back within one synchronous test step; assert the second is
   rejected with `error` and only the first produces an `action_event`.
7. **Fog-of-war redaction**: start a room with `settings.fog = true`;
   assert seat A's `state_snapshot` never contains seat B's actual
   `playerCards` entries (only counts/placeholders) and never contains
   troop/owner data for a territory outside A's
   `getVisibleTerritories`.

## Manual validation (secondary — real two-browser-tab check)

Per the constitution's rule that UI/frontend changes are exercised manually
in a browser, once the client is wired to send/receive these messages for
an online game screen:

```bash
pnpm run server:dev   # starts the WS server on :8787
pnpm run dev           # starts the Vite client
```

1. Open two browser tabs, create a room in one, join it from the other.
2. Start the game; deploy troops from tab A; confirm tab B's board updates
   within ~1s (SC-001) without a manual refresh.
3. Attack from tab A; confirm both tabs show the identical dice roll.
4. Close tab B's connection (or hard-reload it) mid-game, then reconnect;
   confirm it resumes showing the correct, fog-of-war-filtered board rather
   than a stale or over-permissive view.
5. With fog of war enabled, confirm tab A's browser devtools Network/WS
   frame inspector does **not** show tab B's actual hand cards anywhere in
   the received `state_snapshot` payload — this is the concrete check for
   the redaction decision in `research.md` (a UI hiding the info is not
   sufficient; the payload itself must not contain it).

## Expected outcome

All `Done When` items in `spec.md`'s acceptance scenarios pass; `pnpm run
lint && pnpm run test && pnpm run build` is green (constitution's CI gate).
