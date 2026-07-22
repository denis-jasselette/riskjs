# Feature Specification: Admin Lobby Management

**Feature Branch**: `022-admin-lobby-management`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Admin: Lobby Management for RiskJS — an operator-only interface to see every currently open lobby on the server (listed and unlisted, Custom and Quick Game), beyond what the public lobby browser shows ordinary players, and to manually close a specific lobby immediately rather than waiting for its normal auto-close or start timing. Depends on the existing room/lobby system and Room Lifecycle Limits & Abuse Protection (004) for the underlying data; does not change any of 004's automatic rules. Excludes admin management of games and of user accounts."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See every open lobby on the server (Priority: P1)

The operator can view a complete list of every currently open lobby on the
server — both listed and unlisted, both Custom Game and Quick Game — with
enough detail (settings, player count) to understand what each one is,
regardless of what the public lobby browser shows to ordinary players.

**Why this priority**: Visibility is the precondition for everything else
this feature exists to do — the operator cannot manage or intervene in
lobbies they cannot see, including unlisted ones that ordinary players
themselves can't discover through the public browser.

**Independent Test**: With a mix of listed, unlisted, Custom, and Quick Game
lobbies currently open, confirm the operator's view shows every one of them,
including the unlisted ones that don't appear in the public lobby browser.

**Acceptance Scenarios**:

1. **Given** one or more lobbies are currently open, **When** the operator
   views the lobby management interface, **Then** they see every open
   lobby, including unlisted ones, with its basic settings and current
   player count.
2. **Given** a lobby closes (auto-close, game start, or operator action),
   **When** the operator next views the interface, **Then** that lobby no
   longer appears in the list.

---

### User Story 2 - Manually close a lobby (Priority: P1)

The operator can close a specific lobby immediately, freeing its resources
right away rather than waiting for its normal auto-close timing or for its
game to start.

**Why this priority**: This is the actual point of the feature — the
visibility from User Story 1 exists to support this action. Equal priority
since visibility alone delivers no operational control without it.

**Independent Test**: As the operator, manually close an open lobby before
its auto-close window has elapsed, and confirm it closes immediately and no
longer counts toward server capacity.

**Acceptance Scenarios**:

1. **Given** the operator selects an open lobby to close, **When** they
   confirm the action, **Then** that lobby closes immediately, regardless of
   how much of its normal auto-close window remains.
2. **Given** a lobby has been manually closed by the operator, **When** the
   server's capacity count is checked, **Then** that lobby no longer
   contributes to it, freeing room for new lobbies per the existing capacity
   rules.
3. **Given** the operator closes a lobby, **When** players who were in that
   lobby attempt to continue interacting with it, **Then** they are informed
   the lobby has closed.

---

### Edge Cases

- What happens if the operator attempts to close a lobby at the same moment
  it naturally starts its game or auto-closes on its own — does the manual
  close simply have no additional effect once the lobby is already gone?
- How does the interface handle a very large number of concurrently open
  lobbies (up to the existing capacity ceiling) — is the full list always
  shown, or does it need any organization/filtering to stay usable?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an interface, reachable only by the
  operator, listing every currently open lobby on the server, including
  unlisted lobbies not shown in the public lobby browser.
- **FR-002**: The lobby list MUST show each lobby's basic settings and
  current player count.
- **FR-003**: System MUST let the operator manually close any specific open
  lobby, immediately, regardless of its remaining auto-close time or
  progress toward starting.
- **FR-004**: A manually closed lobby MUST stop contributing to the server's
  combined games+lobbies capacity count immediately, per the existing
  capacity rules.
- **FR-005**: System MUST inform any player who was in a manually closed
  lobby that it has closed.
- **FR-006**: System MUST NOT change any of the automatic lobby lifecycle
  rules (auto-close timing, capacity ceiling, per-IP rate limiting) already
  defined by the Room Lifecycle Limits & Abuse Protection feature — this
  feature only adds visibility and a manual override.
- **FR-007**: System MUST NOT make this interface reachable by any player
  who is not the operator.

### Key Entities

- **Lobby Management View**: The operator's complete, unfiltered list of
  every currently open lobby, including unlisted ones, with enough detail to
  identify and act on each.
- **Manual Lobby Closure**: An operator-initiated action that closes a
  specific lobby immediately, independent of its normal auto-close or
  game-start timing.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of currently open lobbies (listed and unlisted, Custom
  and Quick Game) appear in the operator's lobby management view.
- **SC-002**: 100% of operator-initiated lobby closures take effect
  immediately, freeing that lobby's contribution to server capacity right
  away.
- **SC-003**: 0% of ordinary (non-operator) players can reach this
  interface.
- **SC-004**: 0% of automatic lobby lifecycle behaviors (auto-close timing,
  capacity ceiling, rate limiting) are altered by this feature's existence.

## Assumptions

- This is a single-operator context, consistent with the other admin
  features and the project's established single-person, self-hosted
  hobby-project philosophy — not a role-based permission system.
- This feature depends on the existing room/lobby system and on the Room
  Lifecycle Limits & Abuse Protection feature (004) for the underlying lobby
  data it displays; it does not redefine or change any of that feature's
  automatic rules, only adds operator visibility and a manual close action.
- Admin management of in-progress games and of user accounts are separate,
  already-planned/specified features (game management, and 021 for user
  accounts) and are out of scope here.
