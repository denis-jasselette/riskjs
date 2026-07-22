# Quickstart: Blizzard Connectivity Guarantee

This feature's correctness is best proven statistically (many randomized
setups) rather than by eyeballing one game, so automated testing is the
primary validation path.

## Prerequisites

- `pnpm install`
- On branch `010-blizzard-connectivity` (or with the implementation applied
  locally)

## Automated validation

```bash
pnpm run test -- GameLogic
```

Expected new/updated coverage:

- **SC-001/SC-002**: Run `GameLogic.autoSetupTroops(classicMapConfig, ...,
  true)` (or the new selection function directly, if factored out) a large
  number of times (e.g. 100+ iterations) on the classic map; for each run,
  assert that every non-frozen territory can reach every other non-frozen
  territory via `adjacency` edges excluding the frozen set — i.e. the
  connectivity-check helper itself, run against the *result*, always
  returns true. This also indirectly proves FR-002 (no splitting selection
  is ever produced).
- **SC-003**: Assert the returned frozen set's length always equals
  `mapConfig.blizzards` (3, for the classic map) across all iterations.
- **FR-004**: Assert that with `blizzardsEnabled = false`, the returned
  blizzard list is empty and (if observable) the new selection logic is not
  invoked at all.

Also run the full gate before considering this feature done, per the
constitution:

```bash
pnpm run lint && pnpm run test && pnpm run build
```

## Manual validation (local pass-and-play)

1. `pnpm run dev`, start several new games with blizzards enabled on the
   classic map.
2. For each, visually confirm the frozen (blizzard) territories shown on the
   map never appear to cut the map into isolated regions — every
   non-frozen territory should still visibly connect to the rest through
   some path of non-frozen territories.
3. Start a game with blizzards disabled; confirm no territories are marked
   frozen.

Given the classic map only has 3 blizzards out of 42 territories, a visibly
disconnecting selection was already rare before this feature — the
automated statistical check above is the real evidence of the guarantee;
manual play is a sanity check, not the primary proof.
