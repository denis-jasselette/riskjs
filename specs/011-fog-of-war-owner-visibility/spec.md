# Feature Specification: Fog of War Owner Visibility

**Feature Branch**: `011-fog-of-war-owner-visibility`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Fog of war owner visibility for RiskJS — when fog of war is enabled, hide both a territory's owner and its troop count for any territory outside the viewing player's owned-plus-directly-bordering set, instead of only hiding troop count as today. The visibility boundary itself (owned territories plus their direct neighbors) is unchanged; only what's hidden within that boundary expands."

## Clarifications

### Session 2026-07-23

- Q: How should a territory outside a player's visible range be presented
  visually under fog of war, now that owner is hidden too (not just troop
  count)? → A: A distinct fogged/unknown visual state — rendered clearly
  differently from any player's ownership color and from an "unowned/neutral"
  territory, so it never implies any particular ownership status.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ownership is hidden along with troop count outside visible range (Priority: P1)

In a game with fog of war enabled, a player looking at a territory that is
neither their own nor directly bordering one of their own territories cannot
tell who owns it or how many troops are there — both pieces of information
are equally obscured, not just the troop count.

**Why this priority**: This is the entire behavior change the feature
introduces — today ownership leaking through fog gives players information
they should not have (e.g. which color controls a distant region), undermining
the intended information-hiding purpose of fog of war.

**Independent Test**: Enable fog of war, and from one player's view, confirm
that a territory outside their owned-plus-bordering set shows neither its
true owner nor its true troop count — both are obscured.

**Acceptance Scenarios**:

1. **Given** fog of war is enabled and a territory is outside a player's
   owned-plus-directly-bordering set, **When** that player views the board,
   **Then** neither that territory's owner nor its troop count is revealed to
   them.
2. **Given** fog of war is enabled and a territory is one the player owns, or
   one that directly borders a territory they own, **When** that player views
   the board, **Then** both that territory's owner and troop count are shown
   normally, exactly as without fog of war.
3. **Given** fog of war is disabled for a game, **When** any player views the
   board, **Then** every territory's owner and troop count are always shown
   normally, unaffected by this feature.

---

### Edge Cases

- An obscured territory shows as a clearly-distinct "unknown"/fogged visual
  state, not as "unowned"/neutral-looking — it must never imply any
  particular ownership status, including the absence of one.
- How does obscuring ownership interact with a territory changing hands while
  it's outside a player's visible range — does the player simply never see
  the change until the territory (or a neighbor of it) comes back into their
  visible range?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST hide a territory's owner from a player's view when
  that territory is outside the player's owned-plus-directly-bordering set of
  territories, whenever fog of war is enabled.
- **FR-002**: System MUST continue to hide a territory's troop count under
  the same condition (unchanged from current behavior).
- **FR-003**: System MUST show both owner and troop count normally for any
  territory the player owns, or that directly borders a territory they own.
- **FR-004**: System MUST NOT apply any owner- or troop-count-hiding when fog
  of war is disabled for the game.
- **FR-005**: System MUST present an obscured territory in a way that does
  not reveal or imply which player currently owns it.
- **FR-006**: System MUST render an obscured territory in a visual state
  distinct from both any player's ownership color and the
  "unowned/neutral" territory appearance, so it cannot be mistaken for
  either.

### Key Entities

- **Territory Visibility**: Whether a given territory is within a player's
  owned-plus-directly-bordering set (fully visible: owner and troop count
  shown) or outside it (fully obscured: owner and troop count both hidden)
  when fog of war is active.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of territories outside a player's visible set have both
  owner and troop count hidden from that player's view whenever fog of war is
  enabled.
- **SC-002**: 100% of territories within a player's visible set (owned or
  directly bordering an owned territory) continue to show accurate owner and
  troop count.
- **SC-003**: 0% of games with fog of war disabled show any hidden
  owner/troop-count information to any player.

## Assumptions

- The definition of "visible" (a player's own territories plus any territory
  directly bordering one of them) is unchanged from current behavior; this
  feature only changes what is hidden within the existing non-visible set.
- Spectator visibility (a non-participant watching a game) is governed by a
  separate, already-specified online-multiplayer feature and is out of scope
  here — this feature concerns only a seated player's own view.
