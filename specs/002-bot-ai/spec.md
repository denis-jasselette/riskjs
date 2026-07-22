# Feature Specification: Bot AI

**Feature Branch**: `002-bot-ai`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Bot AI for RiskJS online games — Easy (random) and Medium (rule-based heuristic) automated opponents that fill seats and play through the same client↔server protocol as human players, plus a separate Neutral behavior that holds territory passively. Wires up the existing but unused bot-config UI stubs (bot_count, bot_behavior, bot_difficulty). Excludes Hard/Expert tiers, search/lookahead play, and the logic that decides *when* a bot takes a seat (disconnect/timeout takeover, empty-seat filling — separate features)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fill empty seats with a playable opponent (Priority: P1)

A game includes one or more automated seats (instead of every seat needing a
human), and each automated seat takes believable, rule-following turns — deploying,
attacking, fortifying, trading cards, and ending its phase — so the game
progresses normally to a conclusion without a human controlling that seat.

**Why this priority**: Without any working bot, "fill empty seats with bots" is
just an unusable UI toggle. This is the minimum needed for a bot seat to be
functionally indistinguishable from a slow-but-legal human player.

**Independent Test**: Start a game with a mix of human and automated seats, let
the automated seats play without any external input, and confirm the game
reaches a normal conclusion with only legal moves from every automated seat.

**Acceptance Scenarios**:

1. **Given** a game includes an automated seat, **When** it becomes that seat's
   turn, **Then** it takes a legal action for its current phase (deploy,
   attack, fortify, trade cards, or end phase) without any external input.
2. **Given** an automated seat has no legal beneficial action available in a
   phase (e.g. no favorable attack exists), **When** its turn continues,
   **Then** it ends that phase rather than stalling the game.
3. **Given** a full game of otherwise-human seats has all remaining open seats
   filled with automated opponents, **When** play proceeds to completion,
   **Then** the game ends in a normal win/elimination condition exactly as it
   would with all-human seats.

---

### User Story 2 - Choose a difficulty that changes how a bot plays (Priority: P1)

A player setting up or joining a game can pick Easy or Medium for an automated
seat, and the two produce visibly different play: Easy takes essentially random
legal actions, while Medium plays with basic strategy (favorable attacks,
defending its position, growing toward continent control).

**Why this priority**: A single fixed bot behavior wouldn't satisfy the
scaffolding already built for a difficulty selector, and offering only one
real difficulty defeats the purpose of a difficulty choice. Easy and Medium
being distinguishably different is the core value of this story.

**Independent Test**: Run the same game scenario twice, once with an Easy seat
and once with a Medium seat in the identical position, and confirm the Medium
seat consistently makes materially better strategic choices (e.g. avoids
unfavorable attacks that Easy takes at random).

**Acceptance Scenarios**:

1. **Given** an automated seat is set to Easy, **When** it takes its turn,
   **Then** it chooses among its currently-legal actions without favoring
   strategically stronger ones over weaker ones.
2. **Given** an automated seat is set to Medium, **When** it evaluates whether
   to attack, **Then** it only initiates attacks it judges favorable, and
   prioritizes reinforcing border territories and progressing toward
   continent control over incidental moves.
3. **Given** capital mode is active and an automated Medium seat can plausibly
   threaten a weaker opponent's capital, **When** it chooses its attacks,
   **Then** it weights its actions toward that opportunity while keeping its
   own capital adequately defended.

---

### User Story 3 - A passive (Neutral) seat holds ground without attacking (Priority: P2)

A player can set up a seat as Neutral, and that seat defends and manages its own
territories normally but never initiates an attack on another player, regardless
of its assigned difficulty.

**Why this priority**: Useful as a low-conflict filler seat (e.g. absorbing
extra players in a smaller game, or as an easier on-ramp), but not required for
a first working bot — it's an additional configuration on top of the core
difficulty ladder from User Story 2.

**Independent Test**: Configure a seat as Neutral with an otherwise-attack-ready
board position, run through several of its turns, and confirm it never
initiates an attack while still taking its other turn actions normally.

**Acceptance Scenarios**:

1. **Given** a seat is configured as Neutral, **When** its attack phase
   arrives, **Then** it does not initiate any attack, regardless of favorable
   opportunities.
2. **Given** a seat is configured as Neutral, **When** its deploy and fortify
   phases arrive, **Then** it still deploys reinforcements and fortifies
   normally, same as a non-Neutral seat would.

---

### Edge Cases

- What happens when an automated seat's only legal moves in the attack phase
  would all be clearly unfavorable (e.g. attacking from a weak position) —
  does it correctly choose not to attack rather than attacking anyway?
- How does an automated seat behave when it holds a mandatory trade-in card set
  (forced trade-in) versus an optional one?
