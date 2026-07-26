# Phase 0 Research: Admin Game Management

## Decision 1: Isolate the unbuilt operator-auth dependency behind one `requireOperator(ctx)` seam

**Decision**: Add `requireOperator(ctx: HandlerContext): void` to
`server/src/handlers/context.ts`, alongside the existing
`requireBoundRoom`/`requireHostRoom` helpers. Every admin handler calls it
first, before touching `RoomStore`. Its real body depends on 006/021's
account/session model, which does not exist in `server/src` yet (confirmed:
no account, no user, no `is_admin` field, no persistence layer anywhere in
the server — `Connection` only carries `socket`/`roomCode`/`seatIndex`,
`SessionStore` only maps a token to `{roomCode, seatIndex}`). Until 006/021
land, `requireOperator` is implemented as an explicitly-named placeholder
(e.g. throws unless a to-be-defined `ctx.operatorAuth` hook says otherwise)
and every test in this feature injects a test double for it.

**Rationale**: FR-009 and the spec's own Assumptions section both already
state this dependency plainly — "023 cannot ship ahead of 006." Rather than
letting that block *this plan* from existing at all, isolating it behind
one function means the room-listing, duration-tracking, end-action, and
distinct-notice work (all of which are genuinely buildable today against
existing `RoomStore`/`Room`/`closeRoom` code) can proceed now, with a
single, obvious, well-named integration point for 006/021 to fill in later
— rather than that gap being rediscovered ad hoc inside every handler.

**Alternatives considered**: Write no plan/tasks for 023 until 006/021 ship.
Rejected — most of this feature's substance (listing, duration, the end
action, the notice-suppression rule) has zero dependency on account/auth
internals and can be fully built and tested now; only the literal
authorization check is blocked. Blocking the whole feature on that one
check would waste the otherwise-ready runway.

## Decision 2: Reuse `closeRoom` for teardown; add the operator-specific notice as a step before it, not a parallel path

**Decision**: `adminEndGame.ts` first sends `operator_game_ended` to every
seat *not* present in `gameState.knockoutOrder` (per FR-010), then calls
the existing `closeRoom(ctx, room, 'operator_ended')` unchanged.

**Rationale**: `closeRoom` (`server/src/handlers/closeRoom.ts`) already
does exactly what FR-004/SC-002 need — revoke every seat's session, unbind
every connection, delete the room from `RoomStore` — because that's the
same "free the room's slot" work a normal game conclusion needs too. There
is no separate "capacity accounting" call to make: research into feature
004 (`specs/004-room-limits-abuse-protection/spec.md`) confirms capacity is
counted purely as "does the room still exist in the store," not a separate
release API — so reusing `closeRoom` verbatim already satisfies FR-004/
SC-002 with no new capacity-specific code. The one genuinely new piece is
the notice, which must go out *before* teardown (so still-connected,
non-eliminated seats receive it) and must be computed per-seat rather than
via `Room.broadcast()`'s blanket send, because FR-010 requires skipping
specific seats.

**Alternatives considered**: Add a `reason` parameter to `room_closed`
itself and let clients distinguish "operator ended it" from "host closed
the lobby" by checking the reason string. Rejected — `room_closed` today
is a lobby-phase message (sent when a lobby, not necessarily a started
game, closes); conflating it with an in-game operator override blurs a
distinction FR-007 explicitly requires staying clear ("normal conclusion...
never confused with an operator-initiated end"). A separate,
purpose-named `operator_game_ended` message is unambiguous by construction.

## Decision 3: New `RoomStore.listStartedRooms()` and `Room.startedAt`

**Decision**: Add `listStartedRooms(): Room[]` to `RoomStore` (filters the
internal `Map`'s values by `status === 'started'`) and a new
`startedAt?: number` field on `Room`, set once when `status` transitions to
`'started'` (in whichever 001-era handler flips that transition — today
that's `handleStartGame`).

**Rationale**: `RoomStore` currently exposes no enumeration at all
(`createRoom`/`getRoom`/`deleteRoom`/`sweepAbandoned` only) — FR-001
requires listing every in-progress game, so some enumeration must be added
regardless. `Room` already has `createdAt` (lobby-creation time) but no
game-start time; using `createdAt` for FR-002's "how long it's been
running" would overstate duration for a room that sat in its lobby a while
before starting. `startedAt` gives an accurate, purpose-built duration
source at negligible cost (one field, one assignment).

**Alternatives considered**: Derive "duration" from `createdAt` since it
already exists. Rejected for the reason above — it's available now with
zero new fields, but is measuring the wrong thing once a room spends
meaningful time in its lobby before starting.

## Decision 4: No shared "admin operator shell" entity — each admin feature (021/022/023) defines its own view independently

**Decision**: This feature does not introduce or depend on any shared
admin-page/route/layout concept. Its Key Entity (Game Management View) is
its own, exactly as 021's Account Lookup Result and 022's Lobby Management
View are each their own.

**Rationale**: Reading 021 and 022's specs confirms neither defines nor
expects a shared operator-shell component — each independently states
"reachable only by the operator" and leaves *how* as an implementation
detail. Inventing a shared shell here would be scope creep beyond what any
of the three specs actually calls for, and would need to be retrofitted
into 021/022 to be consistent, which is out of this feature's scope.

**Alternatives considered**: Design a shared `AdminContext`/admin-route
wrapper now, anticipating 021/022 will want it too. Rejected — no spec
currently calls for it, and building shared infrastructure ahead of a
concrete second consumer risks guessing wrong about its shape.
