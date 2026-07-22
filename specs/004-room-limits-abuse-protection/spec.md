# Feature Specification: Room Lifecycle Limits & Abuse Protection

**Feature Branch**: `004-room-limits-abuse-protection`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Room lifecycle limits and abuse protection for RiskJS online games — auto-close abandoned open lobbies after 15 minutes, enforce a hard global ceiling of 10 combined in-progress games + open lobbies (rejecting new room creation above it), and lightweight per-IP rate limiting on room creation and join attempts, to protect a single always-on self-hosted machine's memory/connections/compute from accumulation and abuse. Independent of Bot AI, seat takeover, and the gameplay protocol. Excludes moderation/kick tooling, CAPTCHA/WAF, and anything about in-game actions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abandoned lobbies free themselves up automatically (Priority: P1)

A host creates a room but never starts the game (they leave, forget about it, or
everyone drifts away before playing). That lobby doesn't sit open forever — it
closes on its own after a bounded amount of time, freeing its room code and
resources for others.

**Why this priority**: On a single always-on machine with finite memory, every
abandoned lobby that never closes is a permanent resource leak. This is the
most basic hygiene the room system needs to run unattended for a public
audience.

**Independent Test**: Create a lobby, do not start the game, wait past the
auto-close window, and confirm the lobby no longer exists and its room code is
free to be reused.

**Acceptance Scenarios**:

1. **Given** an open lobby has not had its game started, **When** 15 minutes
   have elapsed since it opened, **Then** the lobby automatically closes and
   its resources are freed.
2. **Given** a lobby's host starts the game before the auto-close window
   elapses, **When** the game begins, **Then** the lobby is no longer subject
   to lobby auto-close (it's now an in-progress game, governed by normal game
   lifecycle instead).

---

### User Story 2 - The server protects itself from being overloaded (Priority: P1)

At any given time, only a bounded number of games and lobbies can exist at
once. If that limit is reached, a new player trying to create a room is told
outright that they can't right now, rather than the server accepting
unbounded load.

**Why this priority**: This is the hard backstop that keeps the single hosting
machine from being overwhelmed, independent of whether load comes from
legitimate popularity or abuse — without it, any other protection is moot once
capacity is actually exceeded.

**Independent Test**: Fill the server up to its combined games+lobbies ceiling,
attempt to create one more room, and confirm the creation attempt is rejected
outright (not queued, not delayed) with a clear reason; then free up capacity
and confirm creation succeeds again.

**Acceptance Scenarios**:

1. **Given** the number of in-progress games plus open lobbies is already at
   the defined ceiling, **When** a new room-creation attempt is made, **Then**
   it is rejected immediately with a clear explanation, and no new room is
   created.
2. **Given** the server is at its ceiling, **When** an existing game ends or
   an existing lobby closes (whether by auto-close or normally), **Then** room
   creation becomes available again for the next attempt.

---

### User Story 3 - One source can't spam room creation or gatecrash a game (Priority: P2)

A single source (e.g. one IP address) attempting to rapidly create many rooms,
or rapidly guess/brute-force a room code to join someone else's game, is slowed
down or blocked well before it can succeed at either.

**Why this priority**: Distinct from the capacity ceiling above — this protects
against a single bad actor's behavior specifically (mass room creation or
code-guessing), rather than protecting the whole machine from aggregate load.
Both matter, but this one specifically preserves fairness/privacy for a room's
intended participants.

**Independent Test**: From a single source, rapidly attempt many room
creations in a short window, and confirm requests beyond a defined threshold
are rejected; separately, rapidly attempt many join attempts with guessed room
codes from a single source, and confirm the same throttling applies.

**Acceptance Scenarios**:

1. **Given** a single source has made room-creation attempts at a rate beyond
   the defined threshold, **When** it attempts another room creation, **Then**
   that attempt is rejected until the rate limit window resets, without
   affecting other sources' ability to create rooms.
2. **Given** a single source has made join attempts at a rate beyond the
   defined threshold, **When** it attempts another join, **Then** that attempt
   is rejected until the rate limit window resets, without affecting other
   sources' ability to join rooms.
3. **Given** a source is currently rate-limited on one action (e.g. room
   creation), **When** it attempts the other action (e.g. joining a room),
   **Then** that other action is evaluated independently and is not blocked
   by the first action's limit.

---

### Edge Cases

- What happens when a lobby's 15-minute auto-close window and the global
  capacity ceiling both apply at once — does auto-closing an idle lobby free
  capacity correctly for a waiting room-creation attempt?
