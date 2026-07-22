# Phase 1 Data Model: Fortify Troop-Count Selection

No `GameState`/engine model changes — `TroopState` and `GameController`
already support arbitrary-count fortify moves. This feature only adds
transient UI (component-local) state, scoped to a single turn's fortify
phase and never persisted in `GameState`.

## Fortify Selection (UI-local state, not persisted)

| Field                | Type                  | Lifecycle                                                                 |
|----------------------|------------------------|----------------------------------------------------------------------------|
| `selectedTerritory`  | `string \| undefined`  | Existing field, reused as the fortify **source**. Set on first click; cleared on re-click or after Confirm. |
| `fortifyDestination` | `string \| undefined`  | New. Set when a valid destination is clicked while a source is selected and no destination is yet chosen; cleared on re-click of the same territory, on source deselection, or after Confirm. |
| `fortifyTroopCount`  | `number`               | New. Valid range `[1, N-1]` where `N` = current troop count of `selectedTerritory`. Freely adjustable while `fortifyDestination` is set and unconfirmed. Reset when source or destination changes. |

**Validation rules** (from FRs / clarification):
- `fortifyTroopCount` is clamped to `[1, N-1]` at all times (FR-002, FR-003)
  — the control itself should not allow selecting outside this range rather
  than validating after the fact.
- Confirming calls `GameController.fortify(fortifyTroopCount, selectedTerritory,
  fortifyDestination)` exactly once, then all three fields above are cleared
  as a side effect of the phase/turn advancing (FR-006, FR-009).
- Manually ending the phase (existing `PhaseEndButton` → `handleEndPhase`) is
  valid at any point regardless of whether `fortifyDestination`/
  `fortifyTroopCount` are set, and performs no troop transfer (FR-005,
  FR-008).

## Existing entities referenced, not modified

- **`TroopState`** (`src/models/TroopState.ts`) — read/written by
  `GameController.fortify()`, already supports arbitrary counts.
- **`GameController.fortify(troops, from, to)`** — existing signature,
  unchanged; this feature only changes what UI state supplies its `troops`
  argument.
