# Feature Specification: Action Log

**Feature Branch**: `015-action-log`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Action Log for RiskJS — a running, visible, scrollable history of every significant action taken during a game (deploys, attacks with outcome, fortify moves, card trade-ins, phase/turn changes, capital placements, resignations, eliminations), shown during and after the game, in both local and online play, respecting fog of war for online games. Groundwork for a later Game Replay feature. Excludes replay itself, durable cross-session persistence, and export/download."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Follow what's happened so far in the game (Priority: P1)

A player can open a scrollable history panel at any point during a game and
see every significant action taken so far — who did what, to which
territory or territories, and the result where applicable — in the order it
happened.

**Why this priority**: This is the entire value of the feature — without a
readable, chronological account of what's occurred, players (especially
returning to a game after a distraction, or joining an in-progress
conversation about strategy) have no way to reconstruct recent events beyond
their own memory.

**Independent Test**: Play through several turns performing a mix of
deploys, an attack, a fortify move, and a card trade-in, then open the
history panel and confirm every one of those actions appears, in order, with
enough detail to understand what happened.

**Acceptance Scenarios**:

1. **Given** a game has had several actions taken, **When** a player opens
   the history panel, **Then** they see each action listed in the order it
   occurred.
2. **Given** an attack occurred, **When** its log entry is shown, **Then** it
   identifies the attacker, the source and destination territories, and the
   outcome (troops lost on each side, and whether the territory was
   captured).
3. **Given** a card trade-in occurred, **When** its log entry is shown,
   **Then** it identifies who traded in and the resulting troop bonus.
4. **Given** a phase or turn change, a capital placement, a resignation, or
   an elimination occurred, **When** its log entry is shown, **Then** it is
   clearly identifiable as that type of event.

---

### User Story 2 - The log respects fog of war (Priority: P2)

In an online game with fog of war enabled, a player's history panel never
reveals information about territories or troop counts that player wouldn't
otherwise be allowed to see.

**Why this priority**: Without this, the log would be a loophole that
defeats the purpose of fog of war entirely — a player could learn about
distant battles or territory ownership through the log that they're not
supposed to see on the board itself. Sequenced after User Story 1 since the
log must exist before its visibility rules matter, but this is not optional
polish — an unfiltered log in a fog-of-war game is a real information leak.

**Independent Test**: In a fog-of-war-enabled game, have an action occur
between two territories outside a specific player's visible range, and
confirm that player's history panel does not reveal the details of that
action, while a player for whom it is visible sees it in full.

**Acceptance Scenarios**:

1. **Given** fog of war is enabled and an action occurs entirely within
   territories outside a player's visible range, **When** that player views
   the history panel, **Then** the entry is hidden or shown without the
   information fog of war would otherwise hide (e.g. exact troop counts,
   territory ownership) for that player.
2. **Given** fog of war is enabled and an action occurs within a player's
   visible range, **When** that player views the history panel, **Then** the
   entry is shown in full, exactly as it would be without fog of war.
3. **Given** fog of war is disabled for a game, **When** any player views the
   history panel, **Then** every entry is shown in full to everyone.

---

### Edge Cases

- What happens to a log entry's visibility for a player if the relevant
  territory later becomes visible to them (e.g. their fog-of-war range
  expands) — does the earlier entry retroactively reveal its previously
  hidden details, or does visibility apply only going forward from when an
  entry was created?
- How does the log handle a very long game with many actions — is there any
  practical limit to how much history is retained and shown within the
  current session?
- What happens to the log when a game ends — does it remain viewable for the
  remainder of the session (e.g. while the results screen is shown), even
  though the feature doesn't require persisting it beyond that?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain a chronological record of every
  significant action taken during a game: deploys, attacks (with outcome),
  fortify moves, card trade-ins, phase/turn changes, capital placements,
  resignations, and eliminations.
- **FR-002**: System MUST make this record viewable to players as a
  scrollable history panel, both during an in-progress game and after it
  ends (for the remainder of the current session).
- **FR-003**: Each log entry MUST be understandable at a glance, identifying
  who performed the action, which territory or territories were involved,
  and the outcome where one applies (e.g. troops lost, territory captured,
  bonus troops gained).
- **FR-004**: System MUST apply the same fog-of-war visibility rules to log
  entries as apply to the rest of a player's game view in an online,
  fog-of-war-enabled game — a player must never learn information through the
  log that they could not otherwise see.
- **FR-005**: System MUST show the log in full, with no filtering, when fog
  of war is disabled for a game.
- **FR-006**: System MUST support both local pass-and-play games and online
  games with the same log behavior.

### Key Entities

- **Log Entry**: A single recorded action with its type, the player
  responsible, the territory or territories involved, and its outcome (if
  applicable), used to reconstruct the game's history in order.
- **Action Log**: The full, chronologically ordered sequence of Log Entries
  for one game, filtered per-viewer according to fog-of-war visibility
  rules where applicable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of significant actions taken during a game (deploy,
  attack, fortify, trade-in, phase/turn change, capital placement,
  resignation, elimination) appear in the history panel, in the correct
  order.
- **SC-002**: 0% of log entries reveal fog-of-war-hidden information to a
  player who could not otherwise see it, across all tested visibility
  scenarios.
- **SC-003**: A player can review the full history of a game from the
  history panel at any point during play or immediately after it ends,
  without needing to have been paying attention when each action occurred.

## Assumptions

- This feature is explicitly groundwork for a separate, later Game Replay
  feature, which will use this log as its source of truth for move-by-move
  playback; this feature only builds and displays the log itself, not any
  replay or scrubbing interface.
- The log is retained only for the current game session (in memory / for the
  duration of the browser tab or connection); durable persistence across
  sessions (e.g. reviewing a game's log after closing the browser, or from a
  different device) is an accounts/saved-games concern and out of scope here.
- No export or download capability is included; the log is for in-session
  viewing only.
- Fog-of-war filtering for the log reuses the same visibility rules already
  defined for a player's game view (features 001, 011); this feature applies
  those rules to log entries but does not redefine them.
