# Quickstart: Fortify Troop-Count Selection

This is primarily a UI-behavior feature — validate manually in the browser
per the constitution's rule for UI/frontend changes, backed by whatever
unit coverage is practical for any extracted pure logic.

## Prerequisites

- `pnpm install`
- On branch `009-fortify-troop-selection` (or with the implementation
  applied locally)

## Automated validation

```bash
pnpm run test
pnpm run lint
pnpm run build
```

`GameController.fortify()` itself needs no new tests (already correct for
arbitrary counts), but add/confirm a `GameController.test.ts` case asserting
a multi-troop fortify move transfers the exact amount and leaves the source
with `N - troops` (SC-001/SC-002), and that the phase/turn advances via
`startNextPlayerTurn()` immediately after (SC-003).

## Manual validation (`pnpm run dev`)

1. **Golden path (SC-001)**: Reach the fortify phase with a source territory
   holding more than 2 troops and an owned, connected destination. Click the
   source, click the destination, use the new troop-count control to choose
   an amount greater than 1, click Confirm. Verify the exact chosen amount
   moved and the turn passed to the next player automatically.
2. **Skip fortify (SC-004 / User Story 2)**: Enter fortify, make no
   selections, click "End turn". Verify no troop counts changed anywhere and
   the turn advances.
3. **Cancel before confirming (clarified interaction)**: Select a source,
   click it again — confirm it deselects. Select a source and a destination,
   click the destination again — confirm only the destination deselects
   (source stays selected). Select a source and destination, adjust the
   troop count, then click "End turn" instead of Confirm — verify no troops
   moved.
4. **2-troop edge case**: Select a source with exactly 2 troops; confirm the
   troop-count control only offers `1` (moving 2 would leave zero behind —
   FR-003).
5. **Large troop count**: Late in a game (or via a source with a large
   count), confirm the control can select any value up to `N-1`, not just
   small numbers.
6. **Auto-end (SC-003 / User Story 3)**: After Confirm, verify no further
   fortify move is possible that turn and play has passed to the next
   player without a separate manual step.
7. **Mobile breakpoint regression (constitution Principle IV)**: Resize to
   ≤640px width and repeat step 1 — confirm the new control is usable and
   nothing overlaps/hides other UI (e.g. the player bar).
8. **Regression check**: Confirm the attack-phase dice selector still works
   unaffected (deploy/attack phases untouched by this feature).
