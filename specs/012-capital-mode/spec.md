# Feature Specification: Capital Mode

**Feature Branch**: `012-capital-mode`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Capital Mode for RiskJS — a selectable game mode where each player places a capital on one of their own territories during a round-1 placement step (gaining +2 troops there immediately), capital ownership feeds the Reinforcement Calculation feature's capital bonus, capital territories get one extra defending die when troop count allows, and the win condition becomes owning every player's capital. A prior implementation existed on an unmerged branch and never shipped; this rebuilds it. Depends on Reinforcement Calculation (008) for the bonus arithmetic; is a dependency of Win Conditions & Elimination (013) for the capital win condition."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose a capital at the start of the game (Priority: P1)

At the very beginning of a capital-mode game, before normal turns begin, each
player — in turn order — chooses one of their own starting territories to be
their capital, and that territory immediately gains 2 troops.

**Why this priority**: This is the foundational setup step every other
capital-mode mechanic depends on — without a capital assigned, there's
nothing for the reinforcement bonus, the extra defending die, or the win
condition to reference.

**Independent Test**: Start a game with capital mode enabled, have each
player choose one of their territories as their capital in turn order, and
confirm each chosen territory's troop count increases by 2 immediately upon
being chosen.

**Acceptance Scenarios**:

1. **Given** a new game has capital mode enabled, **When** play begins,
   **Then** each player is given the opportunity, in turn order, to choose
   one of their own territories as their capital before any normal turn
   begins.
2. **Given** a player is choosing their capital, **When** they select one of
   their own territories, **Then** that territory's troop count increases by
   2 immediately.
3. **Given** a player has already chosen their capital, **When** the next
   player's placement turn arrives, **Then** they independently choose a
   capital from among their own territories, unaffected by others' choices.
4. **Given** every player has chosen a capital, **When** the placement step
   concludes, **Then** normal turn-based play (deploy/attack/fortify) begins
   as usual.

---

### User Story 2 - Capitals feed into reinforcement (Priority: P2)

Once the game is underway, a player who owns one or more capitals (their own,
or one captured from an opponent) has that reflected in how much reinforcement
they receive at the start of their turn.

**Why this priority**: Builds directly on the placement step from User Story
1; the actual bonus arithmetic lives in the separate Reinforcement Calculation
feature, so this story is specifically about this feature correctly exposing
"how many capitals does this player currently own" as accurate, live input to
that calculation.

**Independent Test**: With capital mode active, capture an opponent's capital
territory and confirm the capturing player's next-turn reinforcement
calculation reflects an additional capital owned.

**Acceptance Scenarios**:

1. **Given** capital mode is active, **When** any player's turn begins,
   **Then** the number of capital territories they currently own (their own
   and/or any captured) is available as accurate input to the reinforcement
   calculation.
2. **Given** a player captures a territory that is a capital, **When**
   ownership transfers, **Then** the new owner's capital-ownership count
   immediately reflects that capital from that point forward.

---

### User Story 3 - Capitals defend more strongly (Priority: P2)

When a battle is fought against a territory that has a capital on it, that
territory can defend with one more die than its troop count would otherwise
allow, provided the troop count actually supports the extra die.

**Why this priority**: A meaningful in-battle advantage that makes capitals
worth defending, independent of the placement and reinforcement mechanics —
can be built and tested on its own once a capital exists on the board.

**Independent Test**: Attack a capital territory with enough defending troops
to normally allow 2 dice, and confirm the defender can roll a 3rd die; attack
a capital territory with too few troops to support a 3rd die even with the
bonus, and confirm it is capped at what the troop count allows.

**Acceptance Scenarios**:

1. **Given** a territory with a capital has enough troops that its normal cap
   would be 2 defending dice, **When** it is attacked, **Then** it can defend
   with 3 dice.
2. **Given** a territory with a capital has too few troops to normally
   support 2 dice (i.e. only 1 troop), **When** it is attacked, **Then** the
   capital bonus does not let it exceed what its troop count actually
   supports.
3. **Given** a territory has no capital on it, **When** it is attacked,
   **Then** its defending dice are capped exactly as today, with no bonus
   die.

---

### User Story 4 - Owning every capital is exposed as a fact (Priority: P2)

At any point during a capital-mode game, it's possible to determine whether a
given player currently owns every capital in the game — the actual
territory-by-territory capital and ownership state makes this determinable at
any time.

**Why this priority**: This feature's responsibility is to make "does this
player own every capital" a correctly computable fact; the separate Win
Conditions & Elimination feature is responsible for acting on that fact to
actually end the game. Lower priority than the mechanics above since it has
no visible effect until that other feature consumes it.

