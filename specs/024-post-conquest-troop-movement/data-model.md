# Phase 1 Data Model: Post-Conquest Troop Movement

## `GameState` additions

| Field                       | Type                                                                             | Default | Lifecycle |
|-------------------------------|-----------------------------------------------------------------------------------|---------|-----------|
| `pendingPostConquestMove`     | `{ sourceTerritory: string, conqueredTerritory: string, minTroopsToMove: number } \| null` | `null`  | Set by `attack()`'s conquest branch only when the winning roll's dice count is strictly less than the maximum (leaving 1 behind in the source) — i.e. there's an actual choice to make. Cleared by `confirmPostConquestMove()`. While non-null, blocks all other action (`isSelectable()`, `PhaseEndButton`). |

No changes to `TroopState` — the choice only redistributes counts already
tracked there between two existing territories.

## New behavior (`GameController`)

| Method | Behavior |
|---|---|
| `confirmPostConquestMove(troopsToMove: number): GameController` | No-op (with a console warning, matching `tradeCards()`'s existing invalid-input style) if `pendingPostConquestMove` is `null`, or if `troopsToMove` is outside `[minTroopsToMove, getTroopCount(source) + getTroopCount(conqueredTerritory) - 1]`. Otherwise: sets `conqueredTerritory`'s `TroopState.count` to `troopsToMove`, adjusts `sourceTerritory`'s `TroopState.count` by the opposite delta (so their sum is unchanged), and clears `pendingPostConquestMove`. |

## Modified existing behavior

| Location | Change | Requirement |
|---|---|---|
| `GameController.attack()`'s conquest branch (`GameController.ts:124-129`) | After the existing unconditional default-transfer lines (unchanged — this *is* the default, FR-005), compute `min = result.attackerDice.length` and `max = attackingTroopState!.count + defendingTroopState!.count - 1` (both territories' post-combat counts, already set by the lines just above). If `min < max`, set `gameState.pendingPostConquestMove = { sourceTerritory: attackingTerritory, conqueredTerritory: defendingTerritory, minTroopsToMove: min }`. | FR-001, FR-002, FR-003, FR-005 |
| `GameController.isSelectable()` (`GameController.ts:46`) | New early check at the top: `if (this.gameState.pendingPostConquestMove) return false`. | FR-007 |
| `PhaseEndButton` (`PhaseEndButton.tsx`, before the existing phase-specific branches) | New early check, modeled on the existing forced-trade-in disabled branch: `if (gameState.pendingPostConquestMove) return <button disabled>Choose troops to move</button>`. | FR-007 |

## Validation rules (from FRs / clarifications)

- `pendingPostConquestMove.minTroopsToMove` is fixed at creation (the
  winning roll's dice count never changes after the fact); the upper bound
  is always recomputed live from current territory counts, never stored
  (see research.md).
- `confirmPostConquestMove()` is the only way to clear
  `pendingPostConquestMove` — no other code path resets it, guaranteeing
  FR-007's "must resolve before any further action" holds structurally,
  not just by UI convention.
- When the winning roll's dice count equals the maximum (only one valid
  value), `pendingPostConquestMove` is never created at all — the default
  assignment already in place *is* that single valid value, satisfying
  this session's clarification with no separate code path.
- This feature never reads or writes any state associated with the
  fortify-phase move (009) — no shared field, counter, or flag connects
  them (FR-008).
