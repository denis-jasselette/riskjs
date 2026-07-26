# Phase 0 Research: Online Gameplay Protocol

No unknowns were marked `NEEDS CLARIFICATION` in the Technical Context — the
four `/speckit-clarify` questions already resolved the open architectural
decisions (crash recovery, duplicate actions, stale-seat actions, mid-action
disconnects). This phase instead records the concrete design decisions made
by reading the existing code the feature builds on, since none of this was
written down anywhere before now (the original `docs/SPEC.md` source
document was deleted once its content was split into `specs/`).

## Decision: Reuse `GameController` server-side exactly as the client does

**Decision**: Each action handler constructs a fresh `GameController` from
`room.gameState`, calls the one action method, and replaces `room.gameState`
with the controller's returned `.gameState` — the identical pattern
`src/components/Game.tsx` already uses locally (e.g.
`setGameState(gameController.deploy(amount, territory).gameState)`).

**Rationale**: `GameController`'s constructor does `this.gameState = {
...gameState }` — a **shallow** copy. Reassigning a top-level field (e.g.
`currentPlayer`, `troopsToDeploy`) on `this.gameState` only changes the
controller's local copy, not the object passed in. Calling
`controller.deploy(...)` and then assuming `room.gameState` itself changed
would silently do nothing — this is a real gotcha specific to this
codebase's existing controller, not a hypothetical one. The client already
gets this right by always re-assigning from `.gameState` after every call;
the server must follow the identical convention.

**Alternatives considered**: Reimplementing turn/attack/fortify logic
server-side against a plain data model — rejected outright; it would
duplicate `GameController`'s already-tested rules engine (the constitution
flags `GameController` as load-bearing) and risk the two copies drifting.

## Decision: A new shared filter function, not client-trust, enforces fog of war

**Decision**: Add `filterGameStateForSeat(gameState, mapController,
viewerColor): GameState` in `src/controllers/GameStateView.ts`. The server
calls it once per connected seat after every valid action and on
reconnection, and sends each seat only its own filtered copy as
`state_snapshot` — never the raw `room.gameState`.

**Rationale**: Reading `src/components/board/Territories.tsx` and
`TerritoryTroops.tsx` (feature 011's fog-of-war implementation) shows fog of
war today is enforced **only at render time** — each component checks
`gameState.fogEnabled` and `mapController.getVisibleTerritories(viewingPlayer)`
to decide whether to draw troop count/owner color, but the underlying
`GameState` object handed to the component already contains everyone's
data. That's a safe boundary for local pass-and-play (one trusted process,
one shared screen) but not for an authoritative online server: today's
`handleStartGame`/`handleReconnect` already broadcast the *entire*
`room.gameState` — including `playerCards` (every player's actual hand,
always, regardless of fog-of-war setting) and `deck` (remaining card order)
— to every connection. A curious or modified client reading its own
WebSocket traffic would see all of that regardless of what the UI chooses to
render. FR-006 ("MUST NOT let players see game state... not entitled to
see") cannot be satisfied by a render-time convention once the client is no
longer trusted.

**What the filter must redact**:
1. **Fog-of-war-conditional** (only when `gameState.fogEnabled`): troop
   count and owner for territories outside
   `mapController.getVisibleTerritories(viewerColor)` — same rule
   `Territories.tsx`/`TerritoryTroops.tsx` already apply visually, now
   applied to the data itself.
2. **Always secret, regardless of fog-of-war setting**: every other
   player's actual `playerCards` entries (replace with a count only) and
   the `deck` array's contents/order (opponents' and the viewer's own —
   nobody should be able to infer upcoming card order from a raw snapshot).

**Alternatives considered**: Keep shipping full `GameState` and rely on the
client not to render hidden data — rejected; that's exactly the trust
assumption an authoritative-server design (User Story 3) exists to remove.
Filtering `troops`/`playerCards` inline in each handler instead of a shared
function — rejected; every handler needs the identical redaction rules per
connected seat, so a shared pure function avoids duplicating (and drifting)
that logic across `deploy.ts`, `attack.ts`, etc.

## Decision: "Two pushes per action" — `action_event` (shared) + `state_snapshot` (per-seat)

**Decision**: A valid action produces exactly two kinds of server message:
one `action_event` broadcast identically to every connected seat in the
room (dice values, territories/troops affected — the specific outcome per
User Story 2), and one `state_snapshot` computed individually per seat via
`filterGameStateForSeat` and sent only to that seat's connection.

**Rationale**: A single "broadcast the new state" model would lose the
transient dice-roll/outcome details that already exist in local play (shown
once, not persisted anywhere in `GameState`) — SC-004 requires every
connected player to see the *identical* dice values for the same attack,
which only works if that specific event is broadcast verbatim rather than
re-derived per viewer from a state diff. Splitting shared-event vs.
per-seat-view cleanly separates "what happened" (same for everyone) from
"what you're allowed to see now" (different per seat).

**Alternatives considered**: Single per-seat combined message carrying both
outcome and snapshot — rejected; it still needs the outcome payload
broadcast unfiltered (dice values aren't seat-specific secrets) and a
combined message would either leak the redaction logic into every outcome
field or force the outcome itself to be duplicated identically N times
instead of broadcast once.

## Decision: Single-flight-per-seat via a lock flag on `Room`, no sequence numbers

**Decision**: Add an `actionInFlight: boolean` (or similar) per seat on the
existing `RoomSeat` type. A handler sets it before calling into
`GameController` and clears it after broadcasting the result; any action
arriving for a seat while its flag is set is rejected via the existing
`error` path (FR-012).

**Rationale**: Matches the clarified answer directly and needs no protocol
change (no client-generated sequence numbers) — consistent with keeping the
message shapes as close to the existing lobby protocol's style as possible.
Since action handling is synchronous (no `await` between validating and
applying against in-memory state), the flag's window is effectively just
"currently executing this handler," which is enough to satisfy the
clarified requirement without over-engineering a queue.

**Alternatives considered**: Client-supplied sequence numbers — rejected,
adds protocol surface with no corresponding requirement; single-flight
already gives exactly-once-per-seat processing.
