# Contract: `decideAction` — the Bot Decision interface

This is not a wire protocol (unlike feature 001) — it's the internal
function boundary between the decision engine (`src/bots/`) and every
consumer that drives a bot seat's turn: today, `Game.tsx` for local
pass-and-play; in the future, a server-side bot driver once feature 001 is
implemented.

## Signature

```ts
function decideAction(
  gameState: GameState,
  mapController: MapController,
  player: string,
): BotDecision | null
```

- `gameState` — the current canonical state. `decideAction` never mutates
  it and never calls any `GameController` mutator itself — it only reads
  and returns a description of the intended action. Applying the action
  (calling the matching `GameController` method and committing the result)
  is the caller's responsibility, exactly as it already is for a human
  action originating from a UI click.
- `mapController` — a `MapController` constructed over the same
  `gameState`, used for every visibility/adjacency/continent query (see
  data-model.md's Fog-of-war input surface).
- `player` — the color/seat to decide for. Caller is responsible for only
  invoking this when it is actually that player's turn
  (`gameState.currentPlayer === player`) and that seat is bot-controlled
  (`playerConfigs.find(...).human === false`) — `decideAction` does not
  re-check either condition itself.

## Return value

- `null` — `player`'s `PlayerConfig` has no `botSkill` set (not actually a
  configured bot seat). Caller should not have invoked this; treated as a
  no-op if it happens.
- A concrete `BotDecision` (see data-model.md) — always exactly one action,
  matching the *current* `gameState.currentPhase` (or the
  `pendingPostConquestMove`/`capitalDeploy` special cases that take
  precedence over phase, per data-model.md's precedence list).

## Guarantees

- **Always legal** (SC-001): the returned `BotDecision`, when applied via
  the matching `GameController` method, never fails that method's own
  legality checks (`isSelectable`/`isAttackAllowed`/`isFortifyAllowed`/etc.)
  — `decideAction` only ever returns actions it has already confirmed are
  legal via `BotUtils`'s enumeration helpers.
- **Never stalls** (FR-012, SC-002): `decideAction` always returns a usable
  `BotDecision` for a configured bot seat — internal errors, unexpected
  state, or an agent exceeding its own decision budget are caught inside
  `decideAction` and converted to the safe-default fallback
  (`{ type: 'end_phase' }` or the phase-appropriate no-op equivalent), never
  propagated as a thrown exception to the caller.
- **Fog-respecting** (FR-005): never reflects information about a
  territory outside `mapController.getVisibleTerritories(player)`, or
  another player's actual card identities.
- **Deterministic given deterministic inputs, for Medium**: `HeuristicBotAgent`
  performs one deterministic evaluation pass with no randomness — the same
  `gameState/player` always yields the same decision. `RandomBotAgent`
  (Easy) is intentionally non-deterministic (uniform-random legal choice).

## Out of scope for this contract

- *When* `decideAction` gets called for a given seat/turn (that's the
  caller's turn-loop responsibility — `Game.tsx`'s new effect today; a
  future server-side driver once 001 exists).
- *How* a seat becomes bot-controlled in the first place (disconnect/timeout
  takeover, empty-seat filling) — separate, later features per this
  feature's own Assumptions.
- Hard/Expert tiers and any search/lookahead-based evaluation.
