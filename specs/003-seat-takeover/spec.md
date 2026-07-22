# Feature Specification: Seat Takeover on Disconnect & Inactivity

**Feature Branch**: `003-seat-takeover`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Disconnect and turn-timer seat takeover for RiskJS online games — a single automated-takeover mechanism with two trigger conditions: a mid-game disconnect (grace period, then bot takeover, reclaimed on reconnect) and repeated turn-timer timeouts (first timeout auto-plays one turn only, repeated timeouts escalate to the same persistent bot takeover). Depends on the already-specified Bot AI (Easy tier) and core gameplay protocol features. Excludes bot decision logic itself, pre-game lobby disconnect handling, and the existing session/reconnection token mechanism."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A dropped connection doesn't stall the game for everyone else (Priority: P1)

A player's connection drops mid-game. The game briefly pauses for that seat, but
after a short grace period, an automated stand-in takes over that seat so the
other players can keep playing without waiting indefinitely.

**Why this priority**: This is the core retention problem the whole feature
exists to solve — games run long enough that disconnects are routine, and one
person's dropped wifi ending the game for everyone else is the single biggest
risk to the product being worth playing.

**Independent Test**: Disconnect one player's client mid-game, wait past the
grace period without reconnecting, and confirm the game continues with that
seat now taking automated turns while other players remain unaffected.

**Acceptance Scenarios**:

1. **Given** a player's connection drops during an in-progress game, **When**
   the grace period elapses without them reconnecting, **Then** their seat
   begins taking automated turns and the game continues normally for all other
   players.
2. **Given** a player's connection drops, **When** they reconnect within the
   grace period, **Then** their seat never becomes automated and they resume
   control exactly where they left off.

---

### User Story 2 - A disconnected player can reclaim their seat (Priority: P1)

A player whose seat was handed to an automated stand-in after a disconnect
reconnects later in the game, and immediately regains full control of their
seat from that point onward.

**Why this priority**: Automated takeover without a path back defeats the
purpose — players who step away temporarily (not permanently) must not
permanently lose their seat to a bot. This closes the loop that makes takeover
acceptable rather than punitive.

**Independent Test**: Let a seat go through disconnect-triggered takeover, then
reconnect that player, and confirm they regain full control on their very next
decision point with no residual automated behavior.

**Acceptance Scenarios**:

1. **Given** a seat is currently under automated control due to an earlier
   disconnect, **When** the original player reconnects with their existing
   session, **Then** control returns to them immediately and no further
   automated actions are taken for that seat.
2. **Given** a player reclaims their seat mid-turn (i.e. their seat's turn was
   already in progress when they reconnected), **When** they resume control,
   **Then** they can complete any remaining phases of that turn themselves.

---

### User Story 3 - One slow turn doesn't cost a connected player their seat (Priority: P2)

A player is still connected but takes too long to act on their turn. The system
auto-plays that single turn for them and immediately hands control back — it
does not treat one slow turn as a reason to take over the seat long-term.

**Why this priority**: Distinct from disconnects — this handles a *connected*
but idle player, and its leniency (auto-play one turn only) is intentional so
normal distraction or thinking time isn't punished the same way as an actual
dropped connection.

**Independent Test**: Let a connected player's per-turn timer expire once
without disconnecting, and confirm exactly one turn is auto-played, after which
the player retains normal control for their next turn.

**Acceptance Scenarios**:

1. **Given** a connected player's turn timer expires for the first time,
   **When** the timeout is reached, **Then** that single turn is auto-played
   on their behalf and control returns to them for their next turn.
2. **Given** a player's turn was just auto-played due to a single timeout,
   **When** their next turn begins, **Then** they retain full manual control
   unless they time out again.

---

### User Story 4 - Repeated inactivity escalates to the same takeover as a disconnect (Priority: P2)

A connected player repeatedly lets their turn timer expire without acting. After
enough consecutive timeouts, their seat is handed to the same persistent
automated takeover used for disconnects, rather than continuing to auto-play
individual turns indefinitely.

**Why this priority**: Closes the gap where a technically-connected-but-fully-AFK
player would otherwise stall the game forever by never formally disconnecting —
the retention problem from User Story 1 applies here too, just via a different
trigger.

**Independent Test**: Let a connected player's turn timer expire multiple
consecutive times, and confirm that after the defined threshold, the seat
transitions to the same ongoing automated control used for disconnects (not
just another single auto-played turn).

**Acceptance Scenarios**:

1. **Given** a connected player has let their turn timer expire multiple
   consecutive times, **When** the escalation threshold is reached, **Then**
   their seat is handed to ongoing automated control exactly as it would be
   for a disconnect.
2. **Given** a seat has escalated to ongoing automated control due to repeated
   timeouts, **When** the original player takes any action again, **Then**
   they reclaim their seat immediately, the same way reconnecting after a
   disconnect does.

