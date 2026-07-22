# Feature Specification: Reinforcement Calculation

**Feature Branch**: `008-reinforcement-calculation`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Reinforcement calculation overhaul for RiskJS — replace the current flat 3-troops-per-turn reinforcement with territory rule (max(3, floor(territories/3))) + continent rule (per-continent bonus, configurable per map, ignoring blizzard-locked territories when checking full control) + capital rule (+2 per capital owned, 0 when capital mode is off). Resigned players' territories still count as owned for other players' continent-control checks. Foundational — works standalone with zero capitals; the capital bonus only activates once Capital Mode exists."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reinforcements grow with territory held (Priority: P1)

At the start of each turn, a player receives reinforcement troops that scale
with how much of the map they control, rather than always receiving the same
fixed amount regardless of how the game has gone.

**Why this priority**: This is the foundational rule change — without it,
holding more territory has no reinforcement benefit at all, which is a
significant departure from how the game is meant to play and undermines every
strategic decision built around territorial expansion.

**Independent Test**: Give a player a small number of territories and confirm
they receive the minimum reinforcement; give another player a large number of
territories and confirm their reinforcement is proportionally higher.

**Acceptance Scenarios**:

1. **Given** a player owns fewer than 9 territories, **When** their turn
   begins, **Then** they receive the minimum reinforcement amount (3) from
   the territory rule.
2. **Given** a player owns enough territories to exceed the minimum (e.g. 12
   territories), **When** their turn begins, **Then** their territory-rule
   reinforcement increases by 1 for every additional group of 3 territories
   owned.

---

### User Story 2 - Controlling a whole continent earns a bonus (Priority: P1)

A player who owns every non-frozen territory in a continent receives extra
reinforcement troops for that continent, on top of their territory-based
reinforcement, with the bonus amount depending on which continent it is.

**Why this priority**: Continent bonuses are a core strategic incentive in
Risk — without them, there's no reward for consolidating control of a region,
which is one of the primary tension points the game is built around. Equal
priority to User Story 1 since both combine into the same per-turn total.

**Independent Test**: Have a player own every territory in one continent
(with a defined bonus value) and confirm their reinforcement includes that
continent's bonus on top of the territory-rule amount; have a player own all
but one territory in a continent and confirm no bonus is awarded for it.

**Acceptance Scenarios**:

1. **Given** a player owns every non-frozen territory in a continent,
   **When** their turn begins, **Then** their reinforcement includes that
   continent's configured bonus amount.
2. **Given** a player owns all but one territory in a continent, and that
   missing territory is not frozen by a blizzard, **When** their turn
   begins, **Then** they do not receive that continent's bonus.
3. **Given** a continent has one territory currently frozen by a blizzard and
   a player owns every other territory in it, **When** their turn begins,
   **Then** they receive that continent's bonus anyway — the frozen
   territory does not count against full control.
4. **Given** a player owns every non-frozen territory in two different
   continents, **When** their turn begins, **Then** their reinforcement
   includes both continents' bonus amounts, summed.

---

### User Story 3 - Owning capitals adds to reinforcement (Priority: P2)

When capital mode is active and a player currently owns one or more capital
territories, their reinforcement includes an additional amount for each
capital they hold.

**Why this priority**: Depends on capital territories existing as a concept
at all (introduced by the separate Capital Mode feature) — this story only
matters once that feature exists, so it's appropriately lower priority than
the two rules that apply in every game.

**Independent Test**: With capital mode active and a player owning a known
number of capital territories, confirm their reinforcement includes the
correct additional amount for capitals owned; with capital mode inactive,
confirm no such amount is ever added.

**Acceptance Scenarios**:

1. **Given** capital mode is active and a player owns one capital territory,
   **When** their turn begins, **Then** their reinforcement includes the
   configured per-capital bonus for that one capital.
2. **Given** capital mode is active and a player owns multiple capital
   territories, **When** their turn begins, **Then** their reinforcement
   includes the per-capital bonus multiplied by the number of capitals owned.
3. **Given** capital mode is inactive, **When** any player's turn begins,
   **Then** their reinforcement includes no capital-related amount at all.

---

### Edge Cases

