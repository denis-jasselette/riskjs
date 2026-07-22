# Feature Specification: Landing Page & Matchmaking

**Feature Branch**: `005-landing-page-matchmaking`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Landing page and matchmaking for RiskJS online games — persisted username, a Quick Game auto-lobby (6 seats, standard ruleset, fills with Easy bots after a 1-minute/6-player window or an all-ready vote), a Custom Game entry point into the existing host-controlled lobby flow, an open lobby browser, and an ongoing-games list with spectate. Depends on the existing room/lobby/session system and Bot AI (Easy tier). Excludes accounts and in-game protocol handling."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Jump into a game with one click (Priority: P1)

A visitor with no room code and no friends already in a game wants to just
start playing immediately, without configuring anything, and either lands in a
game with other similarly minded strangers or, if none are currently waiting,
gets one started automatically.

**Why this priority**: This is the core value of turning "online multiplayer"
into a real public product rather than a private-link-only feature — a
stranger with zero setup must be able to reach a playable game. Without it,
online play is still effectively invite-only.

**Independent Test**: As a first-time visitor with no existing lobby to join,
select Quick Game and confirm a game becomes available to play within a
bounded time, with no configuration required.

**Acceptance Scenarios**:

1. **Given** no Quick Game lobby is currently open and waiting, **When** a
   player selects Quick Game, **Then** a new waiting lobby with the standard
   Quick Game ruleset (classic map, 6 seats, standard card bonus, no
   blizzards, no fog of war) is created and that player joins it.
2. **Given** a Quick Game lobby is already open and waiting, **When** another
   player selects Quick Game, **Then** they join that existing waiting lobby
   instead of a new one being created.
3. **Given** a Quick Game waiting lobby has been open for 1 minute without
   reaching 6 human players, **When** the 1-minute mark is reached, **Then**
   any remaining open seats are filled with Easy-difficulty automated
   opponents and the game begins.
4. **Given** a Quick Game waiting lobby reaches 6 human players before 1
   minute elapses, **When** the 6th player joins, **Then** the game begins
   immediately with no bot seats needed.

---

### User Story 2 - See who's waiting and choose to start early (Priority: P2)

While waiting in a Quick Game lobby, a player can see how many others have
joined (by color, not name), how much time remains, and can either leave or
signal they're ready to start right away rather than waiting out the full
window.

