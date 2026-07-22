# Implementation Plan: Fog of War Owner Visibility

**Branch**: `011-fog-of-war-owner-visibility` | **Date**: 2026-07-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-fog-of-war-owner-visibility/spec.md`

## Summary

Today, fogged territories already render with a visually distinct fill
(`#555` gray, via a CSS `!important` override on `[data-fog=true]` in
`Map.module.scss`) — but `Territory.tsx` still sets the `data-player`
attribute to the *real* owner's color unconditionally
(`data-player={props.troopState && props.troopState.player.color}`),
regardless of fog. The CSS override currently masks this visually, but the
real owner is still present in the rendered DOM (inspectable via devtools)
and the component's data flow, which doesn't actually satisfy "hide the
owner." This feature makes the hiding real rather than purely cosmetic:
`Territory.tsx` stops emitting the true owner color when `isInFog` is true,
using the already-clarified distinct fogged visual state instead of relying
solely on a CSS override to hide it.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19, existing Vite 5 app.

**Primary Dependencies**: None new. Changes confined to
`src/components/board/Territory.tsx` (and possibly `Territories.tsx` if the
owner value is scrubbed before reaching `Territory`) plus
`Map.module.scss`.

**Storage**: N/A.

**Testing**: Vitest 2 for any extractable pure logic (there isn't much here
— this is a rendering-conditional change); primary validation is manual
browser testing per the constitution's UI rule, since the change is about
what appears in rendered markup/DOM, not testable business logic.

**Target Platform**: Browser (React SPA), same board-rendering surface used
by both local pass-and-play and (once wired) online play, since this is a
Rules Engine feature.

**Project Type**: Single project, UI/rendering layer only.

**Performance Goals**: N/A — same render cost as today, just conditional on
existing `isInFog` prop already computed per territory.

**Constraints**: Must not touch the visibility-set definition (owned +
directly-bordering, computed by `MapController.getVisibleTerritories` /
`GameState.fog`) — spec Assumptions state this is unchanged. Must not touch
troop-count hiding (FR-002, already correct and out of scope). Must use a
visual state distinct from both any player's color and "unowned/neutral"
per the clarification — the existing `#555` fog fill already qualifies, so
no new color needs to be invented, only made the actual (not just
CSS-masked) representation.

**Scale/Scope**: Per-territory conditional in the existing render path; no
new components required, though a small helper (e.g. deriving the
`data-player` value) may be factored out for clarity.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. CI Gate is Law** — `pnpm run lint/test/build`, plus mandatory manual
  browser check (golden path: fogged territory shows neither owner color
  nor troop count and looks like the existing gray fog state; edge case:
  territory changing hands while out of range never flashes the true
  owner; regression: in-range territories still show real owner/troops
  exactly as before, fog-disabled games unaffected).
- **II. Strict Typing, No Silent Escapes** — `Territory.tsx`'s owner-color
  derivation becomes conditional on the existing typed `isInFog: boolean`
  prop; no `any`/casts needed since all inputs are already typed.
- **III. CSS Module Isolation** — Any styling adjustment stays in
  `Map.module.scss`; no global stylesheet touched.
- **IV. Mobile Rendering Discipline** — N/A for positioning (this changes a
  fill/attribute, not element placement), but the manual check should still
  include the mobile breakpoint per the constitution's general UI rule.
- **V. Convention Over Improvisation** — No new dependencies, no lockfile
  changes.

**Result**: PASS — no violations, no Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/011-fog-of-war-owner-visibility/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md            # /speckit-tasks — not yet created
```

No `contracts/` directory — internal rendering change, no external
interface.

### Source Code (repository root)

```text
src/
└── components/
    └── board/
        ├── Territory.tsx          # data-player derivation becomes fog-aware
        ├── Territories.tsx        # passes isInFog (already does) + owner data
        └── Map.module.scss        # existing [data-fog=true] fill rule — verified sufficient, not reinvented
```

**Note (out of scope, flagged not fixed)**: `ContinentsComponent.tsx`
colors continent *border* lines by `MapController.getContinentOwner(name)`
independent of fog — a viewer could infer full continent control outside
their visible range from border color alone. This is pre-existing behavior,
not a territory-owner leak, and isn't covered by this spec's FRs (which are
scoped to territory owner). Not changed here; worth a future spec if
continent-level info leakage through fog is judged in-scope later.

**Structure Decision**: Single project. All work stays in the existing
`components/board/` rendering layer; no controller/model changes, since
`isInFog` is already computed and passed down — this feature only changes
how `Territory.tsx` uses it.

## Complexity Tracking

*No Constitution Check violations — table intentionally omitted.*
