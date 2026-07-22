# Quickstart: Fog of War Owner Visibility

This is a rendering-correctness feature — validate primarily by inspecting
actual DOM output in the browser, not just visual appearance (the current
bug is invisible to the eye but present in markup).

## Prerequisites

- `pnpm install`
- On branch `011-fog-of-war-owner-visibility` (or with the implementation
  applied locally)

## Automated validation

```bash
pnpm run lint && pnpm run test && pnpm run build
```

No new business logic to unit-test (the change is a conditional prop
derivation in a rendering component); if a small pure helper is factored
out for the `data-player` derivation, add a direct test for it — otherwise
manual verification below is the primary check.

## Manual validation (`pnpm run dev`)

1. **Golden path (SC-001 / User Story 1)**: Start a game with fog of war
   enabled. As one player, find a territory outside your owned +
   bordering set. Confirm visually it shows the existing gray fog fill, not
   a player color, and shows `?` for troop count (unchanged).
2. **DOM leak check (the actual bug this feature fixes)**: With devtools
   open, inspect that same fogged territory's `<g>` element. Confirm its
   `data-player` attribute is **absent** (or otherwise not the true owner's
   color) — before this fix, it would show the real owner's color name even
   though the fill was visually masked.
3. **In-range regression (SC-002)**: Confirm a territory you own, or one
   directly bordering one you own, still shows its real owner color and
   real troop count, unaffected.
4. **Fog disabled (SC-003)**: Start a game with fog of war disabled; confirm
   every territory shows real owner and troop count as always, and no
   `[data-fog=true]` styling appears anywhere.
5. **Distinct-from-neutral check (clarified FR-006)**: Confirm the fog gray
   is visually distinct from every player color in the active game's
   palette — it already is by design, this step just confirms no
   regression.
6. **Ownership-change-while-hidden (resolved edge case)**: Have a fogged
   territory change owner during play (e.g. another player conquers it out
   of your view). Confirm it continues to render as fogged gray afterward —
   never briefly showing the old or new owner's color.
7. **Continent border note**: `ContinentsComponent` colors continent border
   lines by full-continent owner regardless of fog — this is a known,
   pre-existing, out-of-scope behavior (see `research.md`); no action needed
   here, just don't mistake it for a regression from this change.