- What happens when a player owns zero territories at the moment their
  reinforcement would be calculated (should not occur in practice since
  owning zero territories means elimination, but the calculation should not
  produce a negative or undefined result if evaluated)?
- How does the continent-control check behave for a continent where every
  single territory is currently frozen by a blizzard — does "own everything
  that isn't frozen" trivially count as full control (an empty requirement
  satisfied vacuously), or should a continent with zero unfrozen territories
  never award its bonus to anyone?
- What happens if a resigned player still owns every non-frozen territory in
  a continent — since resigned players don't receive reinforcements
  themselves, does the continent-control check simply never run for them, or
  could this scenario matter for another rule?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST calculate a player's start-of-turn reinforcement as
  the sum of a territory-based amount, a continent-control bonus amount, and
  a capital-ownership bonus amount.
- **FR-002**: The territory-based amount MUST equal the greater of 3, or the
  number of territories the player owns divided by 3 and rounded down.
- **FR-003**: System MUST award a continent-control bonus for each continent
  in which the player owns every territory that is not currently frozen by a
  blizzard, using a bonus amount defined per continent in the map's
  configuration data.
- **FR-004**: System MUST exclude blizzard-frozen territories entirely from a
  continent's full-control check — a player does not need to own a frozen
  territory for that continent to count as fully controlled.
- **FR-005**: System MUST sum the continent-control bonus across every
  continent the player fully controls, not just award one continent's bonus.
- **FR-006**: System MUST treat a resigned player's remaining territories as
  normally owned when evaluating whether another player fully controls a
  continent — resigned-player territories are not excluded from the
  full-control check the way blizzard-frozen territories are.
- **FR-007**: System MUST award a capital-ownership bonus of a fixed amount
  per capital territory the player currently owns, summed across all capitals
  they own.
- **FR-008**: System MUST NOT award any capital-ownership bonus when capital
  mode is not active for the current game, or when the player owns no capital
  territories.
- **FR-009**: System MUST recalculate this full reinforcement amount fresh at
  the start of every turn, reflecting the player's current territories,
  continent control, and capitals owned at that moment — not a cached or
  turn-independent value.

### Key Entities

- **Reinforcement Total**: The sum of territory, continent, and capital
  amounts calculated fresh at the start of a player's turn, determining how
  many troops they have available to deploy that turn.
- **Continent Bonus Configuration**: A per-continent bonus value, defined as
  part of a map's configuration data, used when checking full control.
- **Capital Ownership Count**: The number of capital territories a player
  currently owns, supplied by the separate Capital Mode feature as an input
  to this calculation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player's reinforcement never falls below 3 troops, regardless
  of how few territories they own.
- **SC-002**: A player's territory-based reinforcement increases by exactly 1
  for every additional 3 territories owned, verified across a range of
  territory counts.
- **SC-003**: 100% of continents a player fully (non-frozen-territory)
  controls contribute their configured bonus to that player's reinforcement;
  0% of continents with at least one non-frozen territory owned by another
  player contribute anything.
- **SC-004**: A player's reinforcement never includes any capital-related
  amount in a game where capital mode is off.
- **SC-005**: Reinforcement totals correctly reflect changes in a player's
  territory count, continent control, and capital ownership from the
  immediately preceding turn — e.g. capturing a continent-completing
  territory on turn N visibly increases that player's reinforcement on
  turn N+1 (their next turn).

## Assumptions

- This feature depends only on already-existing territory-ownership and
  blizzard-location data; it does not require the separate Capital Mode
  feature to exist first — the capital-ownership input defaults to zero
  capitals (contributing nothing) until Capital Mode is built.
- Continent bonus *values* are authored as map configuration data (e.g. in
  the classic map's config file); defining or tuning those specific numbers
  for a given map is a content/data task, not part of this behavior spec.
- Card trade-in bonus troops are a separate mechanism (covered by a distinct
  Card System feature) and are not part of this once-per-turn base
  reinforcement calculation.
- A continent with zero non-frozen territories (fully blizzard-locked) is
  treated as impossible to award a bonus for, since there is nothing to
  meaningfully "control" — this is a boundary case expected to be rare to
  nonexistent given how few territories are frozen at once, not a scenario
  requiring special-cased handling beyond not producing an erroneous bonus.
