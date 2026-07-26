# Feature Specification: Online Gameplay Protocol

**Feature Branch**: `001-online-game-protocol`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Core online gameplay protocol for RiskJS — real-time deploy/attack/fortify/trade-cards/end-phase actions during an online game, validated authoritatively on the server, with battle outcomes shared live to everyone in the room and each player's own state kept consistent with fog of war. Builds on the existing room/lobby/reconnection system; excludes bot decision-making, turn timers, matchmaking, and accounts (see docs/SPEC.md)."

## Clarifications

### Session 2026-07-25

- Q: If the server process restarts or crashes while an online game is in progress, what should happen to that game? → A: Explicitly out of scope for this spec — crash/restart recovery behavior is left undefined here, to be addressed later if it becomes a problem.
- Q: When two actions for the same seat arrive in rapid succession (e.g. a stale duplicate from a slow network), how should the server decide which one is honored? → A: Single-flight per seat — honor only the first action received for a seat while one is already being validated/applied; reject any other action for that same seat until the first one's outcome has been delivered, using the existing rejection path (FR-002/FR-003).
- Q: What should happen if an action arrives for a seat that's already eliminated, or for a game that has already ended? → A: Reject it via the same existing rejection path as any other illegal action (FR-002/FR-003) — no new mechanism needed.
- Q: If a player disconnects right after submitting an action but before the server finishes validating/applying it, does that in-flight action still complete? → A: Yes — once the server has received the action payload it validates and applies it exactly as if the connection were still open; the sender's connection state has no bearing on processing an already-received action.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Play a turn in an online game (Priority: P1)

A player in an active online game takes their turn — deploying troops, attacking a
territory, fortifying, trading in a card set, or ending their phase — and sees the
result reflected in the game immediately, the same way local pass-and-play already
works today.

**Why this priority**: Without this, "online multiplayer" is only a lobby — no game
can actually be played. This is the minimum slice that makes an online Risk game
functional at all.

**Independent Test**: Start an online game with two connected players, have the
current player submit a legal action (e.g. deploy troops to an owned territory),
and confirm both players' views update to reflect it.

**Acceptance Scenarios**:

1. **Given** it is a player's deploy phase and they own available reinforcements,
   **When** they deploy troops to one of their territories, **Then** that
   territory's troop count increases and it becomes visible to all players
   accordingly.
2. **Given** it is a player's attack phase and they hold a valid attacking
   position, **When** they attack an adjacent enemy territory, **Then** the
   battle is resolved once, troops/ownership update accordingly, and the game
   advances consistently for every connected player.
3. **Given** a player has completed their turn, **When** they end their phase,
   **Then** control passes to the next player in turn order for everyone
   watching.

---

### User Story 2 - Everyone sees the same live battle outcome (Priority: P2)

When one player attacks another, every player connected to that game sees the same
dice roll and battle result at the same time — not just the attacker, and not a
result that differs between viewers.

**Why this priority**: Shared, simultaneous visibility of combat is core to how
Risk is experienced as a group game; a resolution the attacker sees but others
don't (or that arrives inconsistently) breaks trust in the game being fair.

**Independent Test**: With three or more players connected to one game, have one
player attack; confirm all connected players independently observe an identical
battle outcome (same dice values, same territories/troops affected).

**Acceptance Scenarios**:

1. **Given** three players are connected to the same in-progress game, **When**
   one player attacks another, **Then** all three players see the identical
   dice roll and outcome for that attack.
2. **Given** a battle outcome has been shown once, **When** any player's game
   view is later refreshed or resynced, **Then** that specific historical dice
   roll is not re-shown or replayed as if it were a new event.

---

### User Story 3 - Illegal or out-of-turn actions are rejected safely (Priority: P2)

A player attempts an action that isn't currently allowed — acting out of turn,
attacking a non-adjacent territory, moving more troops than they have, or acting
after being eliminated — and the game state does not change for anyone; only the
player who attempted it is told it didn't work.

**Why this priority**: A public online game accepts input from independent
clients that cannot be trusted to only ever send legal moves (buggy client,
modified client, or network replay). Without server-side enforcement, one
player's client bug or bad actor could corrupt the game for everyone.

**Independent Test**: Attempt an action that violates a game rule (e.g. attack
out of turn, attack a non-adjacent territory), and confirm the game state is
unchanged for all players and only the attempting player receives a rejection.

**Acceptance Scenarios**:

