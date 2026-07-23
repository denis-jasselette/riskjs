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

### Session 2026-07-23 (implementation feedback)

- Q: When should a player's visible territory set (owned + directly
  bordering) be recomputed — once at that player's turn start, or
  continuously as ownership changes? → A: Continuously/live, recomputed
  from current ownership every time visibility is evaluated, never cached
  or snapshotted at a turn boundary. This resolves the previously-open
  edge case below in both directions: a territory a player just conquered
  immediately extends their visible set within their own current turn (no
  waiting for their next turn to start), and a territory that stops
  bordering any of a player's territories — including because that player
  lost the connecting territory to an opponent on the opponent's own turn —
  becomes hidden immediately too, not just at the affected player's next
  turn start.
- Q: Should fog of war also conceal aggregate per-player stats (troop
  count, territory count) shown in the player-info panel, or only
  per-territory info on the map? → A: Also the player-info panel. When fog
  of war is enabled, every player's total troop count and total territory
  count are concealed for everyone except the viewing player themselves;
  the viewing player's own totals are always shown. Card count in the
  player-info panel is unaffected (out of scope — hand size is not a fog
  concept).
- Q: The map already colors a continent's border by its full-controlling
  owner (a pre-existing, pre-fog-of-war feature), independent of fog. Should
  that reveal be constrained by fog too? → A: Yes. A continent's
  full-control border color must only be shown to a viewing player once
  every non-blizzard territory in that continent is within their visible
  range (owned or directly bordering); if even one non-blizzard territory
  in the continent is outside their visible range, the border must not
  reveal an owner, even if the continent is in fact fully controlled by one
  player. Blizzard-frozen territories are excluded from this check, the
  same way they're already excluded from the full-control determination
  itself.

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

### User Story 2 - Player totals are hidden in the player-info panel (Priority: P1)

In a game with fog of war enabled, a player looking at the player-info
panel cannot tell how many troops or territories an opponent currently
has — only their own totals are shown; every other player's troop and
territory totals are concealed.

**Why this priority**: Aggregate totals leak the same kind of strategic
information per-territory hiding is meant to protect — knowing an
opponent's exact troop or territory count undermines fog of war just as
much as seeing their board state directly, regardless of which UI surface
it comes from.

**Independent Test**: Enable fog of war, and from one player's view,
confirm the player-info panel shows their own troop and territory totals
normally but conceals every other player's totals; disable fog of war and
confirm every player's totals are shown normally again.

**Acceptance Scenarios**:

1. **Given** fog of war is enabled, **When** a player views the
   player-info panel, **Then** every other player's troop total and
   territory total are concealed, not the true number.
2. **Given** fog of war is enabled, **When** a player views their own
   entry in the player-info panel, **Then** their own troop total and
   territory total are shown normally.
3. **Given** fog of war is disabled, **When** any player views the
   player-info panel, **Then** every player's troop and territory totals
   are shown normally for everyone.

---

### User Story 3 - Continent full-control outline respects fog (Priority: P1)

In a game with fog of war enabled, a player cannot tell that an opponent
fully controls a continent by the border color alone unless every
territory in that continent is within the player's own visible range —
the continent-outline color is not a back door around per-territory
concealment.

**Why this priority**: This is the same information-hiding guarantee as
User Story 1, applied to a UI surface (the continent border) that
pre-dates fog of war entirely and was never gated by it — without this,
a player could infer full control of a distant, mostly-unseen continent
just from its outline color, defeating the purpose of hiding those
territories in the first place.

**Independent Test**: Enable fog of war. Have an opponent fully control a
continent where at least one of its territories is outside the viewing
player's visible range, and confirm the continent's border does not
reveal the opponent as its owner. Extend the viewing player's visible
range to cover every territory in that continent and confirm the border
then reveals the true owner.

**Acceptance Scenarios**:

1. **Given** fog of war is enabled and a continent is fully controlled by
   one player, but at least one non-blizzard territory in it is outside
   the viewing player's visible range, **When** the viewing player looks
   at the map, **Then** that continent's border does not reveal an owner.