**Why this priority**: Improves the Quick Game experience once the basic
auto-matching from User Story 1 works, giving waiting players visibility and
agency instead of a silent countdown — but the game is still playable without
it (the 1-minute/6-player fallback alone is sufficient to reach P1's goal).

**Independent Test**: Join a Quick Game waiting lobby with at least one other
human player, mark ready, and confirm the game starts immediately once every
currently-joined human has marked ready — without waiting for the full
countdown.

**Acceptance Scenarios**:

1. **Given** a player is in a Quick Game waiting lobby, **When** they view the
   lobby, **Then** they see each joined player represented by color only (no
   names), plus a visible countdown to the 1-minute limit.
2. **Given** at least two human players are in a Quick Game waiting lobby,
   **When** every currently-joined human marks themselves ready, **Then** the
   game starts immediately, filling any remaining open seats with bots, rather
   than waiting for the countdown to finish.
3. **Given** only one human player is currently in a Quick Game waiting lobby,
   **When** that single player marks themselves ready, **Then** the game does
   NOT start early — it still waits for the full 1-minute window (or another
   human joining and everyone being ready) before starting.
4. **Given** a player is in a Quick Game waiting lobby, **When** they choose to
   leave, **Then** they exit the waiting lobby without affecting other waiting
   players' progress toward starting.

---

### User Story 3 - Set up and share a customized game (Priority: P2)

A player who wants to control the ruleset and invite specific people creates a
Custom Game from the landing page, using the same host-controlled setup
(seat count, rule toggles) the room system already supports, and can then
share that room with others.

**Why this priority**: This is the existing room-creation flow (already
built) — this story is purely about giving it a proper landing-page entry
point alongside Quick Game, not new lobby behavior. Lower priority than Quick
Game/matchmaking because host-driven play via a shared link already works
today; this closes a discoverability gap, not a functional gap.

**Independent Test**: From the landing page, start a Custom Game, configure
seat count and rule toggles, and confirm it behaves identically to the
existing host-controlled lobby flow.

**Acceptance Scenarios**:

1. **Given** a player selects Custom Game from the landing page, **When** they
   complete setup, **Then** a host-controlled lobby is created with their
   chosen seat count and rule toggles, exactly as the existing lobby system
   already provides.

---

### User Story 4 - Find and join any open game from a list (Priority: P2)

A player without a specific room code can browse a list of every currently
open, joinable lobby — showing its basic settings and how many players have
joined — and pick one to join directly.

**Why this priority**: This is what actually makes rooms "publicly
discoverable" beyond Quick Game's automatic matching — it gives players
choice over which open game to join (e.g. a specific ruleset), which Quick
Game's single fixed ruleset doesn't offer.

**Independent Test**: With at least one open Custom Game lobby and one
Quick Game lobby currently in its waiting window, open the lobby browser and
confirm both appear with correct settings and player counts, and that
selecting one successfully joins it.

**Acceptance Scenarios**:

1. **Given** one or more lobbies are currently open and accepting joiners,
   **When** a player opens the lobby browser, **Then** they see each open
   lobby's basic settings (e.g. rule toggles) and current player count.
2. **Given** a player selects an open lobby from the browser, **When** they
   confirm joining it, **Then** they join that specific lobby the same way
   they would via a shared room code.
3. **Given** a lobby stops being open (game starts, or it closes), **When**
   the browser list is next shown, **Then** that lobby no longer appears in
   it.

---

### User Story 5 - Watch a game in progress without playing (Priority: P3)

A player can browse a list of games currently in progress that don't have fog
of war enabled, and choose to watch one without taking a seat or affecting
play.

**Why this priority**: A genuinely new capability (previously explicitly out
of scope) rather than an extension of existing lobby behavior, and lowest
priority of the five stories — valuable for engagement/discoverability but not
required for the core "find and play a game" loop the other stories deliver.

**Independent Test**: With at least one fog-of-war-disabled game currently in
progress, open the ongoing-games list, select it to spectate, and confirm the
spectator can observe the game's progress without being able to take any game
action; separately, confirm a game with fog of war enabled does not offer a
spectate option at all.

**Acceptance Scenarios**:

1. **Given** one or more games with fog of war disabled are currently in
   progress, **When** a player opens the ongoing-games list, **Then** they
   see each such game available to spectate.
2. **Given** a game currently in progress has fog of war enabled, **When** a
   player opens the ongoing-games list, **Then** that game is either omitted
   from the list or shown without a spectate option — it MUST NOT be
   spectatable by anyone.
3. **Given** a player chooses to spectate a fog-of-war-disabled game, **When**
   they begin spectating, **Then** they can observe the game's progress in
   real time but cannot submit any game action (deploy, attack, fortify,
   etc.).
4. **Given** a game a player is spectating ends, **When** the game concludes,
   **Then** the spectator is informed the game has ended, consistent with how
   a participating player is informed.

---

### Edge Cases

- What happens when a player's persisted username conflicts with another
  player's in the same lobby (e.g. two players with the same display name) —
  are duplicate names within one lobby allowed?
- What happens if the last remaining human player leaves a Quick Game waiting
  lobby before it starts — does the lobby close, or does it keep waiting for
  a new player?
- How does the open lobby browser handle a lobby that fills to capacity or
  starts its game in the moment between a player viewing the list and
  attempting to join it?
- What happens when a spectator tries to join an ongoing game as a spectator
  after that game has already ended (e.g. a stale link/list)?
- What happens if a fog-of-war game is being spectated (e.g. via a stale
  link) and cannot be — is the attempt simply rejected, and does that differ
  from a game that has ended?

## Clarifications

### Session 2026-07-22

- Q: Should a Custom Game host have any way to keep their lobby out of the
  public lobby browser (private/friends-only), given the browser now makes
  all lobbies publicly joinable by default? → A: Custom Game host can toggle
  their lobby to "unlisted" (code-only, does not appear in the browser) at
  creation time; Quick Game lobbies are always listed.
- Q: What game state should a spectator receive — a full unrestricted view of
  the board, or the same fog-of-war-restricted view a seated player would get?
  → A: Spectating is only offered for games with fog of war disabled, and
  those spectators receive a full, unrestricted view. Games with fog of war
  enabled are never spectatable at all, since a "spectator" view of a
  fog-of-war game would otherwise be usable by a seated player (e.g. via a
  second connection) to see through fog of war they shouldn't have access to.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let a player set a display name once and remember it
  on their device for future visits, without requiring it to be re-entered
  each time.
- **FR-002**: System MUST provide a Quick Game option that joins an existing
  open Quick Game waiting lobby if one exists, or creates a new one with a
  fixed standard ruleset (classic map, 6 seats, standard card bonus, no
  blizzards, no fog of war) if none exists.
- **FR-003**: A Quick Game waiting lobby MUST stop accepting new human
  joiners and begin the game, filling any remaining open seats with
  Easy-difficulty automated opponents, as soon as either 6 human players have
  joined or 1 minute has elapsed since it opened — whichever happens first.
- **FR-004**: While a Quick Game lobby is waiting, system MUST show joined
  players to each other by color only (no names), along with a visible
  countdown to the 1-minute limit.
- **FR-005**: System MUST let any player in a Quick Game waiting lobby mark
  themselves ready, and MUST start the game immediately (filling remaining
  seats with bots) once every currently-joined human has marked ready, but
  only when more than one human is currently in the lobby.
- **FR-006**: System MUST let a player leave a Quick Game waiting lobby before
  it starts, without disrupting other waiting players' progress toward
  starting.
- **FR-007**: System MUST provide a Custom Game option that creates a
  host-controlled lobby using the existing room/lobby setup flow (seat count,
  rule toggles), unchanged from how that flow already works.
- **FR-008**: System MUST let a Custom Game host choose, at creation time,
  whether their lobby is listed in the public lobby browser or unlisted
  (joinable only via its room code).
- **FR-009**: System MUST provide a lobby browser listing every currently
  open, listed lobby (Custom Game lobbies marked as listed, plus any Quick
  Game lobby currently in its waiting window), showing each one's basic rule
  settings and current player count.
- **FR-010**: System MUST let a player join any lobby shown in the lobby
  browser directly, without needing its room code.
- **FR-011**: System MUST remove a lobby from the browser listing as soon as
  it is no longer open (its game has started, or it has closed).
- **FR-012**: System MUST provide a list of currently in-progress games that
  can be spectated, limited to games that do not have fog of war enabled.
- **FR-013**: System MUST NOT allow any game with fog of war enabled to be
  spectated, by anyone, under any circumstance — such games either do not
  appear in the spectate list or appear without a spectate option.
- **FR-014**: A spectator of an eligible (fog-of-war-disabled) game MUST be
  able to observe its progress in real time without being able to submit any
  game action.
- **FR-015**: A spectator MUST receive a full, unrestricted view of the game
  board, since spectating is only ever offered for games with no fog of war
  to restrict.
- **FR-016**: System MUST inform a spectator when the game they are watching
  ends, consistent with how a seated player is informed.

### Key Entities

- **Persisted Player Preference**: A player's chosen display name, stored on
  their device and reused across visits; not tied to any server-side account.
- **Quick Game Waiting Lobby**: A single, shared, auto-created lobby with a
  fixed standard ruleset, a joining/ready-vote window, and a defined
  auto-start condition (6 players or 1 minute, or an all-ready vote among 2+
  humans).
- **Lobby Listing Visibility**: Whether a given lobby is discoverable via the
  public lobby browser (listed) or reachable only via its room code
  (unlisted); Quick Game lobbies are always listed, Custom Game lobbies choose
  at creation.
- **Spectator Session**: A read-only connection to an in-progress,
  fog-of-war-disabled game that receives a full, unrestricted view of game
  state but cannot submit actions. Games with fog of war enabled have no
  corresponding spectator session type — they are not spectatable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor with no room code can reach a playable
  game via Quick Game within 1 minute of selecting it, without any manual
  configuration.
- **SC-002**: 100% of Quick Game waiting lobbies that reach either the
  6-player cap, the 1-minute timeout, or an eligible all-ready vote begin
  their game with all previously-open seats filled (by humans or bots).
- **SC-003**: A solo player alone in a Quick Game waiting lobby never
  triggers an early start via the ready-vote path — early start only ever
  occurs with more than one human present.
- **SC-004**: A returning player is never asked to re-enter their display
  name on a device where they've previously set it.
- **SC-005**: 100% of currently open, listed lobbies shown in the lobby
  browser are actually joinable at the moment they're displayed to within a
  few seconds of staleness.
- **SC-006**: A spectator can observe a full, eligible in-progress game from
  start to its conclusion without ever being able to affect game state.
- **SC-007**: 0% of games with fog of war enabled are ever accessible via any
  spectate path, across all attempts.

## Assumptions

- This feature depends on the existing room/lobby/session system (room
  creation, joining, roster sync) already built, and on the Bot AI feature's
  Easy tier already existing to fill unfilled Quick Game seats; it does not
  redesign either.
- It does not depend on the core gameplay protocol, seat takeover, or room
  lifecycle limits features, since those govern behavior once a room/game
  already exists — this feature is entirely about how a player finds or
  starts one.
- Account systems, and any handling of in-game actions once a game has
  started, are explicitly out of scope here.
- The two decisions previously left open in docs/SPEC.md are resolved above
  under Clarifications, per explicit stakeholder input: Custom Game lobbies
  get a listed/unlisted toggle, and spectating is restricted to
  fog-of-war-disabled games specifically to close off a potential cheating
  vector (a seated player using a spectator view to see through their own
  game's fog of war).
