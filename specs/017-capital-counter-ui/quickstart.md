# Quickstart: Capital Counter UI

Small display feature: the round-counting engine logic is unit-testable;
the badge itself is a pure display component validated manually per the
constitution's UI rule.

## Prerequisites

- `pnpm install`
- On branch `017-capital-counter-ui`, with 012 (Capital Mode) already
  implemented locally (this feature depends on `GameState.capitalMode`,
  `GameState.capitals`, and `MapController.getPlayerCapitalCount()`)

## Automated validation

```bash
pnpm run test
pnpm run lint
pnpm run build
```

Add/confirm `GameController.test.ts` coverage for:
- `startNextPlayerTurn()`: `roundsSincePlacement` increments exactly once
  per full cycle through `playerConfigs` when `capitalMode` is `true`
  (including with an eliminated player mid-cycle — confirm the count still
  advances correctly around them); stays at `0` and never increments when
  `capitalMode` is `false` (regression: identical behavior to today).

## Manual validation (`pnpm run dev`)

1. **Round counter (User Story 1)**: Start a capital-mode game, complete
   placement, and confirm the badge shows "Round: 1" immediately. Play
   through full turn cycles and confirm it advances to "Round: 2" then
   "Round: 3", never showing a capital count during these three rounds.
2. **Non-capital-mode game (Acceptance Scenario 3)**: Start a game with
   capital mode off; confirm neither the round counter nor the leader count
   ever appears.
3. **Switch to leader count (User Story 2)**: Continue past round 3;
   confirm the badge switches to "Leader: N/total" (e.g. "Leader: 1/6" if
   no capital has changed hands yet) and never reverts to the round counter
   on subsequent rounds.
4. **Leader updates live**: Capture an opponent's capital such that the
   single-player maximum changes; confirm the displayed count updates
   immediately, with no stale value and no indication of who now holds the
   lead (only the number changes).
5. **Tie**: Arrange (or simulate) two players tied for the highest capital
   count; confirm the badge just shows that value with no tie indicator.
6. **Resigned player included**: With a resigned player (once 013 exists)
   who still owns their capital, confirm their capitals still count toward
   the leader max exactly like an active player's.
7. **Mobile breakpoint (constitution Principle IV)**: Resize to ≤640px
   width; confirm the badge collapses/positions sensibly alongside
   `PlayerStatus`'s existing mobile top-bar layout, with nothing hidden or
   overlapping.
8. **Regression check**: Confirm `PlayerStatus`, `ActionMenu`, and the rest
   of the game chrome render unaffected by the new component's presence.
