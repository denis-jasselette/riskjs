# Quickstart: Post-Conquest Troop Movement

Small, additive engine change plus one new UI control modeled directly on
an existing sibling (the fortify troop-count slider).

## Prerequisites

- `pnpm install`
- On branch `024-post-conquest-troop-movement` (or with the implementation
  applied locally)

## Automated validation

```bash
pnpm run test
pnpm run lint
pnpm run build
```

Add/confirm `GameController.test.ts` coverage for:
- `attack()`: a conquest where survivors exceed the winning roll's dice
  count sets `pendingPostConquestMove` with the correct
  `minTroopsToMove`, source/conquered territory names, and applies the
  default (max) transfer exactly as before (SC-001, SC-002, SC-004).
- `attack()`: a conquest where the winning roll's dice count equals the
  maximum leaves `pendingPostConquestMove` `null` (this session's
  clarification) — the single valid value is already applied, no pending
  state created.
- `confirmPostConquestMove()`: a value within bounds moves exactly that
  many troops in and leaves the correct remainder in the source (SC-002);
  values outside `[min, max]` are rejected with no state change (SC-003);
  calling it with no pending state is a no-op.
- `isSelectable()`: returns `false` for every territory while
  `pendingPostConquestMove` is set, regardless of phase or ownership
  (SC-005).
- Regression: `fortify()` and its one-move-per-turn behavior are
  completely unaffected by this feature's state (FR-008).

## Manual validation (`pnpm run dev`)

1. **Golden path (SC-001, SC-002)**: Commit an attack where the winning
   roll's dice count will clearly be less than the survivors (e.g. a
   large attacking force finishing off a small defender in one decisive
   round after earlier rounds). Confirm a troop-count control appears
   after the conquest, adjust it to a value between the bounds, click
   Confirm, and verify exactly that many troops sit in the conquered
   territory with the remainder in the source.
2. **Default-to-max (SC-004 / User Story 3)**: Conquer a territory and,
   without touching the control, proceed — confirm play only continues
   once the choice is explicitly confirmed at its default (max) value, and
   the outcome matches today's pre-feature automatic behavior.
3. **Blocked further action (SC-005 / User Story 1 Acceptance Scenario
   3)**: With a choice pending, attempt to click another territory and
   attempt to end the attack phase; confirm both are blocked (no
   selection happens; End Phase button is disabled with an explanatory
   label) until Confirm is clicked.
4. **Out-of-range rejection (SC-003)**: Attempt to drag the slider or step
   below the minimum or above the maximum; confirm the control itself
   prevents it (min/max attributes on the range input) rather than
   silently accepting an invalid value.
5. **Min-equals-max — no control shown (this session's clarification)**:
   Arrange a conquest where the winning roll's dice count exactly equals
   the maximum (e.g. a small, precise finishing attack). Confirm no
   troop-count control appears at all and play proceeds immediately with
   that single valid value already applied — no extra click required.
6. **Fortify independence (FR-008)**: Later in the same turn, use the
   fortify-phase move as normal; confirm it behaves identically regardless
   of how the earlier post-conquest choice was resolved.
7. **Mobile breakpoint (constitution Principle IV)**: Resize to ≤640px
   width and repeat step 1 — confirm the new control is usable and
   nothing overlaps/hides other UI.
8. **Regression check**: Confirm the attack-phase dice selector and
   fortify-phase slider both continue to work unaffected by this feature.
