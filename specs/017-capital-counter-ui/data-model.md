# Phase 1 Data Model: Capital Counter UI

## `GameState` additions

| Field                  | Type     | Default | Lifecycle |
|-------------------------|----------|---------|-----------|
| `roundsSincePlacement`  | `number` | `0`     | Meaningful only when `capitalMode` is `true` (irrelevant/unused otherwise, always stays `0`). Incremented by `GameController.startNextPlayerTurn()` whenever a full turn cycle completes (index-wrap detected via `getNextPlayer()`'s index arithmetic — see research.md). Never decremented; never reset mid-game. |

No changes to `TroopState`, `MapController`, or any of 012's additions —
this feature reads `gameState.capitalMode` and calls
`mapController.getPlayerCapitalCount(player)` (both from 012) without
modification.

## Modified existing behavior

| Location | Change | Requirement |
|---|---|---|
| `GameController.startNextPlayerTurn()` (`GameController.ts:178`) | Before delegating to `startPlayerTurn(this.getNextPlayer())`, compute `currentPlayerIndex` (index of `gameState.currentPlayer` in `playerConfigs`) and the resolved `nextPlayerIndex` for the upcoming player; if `gameState.capitalMode && nextPlayerIndex <= currentPlayerIndex`, increment `gameState.roundsSincePlacement` by 1. | Key Entity: Round Counter |

## New component: `CapitalCounter`

**Props**: none — reads `GameState` directly via `GameContext`, consistent
with `PlayerStatus`'s existing pattern (`useContext(GameContext)`).

**Render logic** (pure function of `gameState`):

```text
if (!gameState.capitalMode) → render nothing (FR-007, SC-005)

else if (gameState.roundsSincePlacement < 3)
  → "Round: {roundsSincePlacement + 1}"   (FR-002; displays 1, 2, or 3)

else
  → leader = max over playerConfigs of mapController.getPlayerCapitalCount(player.color)
  → total  = playerConfigs.length          (spec Assumption: total capitals == player count)
  → "Leader: {leader}/{total}"             (FR-003, FR-005, FR-006)
```

No per-player breakdown is ever constructed or rendered — the component
only ever computes and displays the single aggregate `leader` value, so
FR-005 ("MUST NOT reveal which specific player...") holds structurally,
not just by omission from the JSX.

## Validation rules (from FRs / clarifications)

- Exactly one of {nothing, round counter, leader count} is shown at any
  time — never both, never a per-player list (FR-001).
- The round counter always reflects `roundsSincePlacement + 1` while it is
  showing (rounds 1–3); the switch to the leader count is permanent once
  `roundsSincePlacement` reaches 3, with no code path that reverts it
  (FR-004).
- The leader count recomputes fresh on every render from live
  `getPlayerCapitalCount()` calls — never cached or memoized — so it never
  goes stale relative to the current board state (SC-003).
- The leader calculation includes resigned players' currently-owned
  capitals on equal footing with active players' (this session's
  clarification; FR-003).
- A tie for the highest count is displayed as-is, with no indication a tie
  exists (per the spec's pre-answered Edge Case).
