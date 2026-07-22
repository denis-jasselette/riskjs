# Feature Specification: Game Replay

**Feature Branch**: `016-game-replay`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Game Replay for RiskJS — replay a completed game move-by-move using the Action Log (015) as its source of truth, reconstructing board state at each step and letting a viewer step forward and backward through the game's history. Fog of war during replay was an open design question, resolved via clarification: replay always shows the full, unrestricted board regardless of what was hidden during actual play. Depends on the Action Log feature (015) for its data. Excludes mid-game rewind (completed games only), history editing/branching, and export/download."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Watch how a finished game unfolded (Priority: P1)

After a game ends, a player can open its replay and step through the game's
history one action at a time, seeing the board update to match wherever the
replay currently is — rather than only ever seeing the final result.

**Why this priority**: This is the entire value of the feature — without
step-by-step playback, there is no "replay," just a static log of text. This
is what turns the Action Log's raw history into something a player can
actually watch unfold.

**Independent Test**: Complete a game with a mix of deploys, attacks, a
fortify move, and a trade-in, open its replay, and step forward through it,
confirming the board's territory ownership and troop counts accurately match
the state immediately after each action at every step.

**Acceptance Scenarios**:

1. **Given** a completed game, **When** a player opens its replay, **Then**
   they can step forward through the game's logged actions one at a time.
2. **Given** a replay is at some step, **When** that step is an attack,
   fortify move, deploy, or trade-in, **Then** the displayed board state
   (territory ownership, troop counts) accurately reflects the game
   immediately after that action occurred.
3. **Given** a replay has reached its final logged action, **When** the
   viewer tries to step forward again, **Then** there is no further step —
   the replay is at the game's actual concluding state.

---

### User Story 2 - Step backward to review a moment again (Priority: P2)

While viewing a replay, a player can step backward to an earlier point in the
game, not just forward, to re-examine a specific moment (e.g. a pivotal
attack) without restarting the whole replay from the beginning.

**Why this priority**: Meaningfully improves the review experience over a
forward-only playback, but the core value (watching the game unfold) is
already delivered by User Story 1's forward stepping alone.

**Independent Test**: Step forward several actions into a replay, then step
backward, and confirm the board state at each backward step matches the same
state that was shown when originally stepping forward through those same
points.

**Acceptance Scenarios**:

1. **Given** a replay has been stepped forward past its starting point,
   **When** the viewer steps backward, **Then** the board state shown at
   each earlier step matches what was shown when that step was originally
   reached going forward.
2. **Given** a replay is at its very first step, **When** the viewer tries
   to step backward further, **Then** there is no earlier step — this is the
   game's starting state.

---

### Edge Cases

- What happens if a game ended by resignation cascading to a single
  remaining player (no final conquering action) — does the replay's final
  step still land on an accurate concluding board state?
- How does replay handle a very long game with many logged actions — is
  there a practical limit to how far a viewer can step, or any performance
  expectation for jumping to a specific step versus stepping one at a time?
- What happens if a player attempts to open a replay for a game that never
  reached a completed state (e.g. abandoned mid-game) — is replay simply
  unavailable for that game?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let a player open a replay for any completed game,
  reconstructed from that game's Action Log.
- **FR-002**: System MUST let a viewer step forward through a replay one
  logged action at a time.
- **FR-003**: System MUST let a viewer step backward through a replay to any
  previously reached point.
- **FR-004**: At every step, system MUST display a board state (territory
  ownership and troop counts) that accurately reflects the game immediately
  after that step's action.
- **FR-005**: System MUST show the full, unrestricted board state at every
  step of a replay, regardless of what fog of war hid from any player during
  the original game.
- **FR-006**: System MUST NOT allow replay to be opened for a game that has
  not yet reached a completed state — replay applies only to finished games.
- **FR-007**: System MUST NOT allow any editing or branching of a game's
  history through the replay interface — replay is read-only playback.

### Key Entities

- **Replay Session**: A viewer's current position within a completed game's
  Action Log, used to reconstruct and display the board state at that point,
  supporting stepping forward and backward.
- **Reconstructed Board State**: The territory ownership and troop counts
  derived from replaying a game's Action Log up to a given step, always
  shown without fog-of-war restriction.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A viewer can step through 100% of a completed game's logged
  actions, forward and backward, with the displayed board state accurately
  matching the actual game state at each corresponding point.
- **SC-002**: 100% of replay views show the full, unrestricted board at every
  step, with zero fog-of-war filtering applied regardless of the original
  game's settings.
- **SC-003**: 0% of in-progress (not yet completed) games can have their
  replay opened.

## Assumptions

- Fog of war during replay was an explicit open design question; resolved by
  stakeholder decision to always show the full, unrestricted board at every
  step, rather than reconstructing each original viewer's historical
  fog-of-war-limited perspective. This avoids needing to track or
  reconstruct per-player historical visibility, and treats a completed
  game's replay the same way an unrestricted spectator view would be
  treated.
- This feature depends on the Action Log feature (015) as its sole data
  source; it does not define or change what gets logged, only how a
  completed game's log is played back.
- Whether replay includes richer presentation (e.g. battle animations,
  dice-roll replays) versus a simpler textual/board-state stepper is an
  implementation-level decision, not a scope decision — the requirement is
  accurate, navigable board-state reconstruction at every step.
- Mid-game rewind (viewing replay-style navigation of a game still in
  progress) is out of scope; replay applies only to games that have already
  concluded.
- No export or download capability is included, consistent with the Action
  Log feature's same exclusion.
