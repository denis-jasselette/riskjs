# Feature Specification: Admin Game Management

**Feature Branch**: `023-admin-game-management`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Admin: Game Management for RiskJS — an operator-only interface to see every currently in-progress online game and manually end a specific one, as a blunt operational override for exceptional situations (stuck games, maintenance, abuse), distinct from the normal win/elimination/ranking flow (013). Ended-by-operator players are clearly told the game was ended by an operator, not that someone won. Resources are freed the same as a normally-concluded game, per 004's capacity accounting. Depends on 001 and 013 for underlying game data and normal resource-freeing behavior; does not change normal win conditions or ranking. Excludes admin lobby/account management and any broader moderation workflow."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See every in-progress game (Priority: P1)

The operator can view a list of every currently in-progress online game,
with enough detail — players, mode/settings, how long it's been running —
to understand what's happening in each one.

**Why this priority**: Visibility is the precondition for the operator ever
choosing to intervene — without seeing what's running, there's nothing to
act on.

**Independent Test**: With multiple online games in progress, confirm the
operator's view lists every one of them with accurate player, mode/settings,
and duration information.

**Acceptance Scenarios**:

1. **Given** one or more online games are currently in progress, **When**
   the operator views the game management interface, **Then** they see
   every in-progress game, with its players, mode/settings, and how long
   it's been running.
2. **Given** a game concludes (normally or by operator action), **When** the
   operator next views the interface, **Then** that game no longer appears
   in the list.

---

### User Story 2 - Manually end a game as an operator override (Priority: P1)

The operator can end a specific in-progress game immediately, as a blunt
operational tool for exceptional situations — distinct from the game ending
through a normal win, elimination cascade, or resignation.

**Why this priority**: This is the actual point of the feature — the
visibility from User Story 1 exists to support this action. Equal priority
since visibility alone provides no operational remedy without it.

**Independent Test**: As the operator, manually end an in-progress game and
confirm it terminates immediately, its resources are freed the same way a
normally-concluded game's would be, and every still-connected player is
clearly told the game was ended by an operator rather than concluded by a
normal win.

**Acceptance Scenarios**:

1. **Given** the operator selects an in-progress game to end, **When** they
   confirm the action, **Then** that game terminates immediately, regardless
   of its current state.
2. **Given** an operator ends a game, **When** its resources are accounted
   for, **Then** it stops contributing to server capacity the same way a
   normally-concluded game would, per the existing capacity rules.
3. **Given** an operator ends a game, **When** any still-connected player in
   that game is notified, **Then** they are clearly told the game was ended
   by an operator, distinctly from a normal win notification, so they are
   not confused about what happened.
4. **Given** a game ends normally (a win condition is met, or the last
   active player resigns), **When** that happens, **Then** it is not treated
   as or confused with an operator-initiated end — the two remain clearly
   distinct outcomes.

---

### Edge Cases

- What happens if the operator attempts to end a game at the same moment it
  concludes normally on its own (e.g. a winning move happens simultaneously)
  — does the operator action simply have no additional effect once the game
  has already ended?
- How does ending a game interact with a defeated/eliminated player's
  already-shown personal elimination notice — does an operator-ended game
  still show correctly to a player who was already eliminated before the
  operator intervened?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an interface, reachable only by the
  operator, listing every currently in-progress online game.
- **FR-002**: The game list MUST show each game's players, mode/settings,
  and how long it has been running.
- **FR-003**: System MUST let the operator manually end any specific
  in-progress game immediately.
- **FR-004**: A manually ended game MUST free its resources (server
  capacity accounting) the same way a normally-concluded game's resources
  are freed.
- **FR-005**: System MUST inform every still-connected player in a manually
  ended game that it was ended by an operator, distinctly from a normal win
  notification.
- **FR-006**: System MUST NOT alter or interfere with the normal win
  condition, elimination, resignation, or ranking flow for games the
  operator does not act on.
- **FR-007**: System MUST NOT treat a normal game conclusion (win or
  last-player resignation) as or confuse it with an operator-initiated end.
- **FR-008**: System MUST NOT make this interface reachable by any player
  who is not the operator.

### Key Entities

- **Game Management View**: The operator's list of every currently
  in-progress online game, with enough detail to identify and act on each.
- **Operator-Initiated Game End**: A blunt override that immediately
  terminates a specific in-progress game outside the normal win/elimination/
  resignation flow, freeing its resources the same way a normal conclusion
  would, and clearly distinguished from a normal win for affected players.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of currently in-progress online games appear in the
  operator's game management view with accurate details.
- **SC-002**: 100% of operator-initiated game endings free that game's
  server capacity contribution immediately, the same as a normal conclusion.
- **SC-003**: 100% of still-connected players in an operator-ended game are
  clearly told it was ended by an operator, distinguishable from a normal
  win notification.
- **SC-004**: 0% of ordinary (non-operator) players can reach this
  interface.
- **SC-005**: 0% of normal game conclusions (win, or last-player
  resignation) are altered or confused with an operator-initiated end.

## Assumptions

- This is a single-operator context, consistent with the other admin
  features and the project's established single-person, self-hosted
  hobby-project philosophy.
- This feature depends on the existing online gameplay protocol (001) and
  Win Conditions & Elimination feature (013) for the underlying game data it
  displays and for how a normal conclusion frees resources; it does not
  change the normal win/elimination/ranking flow, only adds an operator
  override on top of it.
- This tool is intended for exceptional operational situations (a stuck
  game, server maintenance, an abuse case in coordination with account-level
  action from feature 021) — it is not part of, and does not replace, any
  normal gameplay outcome.
- Admin management of lobbies (022) and user accounts (021) are separate,
  already-specified features and out of scope here; this feature covers only
  in-progress games.
