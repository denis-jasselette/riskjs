# Feature Specification: Post-Conquest Troop Movement

**Feature Branch**: `024-post-conquest-troop-movement`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Post-Conquest Troop Movement for RiskJS — after a successful attack conquers a territory, let the attacking player choose how many troops move from the source into the newly conquered territory, bounded between the dice count used in the winning roll (minimum) and leaving at least 1 troop behind in the source (maximum), defaulting to the maximum. Currently the engine automatically moves everyone over, leaving no choice. Separate from and doesn't consume the fortify-phase move (009). Interacts with, but doesn't modify, the online gameplay protocol (001) — flagged as a likely follow-up drift-fix there."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose how many troops occupy a newly conquered territory (Priority: P1)

Immediately after a player's attack successfully conquers a territory, that
player chooses how many troops move from the attacking territory into the
newly conquered one, rather than the game automatically moving everyone
over.

**Why this priority**: This is the entire point of the feature — without
it, a meaningful tactical decision (how much force to commit forward versus
keep behind to defend) is made automatically by the game instead of by the
player, which is a real gap versus how the rest of combat already works.

**Independent Test**: Conquer a territory with several surviving attacking
troops, and confirm the player is offered a choice of how many to move in
before the game proceeds, rather than all of them moving automatically.

**Acceptance Scenarios**:

1. **Given** an attack successfully conquers a territory, **When** the
   attack resolves, **Then** the attacking player is presented with a choice
   of how many troops to move into the newly conquered territory.
2. **Given** the player is choosing how many troops to move, **When** they
   select a valid amount within the allowed range and confirm, **Then**
   exactly that many troops move into the conquered territory and the rest
   remain in the source.
3. **Given** the troop-movement choice has not yet been resolved for a
   conquest, **When** the player attempts any further action for that turn
   (e.g. selecting another attack), **Then** they cannot proceed until the
   choice is resolved.

---

### User Story 2 - The choice is bounded correctly (Priority: P1)

The number of troops the player can choose to move in is limited to a valid
range: at least as many as the dice used in the winning attack roll, and at
most leaving exactly 1 troop behind in the source territory.

**Why this priority**: Equally essential to User Story 1 — an unbounded or
incorrectly bounded choice would either violate the "at least 1 troop always
remains" rule that governs every other territory in the game, or violate the
"must move at least the deciding dice count" rule that gives the choice its
lower bound. Both bounds must hold for the choice to be meaningful and
correct.

**Independent Test**: Conquer a territory using a specific dice count in the
winning roll, and confirm the offered range's minimum matches that dice
count and its maximum leaves exactly 1 troop behind in the source; attempt
to select a value outside that range and confirm it is not accepted.

**Acceptance Scenarios**:

1. **Given** a winning attack roll used N dice, **When** the troop-movement
   choice is presented, **Then** the minimum selectable amount is N.
2. **Given** the source territory has T troops remaining immediately after
   the attack resolves, **When** the troop-movement choice is presented,
   **Then** the maximum selectable amount is T-1, leaving at least 1 troop
   behind.
3. **Given** the troop-movement choice is presented, **When** the player
   attempts to select an amount below the minimum or above the maximum,
   **Then** that selection is not accepted.

---

### User Story 3 - Moving the maximum happens by default (Priority: P2)

If the player takes no action to change the offered amount, the maximum
allowed number of troops moves into the conquered territory automatically.

**Why this priority**: A convenience that preserves today's existing
behavior (moving everyone forward) as the default outcome, so players who
don't care to fine-tune this decision aren't slowed down — but it's
secondary to the core choice mechanic and its bounds (User Stories 1-2)
actually existing.

**Independent Test**: Conquer a territory and, without adjusting the
offered troop count, confirm the game proceeds with the maximum amount moved
in, matching today's existing automatic behavior.

**Acceptance Scenarios**:

