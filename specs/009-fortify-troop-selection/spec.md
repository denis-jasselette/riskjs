# Feature Specification: Fortify Troop-Count Selection

**Feature Branch**: `009-fortify-troop-selection`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Fortify troop-count selection for RiskJS — let a player choose how many troops to move during their fortify phase, instead of the current hardcoded move-of-exactly-1. At most one move per turn (or none), at least one troop must remain in the source territory, manual end-phase or auto-end right after a move. Multi-hop pathing through owned territory is unchanged."

## Clarifications

### Session 2026-07-23

- Q: Before confirming a fortify move, can the player change their
  source/destination/troop-count selection without it counting as their one
  move for the turn? → A: Yes. Clicking an already-selected source or
  destination territory again deselects it; the troop-count amount can be
  changed freely before confirming. Confirming executes the move and
  immediately ends the phase, after which nothing can be changed. At any
  point before confirming, the player can instead manually end the phase,
  abandoning any partial selection with no troops moved.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Move a chosen number of troops during fortify (Priority: P1)

A player in their fortify phase selects a source and destination territory
they own, chooses how many troops to move between them, and confirms the
move — rather than always moving exactly one troop regardless of what they
intend.

**Why this priority**: This is the entire value of the feature — fortifying
with only ever 1 troop makes the phase nearly useless for meaningfully
repositioning forces, which is central to Risk strategy (e.g. consolidating
troops onto a front-line territory before ending your turn).

**Independent Test**: Select a source territory with several troops and a
valid destination, choose a troop count greater than 1, confirm the move, and
verify the source and destination troop counts changed by exactly that amount.

**Acceptance Scenarios**:

1. **Given** a player has selected a source territory they own with more than
   one troop, and a valid destination territory, **When** they choose to move
   more than one troop and confirm, **Then** that exact number of troops
   moves from the source to the destination.
2. **Given** a source territory has N troops, **When** the player is choosing
   how many to move, **Then** they can choose any amount from 1 up to N−1
   troops (never all N, since at least one troop must remain).
3. **Given** a player attempts to move all of a source territory's troops
   (leaving zero behind), **When** they attempt to confirm that move,
   **Then** the move is not allowed to proceed as specified.

---

### User Story 2 - Skip fortifying entirely (Priority: P2)

A player who doesn't want to move any troops this turn can end their fortify
phase without making any move at all.

**Why this priority**: Necessary for completing a turn when no fortify move
is desired, but it's a simpler, already-largely-supported path compared to
User Story 1's new troop-count selection — included here to confirm it isn't
broken by the change.

**Independent Test**: Enter the fortify phase, make no territory selections,
and end the phase manually; confirm no troop counts changed anywhere on the
board.

**Acceptance Scenarios**:

1. **Given** a player is in their fortify phase and has not selected any
   territories to move troops between, **When** they end the phase manually,
   **Then** no troops move and the turn proceeds to the next player.

---

### User Story 3 - The phase ends automatically right after a move (Priority: P2)

Once a player completes a single fortify move, their fortify phase — and
therefore their turn — ends automatically, without requiring a separate
manual confirmation to end the phase.

**Why this priority**: Preserves the existing "at most one move per turn"
constraint's enforcement mechanism; important for correctness but secondary
to the core troop-count selection capability itself.

**Independent Test**: Complete a valid fortify move and confirm the turn
passes to the next player immediately, without needing to press a separate
"end phase" action afterward.

**Acceptance Scenarios**:

1. **Given** a player has just completed a valid fortify move, **When** the
   move is confirmed, **Then** their turn ends immediately and play passes to
   the next player without requiring any further action from them.
2. **Given** a player has already completed a fortify move this turn, **When**
   the turn logic is evaluated, **Then** no further fortify move is possible
   in that same turn.

---

### Edge Cases

- What happens if a player selects a source territory with exactly 2 troops —
  is the only available move-amount choice "1", since moving 2 would leave
  zero behind?
- A player who selects a source and/or destination, or chooses a troop
  count, can change their mind before confirming: re-clicking a selected
  source or destination territory deselects it, and the troop count can be
  re-chosen freely. None of this counts as their one move for the turn —
  only confirming does.
- How does the troop-count selection behave for a very large troop count
  (e.g. a territory with dozens of troops after a long game) — is there any
  practical upper bound on how the amount is chosen beyond "N−1"?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let a player choose how many troops to move during
  a fortify action, rather than moving a fixed amount.
- **FR-002**: System MUST allow any troop count from 1 up to (source
  territory's current troop count minus 1) to be chosen for a fortify move.
- **FR-003**: System MUST NOT allow a fortify move that would leave the
  source territory with zero troops.
- **FR-004**: System MUST allow at most one fortify move per turn.
- **FR-005**: System MUST allow a player to end their fortify phase without
  making any move at all, including after partially selecting a source,
  destination, or troop count — abandoning that partial selection with no
  troops moved.
- **FR-006**: System MUST automatically end the fortify phase (and the
  player's turn) immediately once a fortify move is completed, without
  requiring a separate manual end-phase action.
- **FR-007**: System MUST continue to allow a fortify move between any two of
  the player's own territories connected by an unbroken chain of territories
  they own, not only directly-adjacent territories (unchanged from current
  behavior).
- **FR-008**: System MUST let a player freely change or clear their source,
  destination, and troop-count selections at any point before confirming a
  fortify move — re-clicking an already-selected source or destination
  territory deselects it — with none of this counting toward the turn's one
  move.
- **FR-009**: Once a player confirms a fortify move, System MUST NOT allow
  any further change to that move.

### Key Entities

- **Fortify Move**: A single action moving a chosen number of troops (at
  least 1, leaving at least 1 behind) from one owned territory to another
  connected owned territory, limited to at most one per turn.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player can successfully move any valid troop count (1 through
  N−1, where N is the source's current troop count) during a fortify move, in
  100% of attempts with a valid source/destination pair.
- **SC-002**: 0% of attempted fortify moves succeed in leaving a source
  territory with zero troops.
- **SC-003**: 100% of turns in which a fortify move is completed advance to
  the next player automatically, with no additional manual step required.
- **SC-004**: 100% of turns in which no fortify move is made can still be
  ended via the manual end-phase action.

## Assumptions

- This feature only changes how many troops a fortify move transfers; the
  underlying rule for which territories can be a valid source/destination
  pair (any two of the player's own territories connected through a chain of
  territories they own) is already correct and unchanged.
- This feature does not touch the deploy or attack phases.
- No maximum troop count beyond "leave at least 1 behind" is imposed — however
  large a territory's troop count grows, the full amount minus 1 remains
  available to move.
