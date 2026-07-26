# Contract: Game-Phase WebSocket Messages

Extends the existing lobby protocol (`src/net/protocol/lobby.ts`) once a
room's `status` is `'started'`. Same transport and envelope already in use:
WebSocket, JSON, `{ type, payload }`. New types live in a sibling file,
`src/net/protocol/game.ts`, imported by both `src/` and `server/` (via `@`)
exactly like `lobby.ts` is today.

## Client → Server

```ts
export type ClientGameMessage =
  | { type: 'deploy', payload: { troops: number, territory: string } }
  | { type: 'attack', payload: { attackingTroops: number, attackingTerritory: string, defendingTerritory: string, diceCount?: number } }
  | { type: 'confirm_post_conquest_move', payload: { troopsToMove: number } }
  | { type: 'fortify', payload: { troops: number, fromTerritory: string, toTerritory: string } }
  | { type: 'trade_cards', payload: { cardIndices: number[], bonusTerritory?: string } }
  | { type: 'end_phase', payload: Record<string, never> }
  | { type: 'place_capital', payload: { territory: string } }
  | { type: 'resign', payload: Record<string, never> }
```

Every message is evaluated against the sender connection's bound
`(roomCode, seatIndex)` — there is no player/user id in the payload itself,
matching how `create_room`/`join_room` already identify the actor purely by
which connection sent the message.

## Server → Client

```ts
export type ServerGameMessage =
  | { type: 'action_event', payload: ActionEventPayload }
  | { type: 'state_snapshot', payload: { gameState: GameState } }  // already filtered for the recipient seat
  | { type: 'elimination_notice', payload: { player: PlayerColor } }
  | { type: 'game_over', payload: { winner?: PlayerColor, standings: PlayerStanding[] } }
  | { type: 'error', payload: { message: string } }  // reuses the existing lobby error shape
```

`ActionEventPayload` is a discriminated union keyed by the action type that
produced it, carrying only the concrete outcome fields relevant to that
action (dice values and territory/troop deltas for `attack`; troops placed
for `deploy`; etc.) — see `data-model.md`'s Action Outcome section.

## Delivery rules per valid action

1. Compute the outcome by calling the matching `GameController` method
   (see `data-model.md`'s Game Action table) and replace `room.gameState`
   with the controller's returned `.gameState`.
2. Broadcast one `action_event` to every connected seat, unfiltered — dice
   values and effect deltas are not seat-specific secrets (SC-004).
3. Send each connected seat its own `state_snapshot`, individually computed
   via `filterGameStateForSeat(room.gameState, mapController, seat.color)`
   (never the raw `room.gameState`).
4. If this action newly eliminated a player (new entry in
   `gameState.knockoutOrder`), send that seat's connection (if still
   connected) an `elimination_notice`, before step 5.
5. If this action set `gameState.gameOver` to `true`, broadcast `game_over`
   to every connected seat.

## Rejection rule (applies to every message type above)

If validation fails for any reason — out of turn, illegal per
`isAttackAllowed`/`isFortifyAllowed`/`isSelectable`, an in-flight action
already held for that seat (FR-012), the seat already eliminated, or the
game already over — send `error` to the sending connection only, with a
human-readable `message`. `room.gameState` is not touched, no `action_event`
or `state_snapshot` is sent to anyone, including the sender.

## Reconnection

`handleReconnect` (`server/src/handlers/reconnect.ts`) changes its
`room.status === 'started'` branch to send a `state_snapshot` (filtered for
the reconnecting seat) instead of today's raw `gameState` inside the
`game_started`-shaped payload.

## Out of scope for this contract

- Bot decision-making (002) — bots submit the exact same
  `ClientGameMessage` union as a human client; no protocol difference.
- Turn timers / disconnect-triggered auto-play (003).
- Any message shape changes to the existing lobby protocol
  (`create_room`/`join_room`/`update_settings`/`leave_room`/`end_game`) —
  unchanged by this feature.
