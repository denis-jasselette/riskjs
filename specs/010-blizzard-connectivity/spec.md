# Feature Specification: Blizzard Connectivity Guarantee

**Feature Branch**: `010-blizzard-connectivity`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Blizzard connectivity guarantee for RiskJS — blizzard placement at game setup must never split the playable map into disconnected regions. Currently territories are chosen purely at random with no connectivity check. This changes which specific territories get selected as frozen, not how many (the configured blizzard count is unchanged), and doesn't touch any other blizzard behavior (pathing exclusion, continent-control exclusion, selectability) which are already correct."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every territory remains reachable despite blizzards (Priority: P1)

At the start of a game with blizzards enabled, the territories chosen to be
frozen are selected such that every non-frozen territory can still be reached
from every other non-frozen territory by moving through non-frozen territory —
no group of territories is ever cut off from the rest of the map.

**Why this priority**: This is the entire purpose of the feature — without
this guarantee, a random blizzard placement could split the map into isolated
pockets, permanently trapping whichever players start there with no way to
attack out or fortify across the divide, which would make the affected game
unplayable rather than just harder.

**Independent Test**: Start many games with blizzards enabled on the same
map, and for each one, verify that every non-frozen territory can reach every
other non-frozen territory through a path of non-frozen territories.

**Acceptance Scenarios**:

1. **Given** a game is being set up with blizzards enabled, **When** blizzard
   territories are selected, **Then** every territory not selected as frozen
   remains reachable from every other non-frozen territory via a path through
   only non-frozen territories.
2. **Given** a map where some random selections of frozen territories would
   split the map into two or more disconnected groups, **When** blizzard
   territories are selected for a new game, **Then** such a splitting
   selection is never produced as the final result.
3. **Given** blizzards are disabled for a game, **When** the game is set up,
   **Then** no connectivity check applies at all (there are no frozen
   territories to consider).

---

### Edge Cases

- What happens if the configured blizzard count for a map is high enough that
  no valid, fully-connectivity-preserving selection of that many territories
  exists at all — does setup fall back to a smaller valid selection, retry
  with a different random selection, or is this considered a map-configuration
  error to be avoided by whoever authors that map's blizzard count?
- How does the connectivity check behave on a map with a naturally
  disconnected layout to begin with (unlikely for the classic map, but a
  future map might not guarantee full connectivity even with zero blizzards)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST select which territories become frozen (blizzard)
  at game setup such that every non-frozen territory remains connected to
  every other non-frozen territory through a path of exclusively non-frozen
  territories.
- **FR-002**: System MUST NOT produce a blizzard selection that leaves any
  non-frozen territory unreachable from any other non-frozen territory.
- **FR-003**: System MUST continue to select exactly the number of blizzard
  territories configured for the map being played — this feature changes
  which territories are chosen, not how many.
- **FR-004**: System MUST perform no connectivity-related selection logic at
  all when blizzards are disabled for a game.

### Key Entities

- **Blizzard Selection**: The specific set of territories chosen as frozen
  for a given game, constrained to never disconnect the remaining playable
  map.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of games started with blizzards enabled result in a fully
  connected non-frozen map — every non-frozen territory reachable from every
  other non-frozen territory.
- **SC-002**: 0% of games ever start with a player's owned territories (or
  any territory) isolated into an unreachable pocket due to blizzard
  placement.
- **SC-003**: The number of territories frozen per game continues to exactly
  match the map's configured blizzard count in 100% of games.

## Assumptions

- This feature only changes the selection logic for which territories become
  frozen; it does not change the count of blizzards (a map configuration
  value), nor any other already-correct blizzard behavior (blocking
  attack/fortify pathing through frozen territories, exclusion from
  continent-control checks, non-selectability).
- The classic map's existing configuration (42 territories, 3 blizzards) is
  assumed to always have a valid, fully-connected selection available; a map
  authored with a blizzard count too high to preserve connectivity is
  considered a map-configuration issue outside this feature's scope, not a
  runtime case this feature needs to gracefully handle with a fallback.