- What happens when a Neutral seat is also assigned a difficulty tier — does
  the Neutral behavior correctly override attack-phase decisions regardless of
  which tier is selected?
- How does a Medium seat's continent-control heuristic behave when no
  meaningful continent-completion opportunity exists at all that turn?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let a game seat be configured to be automated rather
  than requiring a human controller.
- **FR-002**: System MUST let an automated seat be configured to one of at
  least two distinct difficulty levels (Easy, Medium) that produce observably
  different play quality.
- **FR-003**: An automated seat MUST take a turn action (deploy, attack,
  fortify, trade cards, or end phase) for each phase of its turn without
  requiring any external/human input.
- **FR-004**: An automated seat MUST only ever choose among actions that are
  legal for its current game state and phase — it never attempts an action a
  human player would have rejected as illegal.
- **FR-005**: An automated seat MUST only base its decisions on the information
  its seat would legitimately be able to see (i.e. it respects the same
  fog-of-war visibility rules as a human player in that seat) — no difficulty
  tier receives privileged information.
- **FR-006**: An Easy-difficulty seat MUST choose among its currently-legal
  actions without applying strategic evaluation (i.e. its choices are not
  consistently biased toward stronger moves).
- **FR-007**: A Medium-difficulty seat MUST evaluate potential attacks and only
  initiate ones it judges favorable, MUST prioritize reinforcing border
  territories over interior ones when deploying/fortifying, MUST work toward
  completing continent control when a reasonable opportunity exists, and MUST
  trade in an available card set at its first opportunity.
- **FR-008**: When capital mode is active, a Medium-difficulty seat MUST weight
  its attack choices toward capturing a weaker opponent's capital when a
  plausible opportunity exists, while keeping its own capital adequately
  defended.
- **FR-009**: System MUST let a seat be configured as Neutral, independently of
  its difficulty tier.
- **FR-010**: A Neutral seat MUST NOT initiate any attack in its attack phase,
  regardless of its assigned difficulty tier or the game state, while still
  performing its other turn actions (deploy, fortify, trade cards, end phase)
  normally.
- **FR-011**: System MUST support a full game reaching a normal conclusion
  (win or elimination sequence) when some or all seats are automated.

### Key Entities

- **Automated Seat Configuration**: The difficulty tier (Easy or Medium) and
  behavior axis (standard or Neutral) assigned to a game seat, independent of
  whether the seat is human- or bot-controlled.
- **Bot Decision**: The single turn action an automated seat chooses for the
  current phase, produced from its assigned configuration and the
  fog-of-war-filtered state it can see.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of actions taken by an automated seat, across a full game,
  are legal given the current game state at the moment taken.
- **SC-002**: A game where every seat is automated reaches a normal win or
  elimination-based conclusion in at least 95% of trial runs, without stalling
  or requiring external intervention.
- **SC-003**: In head-to-head comparison on identical board positions, a
  Medium-difficulty seat avoids initiating unfavorable attacks that an
  Easy-difficulty seat takes, in at least 90% of comparable decision points.
- **SC-004**: A Neutral-configured seat initiates zero attacks across 100% of
  its turns in a full game, regardless of assigned difficulty.
- **SC-005**: An automated seat completes its full turn (all applicable
  phases) within a short, consistent time (target: under 2 seconds of
  decision time per phase) so it does not noticeably slow down the pace of
  play for human co-players.

## Assumptions

- This feature only builds the decision-making ("brain") behind an automated
  seat; it assumes the seat already has a working connection to the game via
  the existing client↔server protocol (feature 001) — it does not implement
  how or when a seat becomes bot-controlled in the first place (that's the
  separate disconnect/timeout-takeover and empty-seat-filling features).
- Hard and Expert difficulty tiers, and any search/lookahead-based play, are
  explicitly out of scope for this feature and deferred to a later roadmap
  item, per docs/SPEC.md.
- The existing bot-configuration UI stubs (seat count, behavior, difficulty
  selectors) already establish the intended user-facing options; this feature
  assumes those selectors are the interface this bot logic is wired to, not a
  new UI design.
- "Favorable troop odds" and similar heuristic judgment calls for the Medium
  tier follow standard Risk strategy conventions (e.g. preferring attacks with
  a meaningful troop advantage) rather than a precisely specified formula,
  consistent with the spec calling this "a single deterministic evaluation,"
  not a tuned/benchmarked algorithm.
- This feature's capital-mode-aware behavior (User Story 2's third scenario,
  FR-008) depends on the separate Capital Mode feature (012) for capital
  assignment/ownership tracking and the "owns all capitals" fact. A prior
  capital-mode implementation existed on a branch that was never merged to
  `main` — capital mode is not currently shipped; 012 (re)builds it from
  scratch. This feature's capital-aware bot behavior has no effect until 012
  exists.