- How does the system handle a lobby where the host disconnects but other
  players remain connected, with respect to the 15-minute auto-close window —
  does it still auto-close regardless of other connected players, since the
  host never started the game?
- What happens to a rate-limited source's legitimate retry after the rate
  limit window has fully elapsed — is access restored automatically without
  manual intervention?
- How does the system distinguish a legitimate player who mistyped a room code
  a few times from an actual brute-force attempt, given both look like
  repeated failed join attempts from one source?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST automatically close any open lobby whose game has
  not been started within 15 minutes of the lobby opening, freeing its
  resources and room code.
- **FR-002**: System MUST NOT apply lobby auto-close to a room once its game
  has started — auto-close only applies to pre-game lobbies.
- **FR-003**: System MUST enforce a fixed combined maximum of in-progress
  games plus open lobbies at any time.
- **FR-004**: System MUST reject any room-creation attempt outright, with a
  clear reason, whenever the combined games+lobbies ceiling is already reached
  — it MUST NOT queue, delay, or silently drop the attempt instead.
- **FR-005**: System MUST make room creation available again as soon as the
  combined count drops back below the ceiling, whether that reduction comes
  from a game ending or a lobby closing (auto-close or otherwise).
- **FR-006**: System MUST apply a per-source rate limit to room-creation
  attempts, independent of the global capacity ceiling, rejecting attempts
  that exceed the limit within its time window.
- **FR-007**: System MUST apply a per-source rate limit to room-join attempts,
  separately from the room-creation rate limit, rejecting attempts that
  exceed the limit within its time window.
- **FR-008**: Rate limiting on one action (room creation or join attempts) for
  a given source MUST NOT block that same source's attempts at the other
  action.
- **FR-009**: System MUST restore a rate-limited source's ability to act
  automatically once its rate-limit window has elapsed, without requiring any
  manual intervention.
- **FR-010**: System MUST NOT require any additional interactive verification
  (e.g. a challenge/puzzle) for room creation or joining beyond the rate
  limiting itself.

### Key Entities

- **Lobby Lifetime**: The elapsed-open-time tracking for a not-yet-started
  room, used to determine eligibility for auto-close.
- **Server Capacity Count**: The current combined total of in-progress games
  and open lobbies, checked against the fixed ceiling on every room-creation
  attempt.
- **Per-Source Rate Limit State**: Independent counters (one for room
  creation, one for join attempts) tracked per requesting source, each with
  its own threshold and time window.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of open lobbies that never start a game are automatically
  closed within a bounded time (15 minutes) of opening, with no manual
  cleanup required.
- **SC-002**: 0% of room-creation attempts succeed while the server is at its
  combined games+lobbies ceiling; 100% succeed again (capacity permitting)
  immediately after the count drops below it.
- **SC-003**: A single source attempting rapid, repeated room creation is
  blocked from creating more than the allowed number within the rate-limit
  window, in 100% of tested attempts.
- **SC-004**: A single source attempting rapid, repeated room-code join
  guesses is blocked from exceeding the allowed number of attempts within the
  rate-limit window, in 100% of tested attempts, making brute-forcing a
  4-character room code impractical within any realistic timeframe.
- **SC-005**: Legitimate players who are not exhibiting rapid repeated
  behavior experience zero impact from either rate limit under normal use.

## Assumptions

- The specific ceiling value (10 combined games+lobbies), the exact rate-limit
  thresholds and time windows for room creation and joins, and the 15-minute
  lobby auto-close duration are the values already settled in docs/SPEC.md;
  they are treated as fixed initial values here, explicitly expected to be
  revisited later once real usage/load data exists (per the spec's own open
  questions) rather than re-derived in this spec.
- "Source" for rate-limiting purposes is the requester's IP address, per
  docs/SPEC.md's "per-IP rate limiting" — no additional identity system (e.g.
  accounts) exists yet to rate-limit by any other identity.
- This feature builds on top of the already-existing room/lobby management
  system (creation, joining, roster sync) and only adds lifecycle limits and
  request throttling to it; it does not change how rooms function once
  created.
- Moderation capabilities (e.g. manually closing or kicking from a room) are
  explicitly out of scope, consistent with the project's "no moderation
  pipeline" non-goal for v1.
- CAPTCHA, WAF, or other heavier anti-abuse infrastructure are explicitly
  rejected in favor of the lightweight in-app rate limiting described here,
  consistent with the project's minimal, single-machine hosting approach.
