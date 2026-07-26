# RiskJS Specs Index

This directory holds every speckit feature specification for RiskJS, across
three axes of work:

- **Rules Engine** (008–014, 024) — the core game rules, playable locally
  today and shared by every mode of play (local pass-and-play, online,
  bots).
- **Online Multiplayer** (001–007) — the room/lobby/protocol/hosting layer
  that turns the existing local game into a public online product.
- **Polish & Admin Tooling** (015–023) — player-facing quality-of-life
  features and single-operator admin interfaces, layered on top of the
  other two axes once their dependencies exist.

**Online Multiplayer is the priority axis.** Local pass-and-play exists to
make the game engine easy to build and manually test solo — it is not the
product. Rules Engine work continues only where it unblocks multiplayer
(012/013 gate 001's full completion, 002, and 023) or is already
in flight; once 013 lands, Online Multiplayer Core takes priority over
further Rules Engine or Polish work.

The axes are mostly independent and can progress in parallel, with a small
number of explicit cross-axis dependencies noted below (features 001 and 002
need parts of the Rules Engine axis to reach full completion, even though
their baseline can be built without it; several Phase 8 features depend on
specific earlier features from either axis; 024 flags a likely follow-up
drift-fix to 001, not yet made).

008, 009, 010, and 011 are fully implemented and merged. 012, 013, 017, and
024 have gone through `/speckit-plan` and `/speckit-tasks`
(`plan.md`/`research.md`/`data-model.md`/`quickstart.md`/`tasks.md`) and are
under active implementation. Every other spec still has only `spec.md` +
`checklists/requirements.md`, with no plan or tasks generated yet. Status
below reflects that.

## Phased Roadmap

### Phase 1 — Rules Engine Foundation

No dependencies on each other or on any other feature; can be built in any
order or in parallel.

- **[008 — Reinforcement Calculation](008-reinforcement-calculation/spec.md)** *(Done)*
  Replace the flat 3-troop-per-turn reinforcement with territory + continent
  + capital rules.
- **[009 — Fortify Troop-Count Selection](009-fortify-troop-selection/spec.md)** *(Done)*
  Let a player choose how many troops to move during fortify, instead of the
  current hardcoded move-of-1.
- **[010 — Blizzard Connectivity Guarantee](010-blizzard-connectivity/spec.md)** *(Done)*
  Guarantee blizzard placement never splits the playable map into
  disconnected regions.
- **[011 — Fog of War Owner Visibility](011-fog-of-war-owner-visibility/spec.md)** *(Done)*
  Hide territory owner as well as troop count outside a player's visible
  range.
- **[024 — Post-Conquest Troop Movement](024-post-conquest-troop-movement/spec.md)**
  *(no dependencies; In Progress)*
  Let the attacker choose how many troops move into a newly conquered
  territory (bounded between the winning roll's dice count and leaving 1
  behind, defaulting to max), instead of the engine automatically moving
  everyone over. Found later than 008-011 but belongs in this same
  foundational group.

### Phase 2 — Rules Engine: Capital & Endgame

Sequential chain — each depends on the previous. Kept ahead of Online
Multiplayer Core because 001's full completion, 002, and 023 all depend on
013.

- **[012 — Capital Mode](012-capital-mode/spec.md)** *(depends on 008; In Progress)*
  Round-1 capital placement, capital reinforcement bonus, extra defending
  die, capital win condition. Rebuilds a mechanic that previously existed
  only on an unmerged branch.
- **[013 — Win Conditions, Elimination, Resignation & Ranking](013-win-conditions-elimination-ranking/spec.md)** *(depends on 012; In Progress)*
  Wires up the game actually ending: conquest/capital win detection,
  defeat/resignation handling, personal elimination screens, final ranking.
  Closes the "no way to actually win" gap found in the current code.

### Phase 3 — Online Multiplayer Core (priority)

The core value of the product — this is the next priority axis once 013
lands. `001` builds on the existing room/lobby/session code (already
shipped, not a spec). Its baseline (deploy/attack/fortify/trade_cards/
end_phase) needs nothing from Phase 1/2 and can start now in parallel with
012/013; full completion — the capital-placement and resign action types,
and the personal elimination notice — depends on 012 and 013 respectively.
`002`'s capital-aware Medium-tier bot behavior similarly depends on 012.

- **[001 — Online Gameplay Protocol](001-online-game-protocol/spec.md)**
  *(depends on the existing room/lobby system; on 012 and 013 for full
  completion)*
  Real-time deploy/attack/fortify/trade-cards/end-phase (+ place-capital,
  resign) actions over the network, authoritative server validation, shared
  battle outcomes, per-player fog-of-war state, reconnection, personal
  elimination notice.
- **[002 — Bot AI](002-bot-ai/spec.md)** *(depends on 001; on 012 for
  capital-aware behavior)*
  Easy (random) and Medium (heuristic) automated opponents, plus a Neutral
  behavior axis.
- **[003 — Seat Takeover (Disconnect & Turn-Timer)](003-seat-takeover/spec.md)**
  *(depends on 001, 002)*
  Disconnect grace-period bot takeover and turn-timer auto-play/escalation,
  unified into one takeover mechanism.

### Phase 4 — Online Multiplayer Growth

Independent of each other; `005` depends on the bot-filling behavior from
Phase 3.

- **[004 — Room Lifecycle Limits & Abuse Protection](004-room-limits-abuse-protection/spec.md)**
  *(no dependencies)*
  Lobby auto-close, global capacity ceiling, per-IP rate limiting on room
  creation/joins.
- **[005 — Landing Page & Matchmaking](005-landing-page-matchmaking/spec.md)**
  *(depends on the existing room/lobby system, 002)*
  Persisted username, Quick Game auto-matchmaking, Custom Game entry point,
  open lobby browser, spectate (fog-of-war-disabled games only).

### Phase 5 — Hosting & Reachability

No feature dependencies gate `007` — it can be done at any point once
there's a server process worth exposing. Promoted ahead of the deferred
Rules Engine/Polish work below because it's what makes Phase 3-4's
multiplayer product actually reachable by real players.

- **[007 — Hosting & Reachability](007-hosting-reachability/spec.md)** *(no
  dependencies)*
  TLS/reverse proxy, existing domain, auto-start-on-boot and
  auto-restart-on-crash.

### Phase 6 — Rules Engine: Card System

Deprioritized behind the Online Multiplayer axis — it improves the local
engine but nothing in Phase 3-5 depends on it.

- **[014 — Card System Overhaul](014-card-system-overhaul/spec.md)** *(depends on 013)*
  Unique per-territory cards, forced trade-in cascade, real Fixed-mode bonus
  table, occupied-territory bonus.

### Phase 7 — Account System (v2)

Explicitly deferred behind all of Phase 3–4 (all v1 multiplayer features).

- **[006 — Account System (v2)](006-account-system/spec.md)** *(depends on
  001, 002, 003, 004, 005 — all v1 multiplayer features)*
  OAuth login layered on the existing session-token model, stats, friends
  list, server-side saved games (first real persistence requirement), narrow
  manual-ban capability.

### Phase 8 — Polish & Admin Tooling

Player-facing quality-of-life features and single-operator admin interfaces.
Each depends on a specific earlier feature rather than on this phase's other
members, except 016 (depends on 015). 023 additionally depends on Phase 7
(006) for operator authentication, found during clarification — it cannot
ship ahead of the Account System despite 001/013 otherwise being ready.

- **[015 — Action Log](015-action-log/spec.md)** *(no dependencies)*
  A scrollable, fog-of-war-respecting history of every significant action
  taken during a game. Groundwork for 016.
- **[016 — Game Replay](016-game-replay/spec.md)** *(depends on 015)*
  Step forward/backward through a completed game's Action Log, reconstructing
  board state at each step. Always shows the full, unrestricted board
  (resolved via clarification, to avoid a self-spectate cheating vector).
- **[017 — Capital Counter UI](017-capital-counter-ui/spec.md)** *(depends on
  012; In Progress)*
  A single, global, anonymized "Leader: 3/6" indicator (highest capitals held
  by any one player, never whose) — a deliberate hint through fog of war.
  Hidden for the first 3 rounds after capital placement, showing a plain
  round counter ("Round: 2") instead.
- **[018 — User Settings](018-user-settings/spec.md)** *(depends on 006)*
  Display name management (new accounts get an auto-generated
  adjective+animal name by default, e.g. "SwiftFox"), sign-out, and
  deliberate/hard-to-trigger account deletion for a signed-in player.
- **[019 — Bug Report](019-bug-report/spec.md)** *(no dependencies)*
  An in-app form that pre-fills the existing GitHub bug-report template with
  automatic context (no custom backend needed) — final submission still
  happens on GitHub, so a GitHub account is required at that last step.
- **[020 — About Page](020-about-page/spec.md)** *(no dependencies)*
  A static page explaining the project, linking to the existing GitHub repo
  and donation destination.
- **[021 — Admin User Management](021-admin-user-management/spec.md)**
  *(depends on 006)*
  Operator-only interface to look up an account and apply 006's existing
  ban/unban capability — 006 specified the ban action but never an interface
  to reach it.
- **[022 — Admin Lobby Management](022-admin-lobby-management/spec.md)**
  *(depends on 004, the existing room/lobby system)*
  Operator-only visibility into every open lobby (including unlisted ones)
  and a manual early-close override, without changing 004's automatic rules.
- **[023 — Admin Game Management](023-admin-game-management/spec.md)**
  *(depends on 001, 013, and 006/021 for operator auth)*
  Operator-only visibility into in-progress games and a manual end-game
  override, clearly distinguished from a normal win so players aren't
  confused about what happened.

## Full Index

- **001** — Online Gameplay Protocol — Multiplayer — Draft (spec only)
- **002** — Bot AI — Multiplayer — Draft (spec only)
- **003** — Seat Takeover (Disconnect & Turn-Timer) — Multiplayer — Draft (spec only)
- **004** — Room Lifecycle Limits & Abuse Protection — Multiplayer — Draft (spec only)
- **005** — Landing Page & Matchmaking — Multiplayer — Draft (spec only)
- **006** — Account System (v2) — Multiplayer — Draft (spec only)
- **007** — Hosting & Reachability — Multiplayer — Draft (spec only)
- **008** — Reinforcement Calculation — Rules Engine — Done (merged)
- **009** — Fortify Troop-Count Selection — Rules Engine — Done (merged)
- **010** — Blizzard Connectivity Guarantee — Rules Engine — Done (merged)
- **011** — Fog of War Owner Visibility — Rules Engine — Done (merged)
- **012** — Capital Mode — Rules Engine — In Progress
- **013** — Win Conditions, Elimination, Resignation & Ranking — Rules Engine — In Progress
- **014** — Card System Overhaul — Rules Engine — Draft (spec only)
- **015** — Action Log — Polish & Admin Tooling — Draft (spec only)
- **016** — Game Replay — Polish & Admin Tooling — Draft (spec only)
- **017** — Capital Counter UI — Polish & Admin Tooling — In Progress
- **018** — User Settings — Polish & Admin Tooling — Draft (spec only)
- **019** — Bug Report — Polish & Admin Tooling — Draft (spec only)
- **020** — About Page — Polish & Admin Tooling — Draft (spec only)
- **021** — Admin User Management — Polish & Admin Tooling — Draft (spec only)
- **022** — Admin Lobby Management — Polish & Admin Tooling — Draft (spec only)
- **023** — Admin Game Management — Polish & Admin Tooling — Draft (spec only)
- **024** — Post-Conquest Troop Movement — Rules Engine — In Progress

## Not Yet Specced

Chat and report-a-player/admin-review-reports would each require reversing a
previously stated non-goal (no chat, no moderation pipeline beyond the single
manual-ban switch in 006) before they could be specced. Everything else
raised so far has a spec (see Phase 8 above).
