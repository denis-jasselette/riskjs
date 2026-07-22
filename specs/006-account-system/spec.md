# Feature Specification: Account System (v2)

**Feature Branch**: `006-account-system`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Account system (v2) for RiskJS — optional persistent accounts via third-party OAuth login (Discord/Google), layered on top of the existing v1 session-token model so guest play keeps working unchanged. Unlocks basic win/loss stats, a friends list with quick rematch, and server-side saved/resumable games (first real persistence requirement, SQLite-backed). Includes a narrowly scoped manual account-ban capability. Deferred behind all v1 features; explicitly not concurrent with them. Excludes ranked/ELO, chat, and any broader moderation pipeline."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in without giving up guest play (Priority: P1)

A player can choose to sign in using an existing account from a third-party
identity provider, and doing so attaches a persistent identity to their
ongoing play — but a player who never signs in can keep playing exactly as
before, with no feature of the base game gated behind having an account.

**Why this priority**: This is the foundational guarantee the whole feature
depends on — every other story (stats, friends, saved games) only has value
if signing in is additive. If guest play regresses, the feature undermines the
product's existing accessibility.

**Independent Test**: As a guest (no account), play a full game start to
finish and confirm no functionality is blocked or degraded compared to today;
separately, sign in via a supported identity provider and confirm play
continues normally with an identity now attached.

**Acceptance Scenarios**:

1. **Given** a player has never signed in, **When** they create or join a room
   and play a game, **Then** every existing capability works exactly as it
   does today, with no sign-in prompt required at any point.
2. **Given** a player chooses to sign in, **When** they complete sign-in via a
   supported third-party identity provider, **Then** their existing
   in-progress session continues uninterrupted, now associated with their
   account identity.
3. **Given** a signed-in player, **When** they sign out or use a different
   device without signing in, **Then** they can still play as a guest without
   losing access to basic play.

---

### User Story 2 - See basic stats tied to my identity (Priority: P2)

A signed-in player can see how many games they've played and won, persisted
across sessions and devices under their account.

**Why this priority**: The simplest, lowest-risk value unlocked by having an
account — no new interaction model, just persisted counts. Builds directly on
User Story 1's identity attachment.

**Independent Test**: As a signed-in player, complete two games (winning one),
sign out, sign back in on a different device, and confirm the games-played and
games-won counts reflect both games correctly.

**Acceptance Scenarios**:

1. **Given** a signed-in player completes a game, **When** the game ends,
   **Then** their games-played count increases by one, and their games-won
   count increases by one if they won.
2. **Given** a signed-in player views their stats, **When** they access their
   profile, **Then** they see their total games-played and games-won counts,
   with no ranking, rating, or comparison to other players shown.

---

### User Story 3 - Save friends and quickly start a new game with them (Priority: P2)

A signed-in player can add another signed-in player they've played with to a
friends list, and later invite that friend to a new room with one action
instead of manually sharing a room code.

**Why this priority**: Meaningfully improves repeat-play convenience for a
signed-in player, but depends on User Story 1 (identity) and doesn't block
basic account value delivered by User Story 2.

**Independent Test**: As two signed-in players who've completed a game
together, one adds the other as a friend, then successfully invites them to a
brand-new room using the one-click invite rather than sharing a room code
manually.

**Acceptance Scenarios**:

1. **Given** a signed-in player has played a game with another signed-in
   player, **When** they choose to add that player as a friend, **Then** that
   player appears on their friends list going forward.
2. **Given** a player has a friend on their friends list, **When** they invite
   that friend to a new room, **Then** the friend receives an invite they can
   accept to join that room directly, without needing a manually shared room
   code.

---

### User Story 4 - Resume a saved game from any device (Priority: P2)

A signed-in player's in-progress game is saved server-side against their
account, so they can close their browser, come back later — even on a
different device — and resume exactly where they left off.

**Why this priority**: Directly extends existing (but device-local) resume
behavior into something that works for a signed-in player regardless of
device — a meaningful reliability upgrade, but scoped after the more
foundational identity and stats stories.

**Independent Test**: As a signed-in player mid-game, close the browser
entirely, open the game on a different device, sign in with the same account,
and confirm the same in-progress game can be resumed from where it was left.

**Acceptance Scenarios**:

1. **Given** a signed-in player has an in-progress game, **When** they close
   their browser or app without finishing it, **Then** that game remains
   resumable under their account.
2. **Given** a signed-in player has a resumable saved game, **When** they sign
   in on a different device, **Then** they can resume that same game from
   there, seeing the same current state they would have on the original
   device.
3. **Given** a guest (non-signed-in) player closes their browser mid-game,
   **When** they return, **Then** their experience is unchanged from today
   (device-local resume only) — server-side cross-device resume is only
   available to signed-in players.

---

### User Story 5 - An operator can ban an abusive account (Priority: P3)

An operator of the service can manually ban a specific account, preventing
that account from signing in or playing under that identity going forward.

**Why this priority**: Necessary risk mitigation once persistent identity
exists (more abuse surface than fully anonymous v1 play), but it's a narrow
operational safety valve, not a feature players interact with directly — lowest
priority of the five stories.