1. **Given** a territory has just been conquered, **When** the
   troop-movement choice is presented, **Then** it defaults to the maximum
   allowed amount.
2. **Given** the player accepts the default without changing it, **When**
   they confirm, **Then** the maximum allowed number of troops moves into
   the conquered territory.

---

### Edge Cases

- Could the minimum bound (dice used in the winning roll) ever exceed the
  maximum bound (troops remaining minus 1), making the choice infeasible?
  No — given how the existing combat resolution already works, the decisive
  final attack roll (the one that reduces the defender to exactly 0 troops)
  mathematically never costs the attacker any losses in that same round, so
  the minimum can never exceed the maximum in practice; no fallback handling
  for a bounds conflict is needed.
- What happens if the minimum and maximum bounds are equal (only one valid
  amount) — is the choice simply presented with a single fixed value rather
  than a range to adjust?
- What happens if the player attempts to end their attack phase or take
  another action while a troop-movement choice is still unresolved — is that
  action blocked until the choice is confirmed (consistent with User Story
  1's third acceptance scenario)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST present the attacking player with a choice of how
  many troops to move into a territory immediately after their attack
  successfully conquers it.
- **FR-002**: The minimum selectable amount MUST equal the number of dice
  used in the winning (final, decisive) attack roll.
- **FR-003**: The maximum selectable amount MUST leave at least 1 troop
  remaining in the source territory — i.e. equal to the total troops
  remaining in the source territory immediately after the attack resolves,
  minus 1.
- **FR-004**: System MUST let the player choose any amount within the
  minimum and maximum bounds (inclusive) and MUST NOT accept a selection
  outside that range.
- **FR-005**: System MUST default the troop-movement choice to the maximum
  allowed amount if the player takes no action to change it.
- **FR-006**: System MUST move exactly the chosen number of troops into the
  newly conquered territory and leave the remainder in the source territory.
- **FR-007**: System MUST require this troop-movement choice to be resolved
  before the attacking player can take any further action that turn.
- **FR-008**: This troop-movement choice MUST be entirely separate from the
  player's fortify-phase troop move (feature 009) — it MUST NOT count
  toward, consume, or otherwise interact with that separate one-move-per-turn
  allowance.

### Key Entities

- **Post-Conquest Troop Movement Choice**: The attacking player's decision,
  made once per successful conquest, of how many troops move from the
  source territory into the newly conquered territory, bounded between the
  winning roll's dice count (minimum) and leaving 1 troop behind in the
  source (maximum), defaulting to the maximum.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of successful conquests present the attacking player with
  a troop-movement choice, rather than automatically moving a fixed amount
  without any choice.
- **SC-002**: 100% of presented choices correctly bound the minimum to the
  winning roll's dice count and the maximum to leaving exactly 1 troop
  behind in the source.
- **SC-003**: 0% of attempted selections outside the valid range are
  accepted.
- **SC-004**: 100% of unmodified (default-accepted) choices result in the
  maximum allowed number of troops moving into the conquered territory.
- **SC-005**: 100% of conquests correctly block further player action until
  the troop-movement choice is resolved.

## Assumptions

- This feature depends on the existing attack/combat resolution logic,
  which is unchanged — it only adds a player choice at the moment of
  conquest, after combat has already been resolved.
- This feature is unrelated to and does not modify the separate
  fortify-phase troop movement (009); a player still gets exactly one
  fortify move per turn, entirely independent of however many post-conquest
  troop-movement choices they made earlier that same turn.
- This feature interacts with the online gameplay protocol (feature 001),
  which currently has no action or step representing this post-conquest
  choice — flagged here as a likely follow-up drift-fix to that
  specification (similar to the capital-placement and resign additions made
  there previously), but not addressed as part of this spec.
- The mathematical guarantee that the minimum bound never exceeds the
  maximum bound (see Edge Cases) is a property of the existing dice-combat
  resolution logic, not a new rule this feature introduces or needs to
  separately enforce.
