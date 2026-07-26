# Phase 1 Data Model: Admin Game Management

No new persisted storage. Two small additions to existing in-memory
server models, plus two new transient message shapes.

## `Room` (existing, `server/src/rooms/Room.ts`) — one new field

```ts
startedAt?: number   // NEW — epoch ms, set once when status flips to 'started'
```

Set by whichever handler currently performs that transition (today,
`handleStartGame`, feature 001's territory). Not set for rooms still in
`'lobby'` status — the admin view only lists `status === 'started'` rooms,
so this is always populated for anything the operator can see.

## `RoomStore` (existing, `server/src/rooms/RoomStore.ts`) — one new method

```ts
listStartedRooms(): Room[]   // NEW — Array.from(this.rooms.values()).filter(r => r.status === 'started')
```

## Game Management View (spec's Key Entity) → `admin_games_list`

Produced fresh on every `admin_list_games` request — not cached, not
pushed proactively (no acceptance scenario requires live-updating without a
re-request; AC2 only requires that a concluded game is gone *the next time*
the operator views the list).

```ts
type AdminGameSummary = {
  roomCode: string
  players: { color: PlayerColor, name: string, human: boolean }[]
  settings: RoomSettings          // existing type from src/net/protocol/lobby.ts
  startedAt: number
  durationMs: number              // Date.now() - startedAt, computed at request time
}
```

Sourced from `RoomStore.listStartedRooms()`, mapped via each `Room`'s
existing `publicSeats()`/`settings`/`startedAt`. No `gameState` details
(troops, board position) are included — FR-002 only requires "players,
mode/settings, how long it's been running," and there is no acceptance
scenario asking for board-level detail; keeping the summary shallow avoids
any accidental fog-of-war/secrecy concern (an operator seeing all players'
cards would be a bigger decision than this spec makes).

## Operator-Initiated Game End (spec's Key Entity) → `admin_end_game` / `operator_game_ended`

```ts
// Client → Server
{ type: 'admin_end_game', payload: { roomCode: string } }

// Server → each eligible seat's connection, before teardown
{ type: 'operator_game_ended', payload: {} }
```

"Eligible seat" = every seat in `room.seats` whose `color` is **not** a key
in `room.gameState.knockoutOrder` at the moment the action is processed
(FR-010) — mirrors the same `knockoutOrder`-diffing idea 001 uses for its
own `elimination_notice`, but as a static membership check rather than a
before/after diff, since no new eliminations happen as part of this action.

## Sequencing for `adminEndGame`

1. `requireOperator(ctx)` — reject (typed error, connection-only) if not
   an authenticated operator (FR-008/FR-009).
2. Look up the room by `roomCode`; if missing or not `status === 'started'`,
   reject (already concluded — the Edge Case's "whichever conclusion is
   recorded first wins" resolves here: if the room is already gone because
   it concluded normally a moment earlier, there is nothing to end).
3. For each seat in `room.seats` whose `color` is not in
   `room.gameState.knockoutOrder`: send that seat's connection (if bound)
   `operator_game_ended`.
4. Call `closeRoom(ctx, room, 'operator_ended')` — existing teardown:
   revoke every seat's session, unbind every connection, delete the room
   from `RoomStore` (this is the entire capacity-freeing mechanism, per
   research.md decision 2 — no separate accounting call exists to make).

## `requireOperator(ctx)` — the deferred seam

```ts
function requireOperator(ctx: HandlerContext): void
```

Throws (rejected the same way `requireHostRoom` rejects a non-host caller)
unless the calling connection is authenticated as an operator. Until 006/
021 exist, this function has no real implementation to call into — tests
for `adminListGames`/`adminEndGame` inject a test double (always-pass or
always-throw) to exercise both branches. The real body is 006/021's
delivery, not this feature's.