1. **Given** it is not a player's turn, **When** they attempt any game action,
   **Then** the action is rejected, no game state changes for anyone, and only
   that player receives an explanation of why.
2. **Given** a player attempts a legal-shaped but rule-violating action (e.g.
   attacking a territory that isn't adjacent to any of their own), **When**
   the action is submitted, **Then** it is rejected the same way, with no
   partial or visible effect to any other player.

---

### User Story 4 - Resume seeing the game correctly after reconnecting (Priority: P3)

A player who was disconnected mid-game (dropped wifi, closed tab) reconnects and
immediately sees the game exactly as it currently stands from their seat's point
of view — not a stale view, and not more information than they're entitled to see.

**Why this priority**: Games run 30-90+ minutes, so disconnects during a game are
expected, not exceptional. This depends on the room/session reconnection already
built for the lobby, extended to cover being reconnected while a game is already
underway.

**Independent Test**: Disconnect a player mid-game, reconnect using their existing
session, and confirm they receive a current, correctly fog-of-war-filtered view
without needing to rejoin or restart.

**Acceptance Scenarios**:

1. **Given** a player disconnects mid-game, **When** they reconnect with their
   existing session, **Then** they receive the game's current state, filtered
   to what their seat is entitled to see, without rejoining the room.
2. **Given** a player reconnects after missing several turns' worth of activity,
   **When** their view is restored, **Then** it reflects the game's current
   state (not a replay of everything that happened while they were away).

---

### User Story 5 - A defeated player is told they're out (Priority: P2)

The moment a player loses their last territory, they are individually and
promptly informed that they've been defeated — independent of whether the
overall game continues for the remaining players.

**Why this priority**: Without this, a defeated player's client has no signal
that their part in the game is over; they would only ever learn indirectly
(e.g. by noticing they can no longer act), which is a poor and confusing
experience. Depends on the same action/outcome delivery mechanism as the
other stories, so it's sequenced after the core turn-action flow but is not
optional polish.

**Independent Test**: Reduce a connected player to zero territories via a
conquest and confirm that specific player receives a personal notification of
their own defeat, distinct from the shared action outcome of the attack that
defeated them and from any later whole-game end notification.

**Acceptance Scenarios**:

1. **Given** a player loses their last territory to another player's attack,
   **When** that capture resolves, **Then** the defeated player individually
   receives notice of their own defeat, separate from the broadcast outcome
   of the attack itself.
2. **Given** a player has been individually defeated but the overall game
   continues for other players, **When** the game later ends for everyone,
   **Then** the already-defeated player's earlier personal notice is not
   confused with or replaced by that later whole-game end notification.

---

### Edge Cases

- If a player disconnects right after the server receives their action but
  before it finishes validating/applying it, the action still completes
  normally — the sender's connection state has no bearing on processing an
  already-received action.
- An action submitted for a seat currently controlled by an eliminated
  player, or for a game that has already ended, is rejected via the same
  path as any other illegal action (FR-002/FR-003) — no separate mechanism.
- When two different actions for the same seat arrive in rapid succession
  (e.g. a slow network delivering a stale duplicate), only the first one
  received is honored — any other action for that same seat is rejected
  (same rejection path as an illegal action) until the first one's outcome
  has been delivered.
- A message that doesn't match any known action type, or is malformed, is
  rejected with a generic error delivered only to the sender; no other
  connected player is notified and game state is unchanged — consistent with
  the rejection path used for illegal/out-of-turn actions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST validate every submitted player action (deploy,
  attack, fortify, trade cards, place capital, resign, end phase) against the
  current game's rules and turn/phase state before applying any effect.
- **FR-002**: System MUST reject any action that violates game rules or is
  submitted out of turn, leaving the game state completely unchanged for all
  players.
- **FR-003**: System MUST inform only the player who submitted a rejected action
  that it was rejected, and why; no other connected player is notified of a
  rejected attempt.
- **FR-004**: System MUST apply each valid action exactly once, updating the
  single canonical game state that all players' views derive from.
- **FR-005**: System MUST share the outcome of every valid action (e.g. dice
  results, troops moved, territory ownership changes, cards drawn) with every
  player connected to that game, so all participants observe the same events.
- **FR-006**: System MUST NOT let players see game state or information their
  seat is not currently entitled to see (fog of war), including in the shared
  outcome of another player's action.
- **FR-007**: System MUST deliver each player their own personalized view of
  the resulting game state after every action, reflecting only what that
  player's seat can currently see.
- **FR-008**: System MUST let a player who reconnects mid-game resume receiving
  their personalized, correctly filtered view of the current game state, without
  requiring them to rejoin the room or restart the game.
- **FR-009**: System MUST treat automated (bot) seats through the identical
  action-submission and outcome-visibility interface used for human seats — no
  action type, validation rule, or visibility rule is specific to whether a
  human or a bot occupies a seat.
- **FR-010**: System MUST notify every connected player when the game reaches
  an end condition (e.g. a winner is determined), so no participant is left
  believing the game is still in progress after it has concluded.
- **FR-011**: System MUST notify a player individually, and promptly, the
  moment they are personally defeated (lose their last territory), independent
  of and prior to any whole-game end notification — a defeated player must not
  be left unaware of their own elimination merely because the overall game
  continues for other players.
- **FR-012**: System MUST process at most one in-flight action per seat at a
  time: while an action for a given seat is being validated/applied, any
  other action arriving for that same seat MUST be rejected via the same
  path as an illegal action (FR-002/FR-003), rather than queued or allowed
  to race the first.

### Key Entities

- **Game Action**: A player's submitted intent to deploy, attack, fortify,
  trade cards, place their capital, resign, or end their phase — identified by
  who submitted it, what type it is, and the parameters needed to evaluate it
  (e.g. source/target territory, troop count, cards selected).
- **Action Outcome**: The result of a validated Game Action (e.g. dice rolled,
  troops moved, territory captured, cards drawn) shared as a single, consistent
  event with every player connected to that game.
- **Player Game View**: A personalized snapshot of the canonical game state as
  seen from one seat, filtered according to that seat's current visibility
  rules (fog of war), delivered after every action and upon reconnection.
- **Player Elimination Notice**: A personal signal delivered only to a player
  the moment they are individually defeated, distinct from and delivered prior
  to any whole-game end notification sent to all remaining participants.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A legal action taken by any player is reflected in every connected
  player's game view within 1 second under normal network conditions.
- **SC-002**: 100% of illegal or out-of-turn action attempts are rejected
  without altering game state for any player, across all action types (deploy,
  attack, fortify, trade cards, place capital, resign, end phase).
- **SC-003**: A reconnecting player regains a fully correct, personalized view
  of the current game within 2 seconds of reconnecting, with no manual steps
  beyond reconnecting.
- **SC-004**: In a game with 3+ connected players, 100% of players observe
  identical battle outcome details (e.g. dice values) for any given attack —
  no player sees a different result than another.
- **SC-005**: A game can be played from start to a completed end condition
  using only automated (bot) seats, with zero seat-type-specific behavior
  required anywhere in the action-handling path.
- **SC-006**: 100% of individually defeated players receive their personal
  elimination notice at the moment they lose their last territory, regardless
  of whether the overall game continues afterward for other players.

## Assumptions

- This feature builds directly on the existing room, session, and reconnection
  infrastructure already delivered for the online lobby (room creation/join,
  roster sync, leave/kill-game); it does not redesign that layer, only extends
  it to cover in-game turn actions once a game has started.
- Bot *decision-making* (what action a bot chooses to take) is out of scope
  here — this feature only guarantees the action/outcome interface itself does
  not assume a human is on the other end of a seat.
- Turn timers and inactivity auto-play, the landing page/matchmaking/lobby
  browser, and the account system are separate, later features and are out of
  scope for this specification.
- The underlying connection transport's basic reliability (message delivery,
  connection lifecycle) is assumed to be handled by the existing connection
  layer built for the lobby system; this feature is scoped to the actions and
  outcomes carried over that connection, not the connection mechanics
  themselves.
- The capital-placement and resign action types (added to FR-001 and the Game
  Action entity) are carried by this protocol but their actual game rules
  (when placement happens, what resigning does to board state, etc.) are
  owned by the separate Capital Mode (012) and Win Conditions & Elimination
  (013) features; this feature is only responsible for validating and
  delivering them like any other action, not defining their rules.
- The personal elimination notice (FR-011, User Story 5) is triggered by the
  defeat/elimination logic owned by feature 013; this feature is only
  responsible for ensuring that signal is delivered to the affected player
  individually and promptly, not for detecting defeat itself.
- Server process restart/crash recovery for an in-progress game (whether
  state survives and is resumable, or the game is simply lost) is explicitly
  out of scope for this specification.
