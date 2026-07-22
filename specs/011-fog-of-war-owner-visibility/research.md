# Phase 0 Research: Fog of War Owner Visibility

No open `NEEDS CLARIFICATION` markers. Findings below are existing-code
reconnaissance that determines exactly what needs to change.

## Decision: Owner-hiding today is cosmetic only, not real — this feature fixes that gap

**Rationale (finding)**: In `Territory.tsx`
(`src/components/board/Territory.tsx:32`), the rendered `<g>` element always
sets `data-player={props.troopState && props.troopState.player.color}` to
the *true* owner's color, regardless of fog. `Map.module.scss` currently
masks this visually with `&[data-fog=true] { fill: #555 !important; }`
(line 91-97), which does override the fill color a same-specificity
`[data-player=...]` rule would otherwise apply — but the true owner color is
still present as a DOM attribute, inspectable via devtools regardless of the
CSS override. FR-001 ("hide a territory's owner ... from a player's view")
is more naturally read as "the player cannot determine the owner," which a
purely cosmetic CSS mask doesn't fully satisfy. The fix: make
`Territory.tsx` compute `data-player` conditionally —
`props.isInFog ? undefined : (real owner color)` — so no true-owner data
reaches the DOM for a fogged territory at all, rather than relying on a
`!important` override to hide data that's still there.

**Alternatives considered**: Leaving the CSS-only approach as "good enough"
— rejected because it's inconsistent with the constitution's typing/data
discipline (masking a value's *presentation* while still exposing the value
itself), and because this Rules Engine feature is explicitly shared by
every mode of play, including future online multiplayer (per
`specs/README.md`) — an implementation that leaks true state into rendered
markup is a much worse starting point once a real client/server boundary
exists, even though that boundary is out of scope for this feature itself.

## Decision: The existing `#555` fog fill already satisfies the "distinct, not neutral" clarification

**Rationale**: The clarification requires a fogged territory to look
neither like a specific player's color nor like "unowned/neutral." The
existing `[data-fog=true] { fill: #555 !important; }` rule already renders
a flat gray distinct from every entry in `colors.$troop-colors` (the
per-player palette) — and the codebase has no separate "neutral/unowned"
territory concept or color to begin with (every non-blizzard territory is
always assigned an owner at setup; there is no unowned state during play).
So no new color/visual asset is needed — only removing the `!important`
crutch by not emitting the real `data-player` value in the first place is
required; the resulting fallback (no `data-player` attribute, `.TerritoryEdge`'s
base `fill: url(#BlizzardGradient)` — actually superseded by `[data-fog=true]`'s
own fill rule either way) still renders the same gray.

**Alternatives considered**: Designing a new fog texture/pattern (e.g.
hatching) — rejected as unnecessary; the existing gray already meets the
"clearly distinct" bar the clarification asked for, and inventing a new
visual asset wasn't requested and would be scope creep beyond FR-006's
actual requirement (distinct from player colors and from neutral, not
"visually novel").

## Decision: Troop-count hiding stays exactly as-is

**Rationale**: FR-002 explicitly requires unchanged troop-count hiding
behavior. `Territory.tsx` already passes `label={props.isInFog ? '?' :
undefined}` to `Troop`, while the real `count` remains in props (same
"cosmetic masking" pattern this feature is fixing for owner). This feature
does not extend the same real-vs-cosmetic fix to troop count — that would
be scope creep beyond FR-002, which says troop-count hiding is already
correct and unchanged. Noted for symmetry/awareness, not acted on.

## Decision: Stale-owner question is already resolved by FR-001's wording, no new logic needed

**Rationale**: FR-001 hides the owner whenever the territory is currently
outside the visible set — a per-render check against current `isInFog`,
not a history-aware one. Since `Territories.tsx` recomputes `isInFog` fresh
from `gameState.fog` on every render (derived from `MapController.
getVisibleTerritories`, itself derived from current ownership), there is no
"last known owner" ever cached or displayed — a territory that changes
hands while out of range simply continues to render as fogged, with no
special-case code required. This resolves the spec's second Edge Case
without any new state.

## Open Questions

None.