**Independent Test**: As an operator, ban a specific account, and confirm that
account can no longer sign in or take actions under that identity, while all
other accounts and guest play remain unaffected.

**Acceptance Scenarios**:

1. **Given** an operator has banned a specific account, **When** that
   account's owner attempts to sign in, **Then** sign-in is refused.
2. **Given** an account is banned, **When** any other account or guest
   attempts to play, **Then** they are entirely unaffected by that ban.

---

### Edge Cases

- What happens if a player signs in mid-game using an identity provider whose
  associated email/account was previously used as a different guest nickname
  — does any past guest activity retroactively attach to the new account, or
  does account history start fresh from first sign-in?
- What happens when a signed-in player tries to resume a saved game whose room
  or opponents are no longer available (e.g. the game has since concluded by
  timeout, or the server restarted)?
- How does a friend invite behave if the invited friend is already in another
  game — is the invite simply not actionable until they're free, or shown as
  unavailable?
- What happens to a banned account's existing friends-list entries and
  in-progress saved games — are they preserved (in case of an appeal/unban) or
  removed immediately?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let a player sign in using an account from at least
  one supported third-party identity provider, without requiring the player to
  create or manage a password anywhere in this product.
- **FR-002**: System MUST NOT require sign-in for any existing v1 gameplay
  capability — guest play must remain fully functional and unchanged for
  players who never sign in.
- **FR-003**: System MUST attach a signed-in player's persistent account
  identity to their existing per-seat session, without disrupting an
  in-progress session at the moment of signing in.
- **FR-004**: System MUST track and display, for each signed-in account, a
  count of games played and a count of games won, updated as each game
  concludes.
- **FR-005**: System MUST NOT present any ranking, rating, or leaderboard
  derived from a player's stats — only the raw counts.
- **FR-006**: System MUST let a signed-in player add another signed-in player
  to a persistent friends list.
- **FR-007**: System MUST let a signed-in player invite a friend from their
  friends list to a new room with a single action, without requiring a
  manually shared room code.
- **FR-008**: System MUST persist a signed-in player's in-progress game
  server-side, associated with their account, such that it can be resumed
  from a different device than the one on which it was started.
- **FR-009**: System MUST NOT change resume behavior for guest (non-signed-in)
  players — their existing device-local resume behavior continues unchanged.
- **FR-010**: System MUST let an operator manually ban a specific account,
  preventing that account from signing in or playing under that identity
  thereafter.
- **FR-011**: A ban on one account MUST NOT affect any other account's or any
  guest's ability to play.
- **FR-012**: System MUST NOT provide any moderation capability beyond the
  single manual account-ban switch described above (no reports pipeline, no
  appeals workflow, no chat moderation).

### Key Entities

- **Player Account**: A persistent identity created via third-party sign-in,
  distinct from the ephemeral per-seat session token used by guests; may be
  linked to a session token to carry a persistent identity into ongoing play.
- **Player Stats**: Games-played and games-won counters tied to a Player
  Account, updated on game conclusion.
- **Friend Relationship**: A saved association between two Player Accounts,
  enabling quick-invite to a new room.
- **Saved Game**: A server-side, account-associated record of an in-progress
  game's state, resumable from any device under the owning account.
- **Account Ban**: A manually operator-set flag on a Player Account that
  blocks future sign-in and play under that identity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of existing guest-play capabilities remain available and
  unchanged for players who never sign in, after this feature ships.
- **SC-002**: A signed-in player's games-played and games-won counts remain
  accurate and accessible from any device where they sign in, with no data
  loss across sessions.
- **SC-003**: A signed-in player can invite a saved friend to a new room in a
  single action, without needing to communicate a room code out-of-band.
- **SC-004**: A signed-in player can resume an in-progress game from a device
  other than the one they started it on, in at least 95% of attempts where the
  game is still active.
- **SC-005**: An operator can ban an abusive account and have that ban take
  effect (blocking further sign-in/play under that identity) with no impact to
  any other account, in 100% of tested cases.

## Assumptions

- This feature is deferred behind all v1 features (core gameplay protocol,
  Bot AI, seat takeover, room lifecycle limits, landing page/matchmaking) and
  is understood as a distinct, later body of work, not something built
  concurrently with them — per docs/SPEC.md's explicit "v2" framing.
- "At least one supported third-party identity provider" covers the specific
  options named in docs/SPEC.md (Discord and/or Google); exactly which
  provider(s) ship first is an implementation-planning decision, not a scope
  decision for this spec.
- This is the first feature in the project with a genuine server-side
  persistence requirement (all v1 state is in-memory); the spec intentionally
  does not name a specific storage technology, leaving that to planning,
  though docs/SPEC.md already anticipates SQLite given the single-machine
  hosting constraint.
- Ranked/ELO systems and any chat functionality are explicitly out of scope,
  consistent with the project's stated non-goals.
- Moderation in this feature is scoped narrowly to the single manual
  account-ban capability described; a broader reports/appeals pipeline
  remains out of scope, consistent with the project's "no moderation
  pipeline" non-goal holding beyond this one capability.