**Independent Test**: Arrange a capital-mode game so one player captures
every other player's capital, and confirm that "this player owns every
capital in the game" is correctly determinable as true at that moment (and
false at every prior moment).

**Acceptance Scenarios**:

1. **Given** a capital-mode game where each capital's current owner is
   tracked, **When** a query is made for whether a specific player owns every
   capital, **Then** the answer accurately reflects the current ownership of
   every capital in the game.
2. **Given** a player owns all but one capital, **When** the same query is
   made, **Then** it accurately reflects that they do not yet own every
   capital.

---

### Edge Cases

- What happens if a player is defeated or resigns after placing their
  capital — does their capital territory simply follow normal
  territory-capture rules (whoever conquers it becomes its owner), with no
  special capital-specific transfer behavior?
- What happens to the round-1 placement step in a 2-player game versus a
  6-player game — does turn order for placement simply follow the same
  player order used for normal turns?
- What happens if a player's only remaining territory at some point in the
  game happens to be their capital — does anything change about how that
  territory is treated compared to any other last-remaining territory?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST, only when capital mode is enabled for a game,
  require each player to choose one of their own territories as their
  capital during a one-time placement step at the start of the game, before
  normal turn-based play begins.
- **FR-002**: System MUST process capital placement in the same turn order
  used for normal play, one player at a time.
- **FR-003**: System MUST immediately add 2 troops to a territory the moment
  it is chosen as that player's capital.
- **FR-004**: System MUST track, at all times during a capital-mode game,
  which territory is each player's capital and who currently owns it.
- **FR-005**: System MUST update a capital's tracked owner immediately when
  the territory it sits on changes ownership through normal territory
  capture — capitals have no special elimination-transfer behavior beyond
  ordinary territory capture.
- **FR-006**: System MUST make the count of capital territories a player
  currently owns available as accurate, current-state input to the
  reinforcement calculation at the start of every turn.
- **FR-007**: System MUST allow a territory with a capital to defend with one
  additional die beyond what its troop count would otherwise allow, capped by
  what its current troop count actually supports.
- **FR-008**: System MUST NOT apply the extra defending die to any territory
  without a capital.
- **FR-009**: System MUST make it possible to determine, at any point in a
  capital-mode game, whether a specific player currently owns every capital
  in the game.
- **FR-010**: System MUST NOT perform any capital placement, reinforcement
  input, extra defending die, or "owns all capitals" determination when
  capital mode is not enabled for a game.

### Key Entities

- **Capital Assignment**: The one-time, per-player choice of which owned
  territory becomes their capital, made during the round-1 placement step.
- **Capital Ownership State**: The live, always-current mapping of each
  capital territory to whichever player currently owns it, updated on every
  relevant territory capture.
- **Capital Combat Bonus**: The one extra defending die a capital territory
  is entitled to, subject to the normal troop-count cap on dice.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of capital-mode games require every player to choose a
  capital before their first normal turn begins.
- **SC-002**: 100% of chosen capital territories show a +2 troop increase
  immediately upon selection.
- **SC-003**: The capital-ownership count used by the reinforcement
  calculation is accurate (reflecting the current board state) at the start
  of every turn, in 100% of turns.
- **SC-004**: 100% of battles against a capital territory with sufficient
  troops allow one more defending die than the same territory would get
  without a capital.
- **SC-005**: "Does this player own every capital" is correctly answerable at
  any point in a capital-mode game, with 100% accuracy against the actual
  current ownership of every capital.
- **SC-006**: 0% of non-capital-mode games exhibit any capital-related
  behavior (no placement step, no reinforcement input, no extra defending
  die, no capital-ownership tracking).

## Assumptions

- This feature depends on the already-specified Reinforcement Calculation
  feature (008) to turn "capitals owned" into actual bonus troops — this
  feature is only responsible for producing an accurate capital-ownership
  count, not the arithmetic.
- This feature is a dependency of the separate, already-being-specified Win
  Conditions & Elimination feature (013), which is responsible for acting on
  the "owns all capitals" fact to actually end the game; this feature only
  exposes that fact.
- A prior capital-mode implementation existed on a branch that was never
  merged to `main`; this feature rebuilds the mechanic from the brainstormed
  ruleset rather than resuming that abandoned branch's code.
- Card trade-in bonuses, deploy/attack/fortify phase mechanics beyond the
  capital-specific additions described here, and anything about the game's
  card system are out of scope for this feature.
