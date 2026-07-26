# Phase 1 Data Model: Online Gameplay Protocol

This feature adds no new persisted storage (in-memory only, per
`research.md`). It adds one new server-side runtime field and one new
derived/computed shape. Everything else is the existing `GameState`
(`src/models/GameState.ts`) and `Room`/`RoomSeat` (`server/src/rooms/Room.ts`)
models, used as-is.

## Game Action (from spec's Key Entities)

Not a stored entity — a transient message. Represented as a discriminated
union in `src/net/protocol/game.ts`, following the existing
`ClientMessage` pattern in `src/net/protocol/lobby.ts`:

| type            | payload shape                                                                      | Maps to `GameController` call                         |
|------------------|-------------------------------------------------------------------------------------|--------------------------------------------------------|
| `deploy`         | `{ troops: number, territory: string }`                                            | `deploy(troops, territory)`                             |
| `attack`         | `{ attackingTroops: number, attackingTerritory: string, defendingTerritory: string, diceCount?: number }` | `attack(...)` |
| `confirm_post_conquest_move` | `{ troopsToMove: number }`                                             | `confirmPostConquestMove(troopsToMove)` (024)            |
| `fortify`        | `{ troops: number, fromTerritory: string, toTerritory: string }`                   | `fortify(...)`                                           |
| `trade_cards`    | `{ cardIndices: number[], bonusTerritory?: string }`                                | `tradeCards(...)`                                        |
| `end_phase`      | `{}`                                                                                 | `startNextPhase()` / `startNextPlayerTurn()`             |
| `place_capital`  | `{ territory: string }`                                                             | `chooseCapital(territory)` (012's rules)                |
| `resign`         | `{}`                                                                                 | `resign(currentPlayer)` (013's rules)                    |

Validation before any `GameController` call, regardless of type (FR-001,
FR-002, FR-012):
- The submitting connection's bound seat matches `gameState.currentPlayer`
  for that room's assigned color (out-of-turn → reject).
- No `actionInFlight` lock is currently held for that seat (duplicate/stale
  → reject, FR-012).
- The game has not already ended and the seat has not already been
  eliminated (FR-002, resolved edge case).
- Type-specific legality via the existing `isSelectable` /
  `isAttackAllowed` / `isFortifyAllowed` / `hasAvailableTradeIn` checks
  already on `GameController`.

## Action Outcome → `action_event`

Broadcast verbatim to every connected seat in the room. Shape varies by
action type but always identifies the action and its concrete effect —
notably, for `attack`, the dice values themselves (SC-004 requires these be
byte-identical across every viewer):

```text
{
  type: 'action_event',
  payload: {
    actionType: GameActionType,
    by: PlayerColor,               // who acted
    // action-specific fields, e.g. for attack:
    attackerDice?: number[],
    defenderDice?: number[],
    attackerLosses?: number,
    defenderLosses?: number,
    conqueredTerritory?: string,
    // ...analogous fields for deploy/fortify/trade_cards/place_capital
  }
}
```

This is the "specific outcome" from `GameController.attackRng()`'s return
value and the action method's resulting deltas — not re-derived by each
viewer, but the actual values produced by the one authoritative call.

## Player Game View → `state_snapshot` (new derived shape)

Produced by the new `filterGameStateForSeat(gameState, mapController,
viewerColor): GameState` in `src/controllers/GameStateView.ts`. Same
`GameState` shape as input, with these fields redacted per the rules
recorded in `research.md`:

| Field                | Redaction rule |
|-----------------------|----------------|
| `troops[i].count`, territory ownership (derived via `mapController`) | If `gameState.fogEnabled` and the territory is not in `getVisibleTerritories(viewerColor)`: owner/count hidden (mirrors what `Territories.tsx`/`TerritoryTroops.tsx` already do visually, now applied to the data). |
| `playerCards[color]` for `color !== viewerColor` | Replaced with a same-length array of opaque placeholders (or a count field) — never the real card identities. Always redacted, independent of `fogEnabled`. |
| `deck`                | Cleared/length-only — no player, including the viewer, needs the remaining deck's order. |

Every other field (`currentPlayer`, `currentPhase`, `capitals`, `gameOver`,
`knockoutOrder`, `troopsToDeploy`, `pendingPostConquestMove`, etc.) passes
through unchanged — these are either already public turn-state or apply
identically to all seats.

Delivered:
- After every valid action, once per connected seat (`state_snapshot`).
- On `reconnect`, in place of today's raw `room.gameState` in the
  `game_started`-shaped reconnection payload.

## Player Elimination Notice → `elimination_notice`

```text
{ type: 'elimination_notice', payload: { player: PlayerColor } }
```

Sent only to the connection bound to the seat that was just personally
defeated (FR-011), immediately after the `action_event`/`state_snapshot`
pair for the action that caused it, and before any `game_over` broadcast
that might follow from the same action. Detected by diffing
`gameState.knockoutOrder` before/after the action (013 already records a
knockout entry exactly once per player, on whichever of resignation or
defeat happens first) — 001 only delivers the signal, it does not decide
elimination itself, per the spec's Assumptions.

## Game Over → `game_over`

```text
{ type: 'game_over', payload: { winner?: PlayerColor, standings: PlayerStanding[] } }
```

Broadcast to every connected seat once `gameState.gameOver` transitions to
`true` as a result of a valid action, using `GameController.getWinner()` /
`getStandings()` (013's existing logic) — 001 only delivers it.

## Server-side runtime addition: per-seat in-flight lock

`server/src/rooms/Room.ts`'s `RoomSeat` type gains one field:

```ts
actionInFlight: boolean   // set true for the duration of handling one game action for this seat
```

Not part of any broadcast payload — purely a server-local guard for FR-012.
Reset to `false` on room/seat creation, same as the other seat fields.
