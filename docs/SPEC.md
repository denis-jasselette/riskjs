# RiskJS — Product & Technical Spec (Draft)

Status: draft, agreed in brainstorm on 2026-07-21. Revisit if any decision below stops fitting reality.

## Vision

A public web clone of Risk. Strangers can find it, open a room, and play a full
game online with friends or bot-filled seats. Local pass-and-play (today's
mode) keeps working, but online play is the feature that makes this a real
product rather than a demo.

## Core ruleset (v1 scope — frozen)

- Classic Risk base rules
- Fog of war (#37, done)
- Blizzard territories (#29, done)
- Capital Mode (#7 / PR #38)
- Progressive card bonus (#8)

**Excluded for now: Portals** (#9 / PR #40). Rule scope is meant to stay at
this ceiling — don't add further variant modes without deliberately reopening
this decision.

## Maps (#14)

- **Classic Risk is the only map in v1.** The map config format
  (`config.json`) already supports additional maps (each map defines its
  own adjacency, continent bonuses, and blizzard count), so this is a
  content addition, not an architecture change — but it's deferred rather
  than built now, consistent with freezing scope so effort stays on the
  online-multiplayer core loop.
  - **Roadmap**: additional built-in maps (Europe, an updated World
    layout) once the core loop is live.
- **Custom user-uploadable maps are out of scope indefinitely** — this is a
  materially different feature from built-in maps, not a bigger version of
  the same thing. It's user-generated content rendered into other players'
  browsers: real XSS surface (SVG can carry scripts/event handlers) and
  real moderation surface, both of which conflict with decisions already
  made elsewhere in this spec (no moderation pipeline, frozen scope, one
  cheap self-hosted machine). Rejected specifically, not just deferred —
  built-in map variety can keep growing without ever needing this.

## Multiplayer architecture

- **Authoritative server** holds the canonical `GameState` and is the only
  place game rules are enforced. Rejects P2P / host-migration models — no
  anti-cheat story there, and messy on host disconnect.
- **Existing engine is reusable as-is**: `GameController`, `GameLogic`, and
  `MapController` have zero React/Preact imports today — plain TypeScript.
  The server can run this same engine directly rather than reimplementing
  game logic.
- **Transport**: WebSockets, custom protocol (events per game action —
  deploy / attack / fortify / trade cards / etc.).
- **Sessions (v1)**: room code + nickname, no login. Player identity is
  ephemeral per session, but should be modeled as a first-class concept in
  the protocol/session store so real accounts can slot in later without a
  protocol rework.
- **Reconnection is required, not optional.** Games run 30-90+ minutes; the
  server must hold state through a disconnect and let the same player resume
  their seat. A product where one dropped wifi connection ends the game for
  everyone else won't retain anyone.
- **Bots are server-side agents over the same protocol** (per #53) — a bot
  is just another client speaking the wire format, receiving only the state
  slice a player at that seat would legitimately see (so fog of war holds).
  No client-side bot simulation. Build the protocol once; bots and humans
  both consume it.
- **Hosting (v1)**: self-hosted on one specific machine, to keep costs at
  zero. No multi-instance / scaling concerns for now. Single point of
  failure is accepted at this stage.

## Room & session lifecycle

- **Room creation**: any visitor can create a room and becomes its host.
  Host picks seat count (2-6) and rule toggles (fog of war / blizzard /
  capital mode / progressive cards) — the same options the local setup form
  already exposes today, moved into a pre-game lobby screen.
- **Room codes**: short (4-char), uppercase, excluding ambiguous characters
  (`0`/`O`, `1`/`I`/`L`) — shareable like a Jackbox code.
- **Joining**: lobby-only. Once the host starts the game, the roster is
  locked — no new joiners mid-game. Simplest option, avoids fairness issues
  from joining with a large power gap.
- **Bot seats**: any seat still open when the host starts the game is filled
  by a `RandomBotAgent` (#53). This reuses the bot-as-protocol-client
  architecture directly — no special-cased "empty seat" logic on the server.
- **Session identity without accounts**: server issues an opaque session
  token to each joining client (stored client-side, e.g. localStorage).
  Rejoining with that token reclaims the same seat. This is the anchor that
  swaps cleanly for real account auth later (see Roadmap).
- **Disconnect handling**: on disconnect, the game pauses briefly for that
  seat. After a grace period (~2-5 min, exact value TBD at implementation
  time), the seat is handed to a `RandomBotAgent` so the game isn't stalled
  for everyone else. If the original player reconnects with their session
  token, they reclaim control from the bot.
- **Host powers (v1)**: limited to lobby setup (rule toggles, starting the
  game). No mid-game kick power for connected players — consistent with the
  "no moderation pipeline" non-goal; disconnect-driven bot takeover already
  handles the AFK case without needing manual moderation tools.
- **Room cleanup**: rooms are held in memory on the single self-hosted
  machine, so abandoned rooms (host never starts, or everyone disconnects
  pre-start) need to expire and free memory rather than accumulate
  indefinitely. **Lobbies auto-close after 15 minutes open** without the
  host starting the game.
- **Global capacity ceiling**: the server enforces a fixed maximum of
  **10** on (in-progress games) + (open lobbies) combined — arbitrary
  starting value, not derived from real capacity testing yet, revisit once
  there's actual load data from the hosting machine. Once that ceiling is
  hit, new room creation is rejected outright — not just rate-limited —
  until something below it closes (a game ends, or a lobby is cleaned up).
  This is a hard cap distinct from the per-IP rate limiting below: it
  protects the single self-hosted machine's actual capacity (memory,
  connections, bot compute) regardless of how well-behaved any individual
  requester is.
- **Abuse protection**: lightweight in-app, per-IP rate limiting on two
  actions — room creation (prevents mass-spawning empty rooms to exhaust
  server memory) and join attempts (prevents brute-forcing someone else's
  4-char room code to gatecrash their game). No CAPTCHA, no WAF — consistent
  with the minimal, cheap, single-machine approach used everywhere else in
  this spec.
  - **Code length stays 4 characters.** Risk games run much longer than a
    typical Jackbox-style round (30-90+ min vs. ~30 min), which was worth
    reconsidering, but the join-attempt rate limit already makes brute-force
    enumeration of the ~800K-code space impractical without needing a less
    shareable, longer code.

## Landing page & matchmaking

The entry experience needs more than "type a code" now that online is the
main event — a stranger with no code needs an actual way to find a game.

- **Persisted username**: picked once, stored client-side alongside the
  per-room session token already speced, so it doesn't need retyping on
  each visit. A local preference, not an account.
- **Quick Game** — a low-friction "just start playing" path:
  - If no Quick Game lobby is currently open, one is created automatically:
    classic Risk, 6 players, fixed card bonus, no blizzards, no fog, open
    seats set to fill with Easy automated bots.
  - If one is already open and waiting, the new player joins it instead of
    creating another.
  - The lobby accepts joiners until either **6 players have joined or 1
    minute has elapsed**, whichever comes first — remaining open seats are
    then filled with bots and the game starts.
  - **Waiting screen**: joined players shown by color only (no names), a
    countdown to the 1-minute limit, a Leave button, and a vote-to-start
    control — each joined human can mark themselves ready (shown as a
    checkmark next to their color). If every currently-joined human has
    voted to start, **and more than one human is present**, the game
    starts immediately, filling remaining seats with bots. The ">1 human"
    condition stops a single player from instant-starting alone against 5
    bots — a solo bot-filled game is still possible, just via the 1-minute
    timeout rather than an instant vote.
- **Custom Game**: creates a host-controlled lobby exactly as speced in
  Room & session lifecycle (host picks seat count and rule toggles).
- **Open lobby browser**: lists all open lobbies — Custom and any Quick
  Game currently in its waiting window — with basic settings and current
  player count, plus a join button. This is a real change from the
  code-only model: rooms become publicly discoverable, not just reachable
  via a shared link. **Open question**: this means a Custom Game host has
  no way to keep their lobby friends-only — anyone browsing the list can
  join before the host's actual friends do. Not resolved here; may need a
  "listed vs. code-only" toggle on Custom Game later.
- **Ongoing games list + spectate**: lists in-progress games with a
  spectate button. **This reverses the earlier "Spectator mode" non-goal**
  — noted explicitly since it was previously out of scope; it's in scope
  now per this direction. **Open question**: what state a spectator
  receives isn't defined — full unrestricted board view (simpler) vs. the
  same fog-of-war-restricted view a player would get (more consistent, but
  fog of war isn't well-defined for a non-participant).

## Client↔server protocol

- **Transport & format**: WebSocket, JSON messages, `{type, payload}`
  envelope. Message volume is low (turn-based, human-paced actions) — no
  case for anything heavier than JSON at this scale.
- **Lobby messages**: `create_room`, `join_room`, `start_game`, `lobby_state`
  (broadcast on any roster/settings change), `reconnect` (token-based, see
  Room & session lifecycle above).
- **Game messages, client→server**: `deploy`, `attack`, `fortify`,
  `trade_cards`, `end_phase`.
- **Game messages, server→client**: `action_event`, `state_snapshot`,
  `error`, `game_over`.
- **Server-side validation only**: every game action is checked through the
  existing `GameController` (`isAttackAllowed`, `isFortifyAllowed`,
  `isSelectable`, current-player/phase checks) before anything mutates.
  Illegal actions get an `error` back to the sender only — no state change,
  no broadcast.
- **Two pushes per action, not one**: a pure "broadcast the new state" model
  loses transient info the game already surfaces locally — dice roll
  results (#35) are computed and shown once, not persisted in `GameState`.
  So each validated action produces:
  - `action_event` — the specific outcome (e.g. dice values,
    territories/troops affected), broadcast to **all** players in the room
    so everyone watching the battle sees the same roll, not just the
    attacker.
  - `state_snapshot` — the resulting canonical state, computed **per-player**
    through the existing fog-of-war filter (not one shared broadcast) and
    sent individually to each connection.
- **Reconnection**: client sends `reconnect{token}`; server validates it
  against the room/seat, responds with a fresh `state_snapshot` filtered for
  that seat, and ends the bot takeover for that seat.
- **Bots need no special server code path**: `RandomBotAgent` implements
  this same message interface — it receives `state_snapshot`/`action_event`
  like a human client would, decides on an action, and submits it as a
  normal client message.

## Bot AI

The setup form (`GameOver.tsx`) already has UI stubs for bot config —
`bot_count`, a `bot_behavior` select (Automated / Neutral), and a
`bot_difficulty` select (Easy / Medium / Hard / Expert) — none of it wired
to anything yet (no bot logic exists in the codebase today). This section
reconciles that leftover scaffolding with the actual v1 plan.

- **Architecture**: bots are server-side agents over the same
  client↔server protocol as humans (see Multiplayer architecture / #53) —
  a strategy pattern, different "brain" implementations behind an identical
  client interface (receive `state_snapshot`/`action_event`, submit
  actions). Every tier, including Easy, only acts on the fog-of-war-filtered
  state slice it would legitimately see as that seat — no exceptions for
  weaker tiers.
- **Difficulty tiers (v1): Easy and Medium only.** Hard/Expert are deferred
  — avoids over-investing in bot AI before online play itself works.
  - **Easy** = the random bot from #53: random legal actions each phase.
    Deliberately dumb; its job is exercising the game loop and filling
    empty seats, not competitive play.
  - **Medium** = the first real heuristic bot (#6): rule-based scoring,
    still a single deterministic evaluation per decision (no search).
    Candidate heuristics: only attack at favorable troop odds, prioritize
    completing continent control, reinforce borders over interior
    territories, trade in card sets at first opportunity, and (capital
    mode) weight attacks toward capturing a weak opponent's capital while
    keeping its own defended.
- **Hard/Expert (deferred, noted for when revisited)**: stay on the same
  deterministic-heuristic approach — richer scoring, not real search or
  simulation. Lookahead/minimax-style play was explicitly rejected even for
  the top tier: bot decision cost multiplies across however many concurrent
  games run on the one shared always-on machine, and that compute budget
  isn't worth spending on stronger bots before there's real player demand
  for them.
- **Neutral behavior**: a separate axis from difficulty, not a tier itself.
  A Neutral seat holds territory passively and never initiates attacks —
  it skips attack-phase decision logic entirely regardless of assigned
  difficulty. Cheap to build alongside the difficulty ladder; useful as a
  low-conflict filler seat.
- **Where this lives**: plain TypeScript, same as the rest of the engine —
  reuses `MapController`'s adjacency/BFS logic for connectivity/continent
  evaluation, testable via Vitest alongside `GameController`/`GameLogic`.

## Turn timers & inactivity

A connected-but-idle player is a different case from the disconnect handling
in Room & session lifecycle — the socket is open, but no action is coming.
Same retention logic applies: one AFK-but-connected player stalling the
whole game is as bad for a public product as a dropped connection.

- **A per-turn timer applies to online games.** Exact duration is an
  implementation detail (like the disconnect grace period), not a scope
  decision here.
- **On first timeout, auto-play that turn only** — reuses the existing Easy
  `RandomBotAgent` (see Bot AI) for a single turn, then returns control to
  the player on their next turn. Lenient by design: one slow turn doesn't
  cost a player their seat.
- **On N consecutive timeouts, escalate** to the same persistent bot
  takeover already speced for disconnects (Room & session lifecycle) — the
  seat is handed to a bot until the player takes an action again, exactly
  like reclaiming a seat after reconnecting. No new mechanism needed, just
  a second trigger condition (repeated timeout) feeding the same takeover
  path a disconnect does.

## Account system (v2)

Deferred past v1, but firmly in scope — not speculative. The v1 session-token
model (opaque per-seat token, see Room & session lifecycle) is designed so
this layers on rather than requiring a rework.

- **Auth mechanism**: OAuth / social login (Discord and/or Google), not
  password auth. Offloads credential security — hashing, breach liability,
  password-reset email delivery — to the provider, which matters a lot for a
  single-person, self-hosted hobby project that doesn't want to own that
  surface.
- **Guest play keeps working**: accounts are additive, not required. A
  logged-in account's identity attaches to the same per-seat session token
  guests already use — it doesn't replace the v1 room/session model, it
  gives that token a persistent identity behind it instead of an ephemeral
  nickname.
- **What accounts unlock**:
  - Basic stats — games played / won, tied to persistent identity. Stays
    clear of the "no ranked/ELO" non-goal; counts, not a rating system.
  - Friends list & quick rematch — save people you've played with, one-click
    invite to a new room.
  - Server-side saved/resumable games — replaces the current local-only
    localStorage resume (#11) with account-backed resume from any device.
  - **Storage**: this is the first real persistence requirement in the
    project (v1 room state is in-memory only). Given the single-machine
    self-hosted constraint, SQLite is the natural fit — no separate DB
    service to run, trivial to back up.
- **Moderation**: basic ban capability is in v2 scope alongside accounts —
  a public product with persistent identity has more abuse surface than
  anonymous ephemeral rooms did. Scoped narrowly (a manual ban switch, not a
  reports/appeals pipeline) — the broader "no moderation pipeline" non-goal
  still holds for anything beyond that.

## Hosting & reachability

- **Machine**: already cloud-hosted with a public IP, dedicated/always-on —
  not a home machine, so no CGNAT, port-forwarding, or DDNS problem to
  solve. Directly reachable as-is.
- **TLS / `wss://`**: put a reverse proxy (Caddy, for its automatic
  Let's-Encrypt provisioning and renewal with minimal config) in front of
  the Node server. It terminates TLS and proxies both static assets and the
  WebSocket upgrade to the app. Simplest option for a single exposed
  service on one machine.
- **Domain**: use the existing domain already owned for the MVP. A
  separate, more brand/SEO-optimized domain is a deliberate post-MVP
  purchase — not worth spending money on before there's a real base of
  players to justify it.
- **Uptime**: since the machine is dedicated and always-on, set this up
  properly now rather than deferring — a systemd service (or equivalent)
  for auto-start-on-boot and auto-restart-on-crash is in v1 scope, not a
  later nice-to-have.

## Roadmap / v2

- Hard/Expert bot tiers, once Easy/Medium are live and there's real signal
  that players want stronger opponents.
- Revisit portals and any further variant modes once core online play works.
- Additional built-in maps (Europe, updated World layout) once the core
  online loop is live.
- Register a dedicated brand/SEO domain once there's a real player base to
  justify the cost.

## Non-goals (v1)

- Native mobile apps — responsive web is sufficient
- Ranked / ELO systems
- Chat / moderation pipeline
- Persistent accounts (see Roadmap — deferred, not rejected)
- Custom user-uploadable maps (see Maps — rejected indefinitely, not just
  deferred, due to UGC security/moderation surface)

## Open questions (not blocking this spec, need answers before/during implementation)

- Sequencing of account-system work relative to the protocol/bot work in #53.
- Exact disconnect grace-period duration before bot takeover (~2-5 min
  ballpark agreed; precise value TBD at implementation time).
- Revisit the arbitrary ceiling of 10 concurrent games+lobbies once there's
  real load data from the hosting machine.
- Whether Custom Game needs a "listed vs. code-only" privacy toggle, now
  that the open lobby browser makes all lobbies publicly joinable by
  default.
- What state a spectator receives (full board vs. a fog-of-war-restricted
  view) — spectate is now in scope but this isn't designed yet.