---

### Edge Cases

- What happens if a player reconnects at the exact moment their grace period
  expires and takeover is about to begin — do they keep control, or does the
  takeover still briefly occur?
- How does the system handle a player who reconnects, takes one action, and
  then disconnects again shortly after — does a new grace period start, or
  does it resume/accumulate from before?
- What happens to a player's consecutive-timeout count once they successfully
  act on time — is it reset immediately, and does that reset also apply after
  reclaiming a seat from disconnect-based takeover?
- How does the system handle a seat being eliminated (loses all territories)
  while it is currently under automated control?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect when a connected player's connection drops
  during an in-progress game and begin a grace period for that seat rather
  than immediately handing it to automated control.
- **FR-002**: System MUST hand a disconnected seat to automated control once
  its grace period elapses without the player reconnecting, so the game is not
  blocked waiting on that seat.
- **FR-003**: System MUST return full control of a seat to its original player
  immediately upon reconnection, whether the seat was mid-grace-period or
  already under automated control, with no further automated actions taken
  for that seat afterward.
- **FR-004**: System MUST apply a per-turn time limit to every seat in an
  online game, independent of connection status.
- **FR-005**: On a connected player's first turn-timer expiration, system MUST
  auto-play only that single turn on their behalf and MUST return full manual
  control to them for their subsequent turn.
- **FR-006**: System MUST track consecutive turn-timer expirations for a
  connected player and, once a defined threshold is reached, MUST hand that
  seat to the same ongoing automated control used for disconnects (not merely
  auto-play another single turn).
- **FR-007**: System MUST reset a player's consecutive-timeout count once they
  act within their turn's time limit, so an isolated slow turn does not
  contribute toward escalation indefinitely.
- **FR-008**: A seat under automated control by either trigger (disconnect
  grace-period expiration or repeated timeout escalation) MUST be handed back
  to the original player through the identical reclaim behavior — there is
  only one takeover/reclaim mechanism regardless of which condition triggered
  it.
- **FR-009**: System MUST NOT apply any of this takeover/timeout behavior
  before a game has started (i.e. during lobby/room formation) — it applies
  only to seats in an in-progress game.
- **FR-010**: The automated control used by any takeover under this feature
  MUST behave consistently regardless of the seat's originally configured
  difficulty setting, so takeover always keeps the game moving at a
  predictable pace.

### Key Entities

- **Seat Connection Status**: Whether a seat's controlling player is currently
  connected, disconnected-within-grace-period, or has had control handed to
  automated play due to disconnect.
- **Turn Timer State**: The per-seat, per-turn countdown and its consecutive-
  expiration count, tracked independently of connection status.
- **Takeover State**: Whether a seat is currently under automated control, and
  which condition (disconnect grace-period expiry, or timeout escalation)
  most recently caused it — used only to know reclaim behavior is uniform, not
  to alter it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of mid-game disconnects result in the affected seat
  continuing to take turns (via automated control) rather than blocking game
  progress indefinitely, once the grace period has elapsed.
- **SC-002**: 100% of players who reconnect (whether during the grace period
  or after automated takeover has begun) regain full control of their seat
  within the same session, with zero manual recovery steps beyond reconnecting.
- **SC-003**: A single isolated slow turn never results in a player losing
  standing control of their seat — only repeated, consecutive timeouts trigger
  escalation to ongoing automated control.
- **SC-004**: Games with at least one disconnected or persistently idle seat
  still reach a normal conclusion (win or elimination sequence) rather than
  stalling, in effectively all cases where takeover has activated.
- **SC-005**: From a co-player's perspective, an automated-takeover seat's pace
  of play is indistinguishable in speed from a normally-paced human turn — no
  player experiences the game visibly hanging on a taken-over seat.

## Assumptions

- The exact grace-period duration before disconnect-triggered takeover
  (~2-5 minutes per docs/SPEC.md), the exact per-turn timer duration, and the
  exact number of consecutive timeouts (N) required to escalate are
  implementation details to be chosen during planning, not scope decisions —
  this spec intentionally does not fix those numbers.
- This feature assumes the Bot AI feature's Easy-tier behavior already exists
  and is usable as a drop-in controller for any seat; it does not re-specify
  that decision logic.
- This feature assumes the core gameplay protocol (turn/phase structure,
  per-player state delivery) already exists; it only adds the automated-control
  and timing behavior layered on top of that protocol.
- Pre-game (lobby) disconnect handling is out of scope — the existing lobby
  roster-sync behavior (built with the room/lobby feature) already covers a
  disconnect before a game has started.
- The existing session/reconnection token mechanism (built with the room/lobby
  feature) is assumed to already correctly identify a reconnecting player back
  to their seat; this feature only adds what happens automatically in the time
  before that reconnection occurs.