2. **Given** fog of war is enabled and every non-blizzard territory in a
   fully-controlled continent is within the viewing player's visible
   range, **When** the viewing player looks at the map, **Then** that
   continent's border reveals the true owner, exactly as without fog of
   war.
3. **Given** fog of war is disabled, **When** any player looks at the map,
   **Then** every fully-controlled continent's border always reveals its
   owner, unaffected by this feature.

---

### Edge Cases

- An obscured territory shows as a clearly-distinct "unknown"/fogged visual
  state, not as "unowned"/neutral-looking — it must never imply any
  particular ownership status, including the absence of one.
- A territory changing hands while outside a player's visible range is
  resolved: visibility is recomputed live from current ownership on every
  evaluation (see 2026-07-23 Clarifications), so there is no stale or
  cached visible set — a change is reflected the moment it's evaluated,
  never delayed until a territory or its neighbor re-enters visible range.

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
- **FR-007**: System MUST compute a player's visible territory set (owned
  plus directly-bordering territories) live from current ownership every
  time visibility is evaluated — never as a value cached or snapshotted at
  a turn boundary — so a territory capture is reflected immediately,
  including within the capturing player's own current turn, and a
  territory's removal from another player's visible set (e.g. because that
  player lost the connecting territory) is reflected immediately too.
- **FR-008**: System MUST conceal a player's total troop count and total
  territory count in the player-info panel for every player other than the
  viewing player, whenever fog of war is enabled.
- **FR-009**: System MUST show the viewing player's own total troop count
  and total territory count in the player-info panel normally at all
  times, regardless of fog of war.
- **FR-010**: System MUST NOT conceal any player-info panel troop or
  territory totals when fog of war is disabled for the game.
- **FR-011**: System MUST NOT reveal a continent's full-control owner via
  the continent border color to a viewing player unless every non-blizzard
  territory in that continent is within that player's visible range,
  whenever fog of war is enabled.
- **FR-012**: System MUST NOT apply any continent-border concealment when
  fog of war is disabled for the game.

### Key Entities

- **Territory Visibility**: Whether a given territory is within a player's
  owned-plus-directly-bordering set (fully visible: owner and troop count
  shown) or outside it (fully obscured: owner and troop count both hidden)
  when fog of war is active. Computed live from current ownership on every
  evaluation, not cached or snapshotted per turn (FR-007).
- **Player Totals Visibility**: Whether a given player's aggregate troop
  and territory totals are shown (the viewing player's own totals, always)
  or concealed (every other player's totals, when fog of war is active) in
  the player-info panel.
- **Continent Outline Visibility**: Whether a continent's full-control
  border color reveals its owner (every non-blizzard territory in it is
  within the viewing player's visible range) or is concealed (at least one
  non-blizzard territory is outside it), when fog of war is active.

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
- **SC-004**: 100% of territory captures immediately update the capturing
  player's visible set within their own current turn — verified by
  confirming a newly-adjacent territory's owner/troop count become visible
  right after the capture, with no dependency on a turn boundary.
- **SC-005**: 100% of the time fog of war is enabled, the player-info panel
  shows every non-viewing player's troop and territory totals as concealed,
  and the viewing player's own totals as accurate.
- **SC-006**: 0% of games with fog of war disabled show any concealed
  player-info troop/territory totals to any player.
- **SC-007**: 0% of continents with at least one non-blizzard territory
  outside a player's visible range reveal their owner via border color to
  that player, whenever fog of war is enabled.
- **SC-008**: 100% of continents fully within a player's visible range (and
  fully controlled) continue to reveal their owner via border color,
  whenever fog of war is enabled.

## Assumptions

- The logical definition of "visible" (a player's own territories plus any
  territory directly bordering one of them) is unchanged from before this
  feature; what changed is that it is now explicitly specified to be
  computed live from current ownership on every evaluation (FR-007), not
  assumed to already work that way — that assumption is what let the
  original implementation snapshot it once per turn, which this feature's
  2026-07-23 clarifications correct.
- Spectator visibility (a non-participant watching a game) is governed by a
  separate, already-specified online-multiplayer feature and is out of scope
  here — this feature concerns only a seated player's own view.
- Card count in the player-info panel is not a fog-of-war concept and is
  unaffected by this feature — only troop and territory totals are
  concealed there.
