# Feature Specification: Capital Counter UI

**Feature Branch**: `017-capital-counter-ui`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Capital Counter UI for RiskJS — a single, global, display-only indicator visible only in capital-mode games, showing the highest number of capitals currently owned by any one player, out of the total capitals in the game (e.g. 'Leader: 3/6'), updating immediately whenever that maximum changes. Deliberately anonymized (never reveals which player holds the lead) — a controlled hint through fog of war. Hidden for the first 3 rounds after the capital-placement round, during which a simple round counter ('Round: 2') is shown instead. Surfaces data already tracked by Capital Mode (012); does not compute or change anything."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See a round counter early in the game (Priority: P1)

During the first three rounds of a capital-mode game following the initial
capital-placement round, players see a simple round counter (e.g.
"Round: 2") instead of any capital-related information.

**Why this priority**: This is the baseline display state for the opening
of a capital-mode game — before establishing what shows afterward (User
Story 2), the game needs a defined, non-revealing display for this early
window, since a leader capital count wouldn't yet mean much (everyone still
holds only their own capital in the first few rounds).

**Independent Test**: Start a capital-mode game, complete the capital-
placement round, and confirm the display shows a round counter (not any
capital count) through the first three following rounds, incrementing each
round.

**Acceptance Scenarios**:

1. **Given** a capital-mode game has just finished its capital-placement
   round, **When** the first following round begins, **Then** the display
   shows the current round number rather than any capital-related count.
2. **Given** the game is in round 2 or round 3 following the
   capital-placement round, **When** a player views the display, **Then**
   it shows that current round number.
3. **Given** capital mode is not active for a game, **When** any player
   views the display, **Then** neither the round counter nor any capital
   count is shown.

---

### User Story 2 - See the leading capital count as the game progresses (Priority: P1)

Starting with the fourth round following the capital-placement round, the
round counter is replaced by a single, global indicator showing the highest
number of capitals currently owned by any one player, out of the total
number of capitals in the game — without identifying which player holds
that lead.

**Why this priority**: This is the actual point of the feature — a
deliberate, controlled hint that gives every player some insight into how
the game is progressing despite fog of war otherwise hiding capital
ownership entirely. Sequenced after User Story 1 since the switchover
timing depends on it, but equally essential to the feature's purpose.

**Independent Test**: Progress a capital-mode game to its fourth round
following capital placement, confirm the display switches from the round
counter to a leader capital count, then capture a capital such that the
single-player maximum changes, and confirm the displayed count updates
immediately without identifying who now holds the lead.

**Acceptance Scenarios**:

1. **Given** a capital-mode game reaches its fourth round following the
   capital-placement round, **When** the display is checked, **Then** it now
   shows the highest number of capitals currently owned by any one player,
   out of the total capitals in the game (e.g. "Leader: 3/6"), instead of
   the round counter.
2. **Given** the displayed leader count is showing, **When** a capital
   changes ownership such that the single-player maximum changes, **Then**
   the displayed count updates immediately to reflect the new maximum.
3. **Given** the leader capital count is displayed, **When** any player
   views it, **Then** they cannot determine which specific player currently
   holds that leading count — only the count itself is shown.
4. **Given** the leader capital count has begun being displayed, **When**
   further rounds pass, **Then** the display never reverts back to showing
   the round counter.

---

### Edge Cases

- What happens if two or more players are currently tied for the highest
  capital count — does the display simply show that tied value, with no
  indication that a tie exists or of how many players share it? -> Yes, just show the value.
- What happens to the leader count the moment a game transitions from round
  3 to round 4 if no capital has changed hands yet — does it correctly show
  the baseline value (e.g. 1/6, since every player still holds only their
  own capital)? -> Show the value as it is calculated, 1/6 is a valid case.
- Does round counting continue advancing normally even if a player is
  defeated or resigns partway through the early rounds? -> Rounds continue advancing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display, in a capital-mode game only, either a
  round counter or a global leader capital count — never both at once, and
  never a per-player breakdown.
- **FR-002**: During the first three rounds following the capital-placement
  round, system MUST display the current round number instead of any
  capital-count information.
- **FR-003**: Starting with the fourth round following the
  capital-placement round, system MUST display a single, global count of
  the highest number of capitals currently owned by any one player, out of
  the total number of capitals in the game.
- **FR-004**: Once the leader capital count begins being displayed, system
  MUST NOT revert to displaying the round counter for the remainder of the
  game.
- **FR-005**: The leader capital count MUST NOT reveal which specific
  player currently holds the leading count — only the numeric value.
- **FR-006**: System MUST update the displayed leader capital count
  immediately whenever the highest number of capitals held by any single
  player changes.
- **FR-007**: System MUST NOT display the round counter or the leader
  capital count in a game where capital mode is not active.

### Key Entities

- **Round Counter**: The current round number in a capital-mode game,
  counted starting immediately after the capital-placement round, used to
  gate when the leader capital count becomes visible.
- **Leader Capital Count**: A single, global, anonymized figure — the
  highest number of capitals currently owned by any one player, out of the
  game's total capitals — shown from the fourth round onward without
  identifying which player holds it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of capital-mode games display a round counter (not the
  leader capital count) during the first three rounds following the
  capital-placement round.
- **SC-002**: 100% of capital-mode games switch to displaying the leader
  capital count starting with the fourth round following the
  capital-placement round, and never revert afterward.
- **SC-003**: 100% of changes to the highest single-player capital count are
  reflected in the displayed leader count immediately, with no stale or
  delayed values.
- **SC-004**: 0% of leader capital count displays reveal which specific
  player currently holds the leading count.
- **SC-005**: 0% of non-capital-mode games display either the round counter
  or the leader capital count.

## Assumptions

- This feature is purely a display layer over data already tracked by the
  Capital Mode feature (012) — which territory is each player's capital and
  who currently owns it. It introduces no new capital-ownership tracking,
  computation, or rule, and does not touch the win-condition check owned by
  feature 013.
- A "round" means one complete cycle in which every player has taken a turn
  once, consistent with the "round 1" capital-placement terminology already
  used in feature 012; round counting for this feature begins immediately
  after that placement round concludes.
- This is a deliberate, small, controlled information leak through fog of
  war — revealing only the peak capital count as an anonymized aggregate,
  never identity or which specific territories are involved — intended to
  give every player some insight into how the game is progressing despite
  fog of war otherwise hiding capital ownership entirely.
- The total capital count shown ("out of N") equals the number of players in
  the game, consistent with Capital Mode assigning exactly one capital per
  player during round-1 placement.
- This corrects an earlier draft of this spec that described a per-player
  capital-count display; that was a misunderstanding of the intended design
  — the actual feature is the single, global, anonymized leader count
  described above, gated behind the 3-round reveal delay.
