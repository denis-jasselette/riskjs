# Contract: Admin Game Management WebSocket Messages

Same transport/envelope as the existing lobby and game protocols:
WebSocket, JSON, `{ type, payload }`. New types live in
`src/net/protocol/admin.ts`, imported by `server/` via `@`.

## Client → Server

```ts
export type AdminClientMessage =
  | { type: 'admin_list_games', payload: Record<string, never> }
  | { type: 'admin_end_game', payload: { roomCode: string } }
```

Every message is rejected unless `requireOperator(ctx)` passes (FR-008/
FR-009) — see data-model.md. There is no operator identifier in the
payload; the connection itself carries (once 006/021 exist) whatever
authenticates it as the operator, exactly as room/seat identity today comes
from the bound connection, not the payload.

## Server → Client

```ts
export type AdminServerMessage =
  | { type: 'admin_games_list', payload: { games: AdminGameSummary[] } }
  | { type: 'operator_game_ended', payload: Record<string, never> }
  | { type: 'error', payload: { message: string } }   // reused existing shape
```

`admin_games_list` is sent only to the requesting connection, in direct
response to `admin_list_games` (not broadcast). `operator_game_ended` is
sent individually to each eligible seat's connection (see data-model.md's
eligibility rule) as part of handling `admin_end_game` — never broadcast
via `Room.broadcast()`, since FR-010 requires per-seat exclusion.

## Delivery rules for `admin_end_game`

1. `requireOperator(ctx)` — reject with `error` (to the operator's own
   connection) on failure; no other effect.
2. Resolve `payload.roomCode` via `RoomStore.getRoom`; if not found or not
   `status === 'started'`, reject with `error` — no other effect (covers
   the Edge Case where the game already concluded normally moments
   earlier).
3. Send `operator_game_ended` to every eligible seat's connection (skip
   seats in `gameState.knockoutOrder`, skip seats with no bound
   connection).
4. Call `closeRoom(ctx, room, 'operator_ended')` — existing teardown,
   unchanged.

No response is sent back to the operator's own connection beyond the
implicit success of not receiving an `error` — a follow-up
`admin_list_games` naturally reflects the room's absence (AC2), matching
how this protocol reports state elsewhere (query again to see current
truth, no separate ack message).

## Out of scope for this contract

- Any operator-facing UI/page that calls these messages — building that is
  explicitly out of scope for this feature per its Assumptions.
- The real `requireOperator` implementation — owned by 006/021.
- Any message shape changes to the existing lobby (`create_room`/etc.) or
  game-action (`deploy`/`attack`/etc.) protocols — untouched by this
  feature.
- Admin management of lobbies (022) or accounts (021) — each has its own,
  separate protocol surface.
