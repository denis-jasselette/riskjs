# Phase 1 Data Model: Fog of War Owner Visibility

No `GameState` schema changes — `fog?: string[]` (the visibility set) keeps
its exact shape and meaning; this feature changes only how one existing
render prop is derived from already-existing data.

## Territory Render Data (component props, not persisted)

| Field                 | Type                | Change                                                                 |
|------------------------|---------------------|---------------------------------------------------------------------------|
| `Territory.isInFog`    | `boolean`           | Existing prop, unchanged — already correctly computed per territory in `Territories.tsx`. |
| `Territory`'s `data-player` attribute | `string \| undefined` | **Changed**: was always `troopState?.player.color` (the true owner); becomes `isInFog ? undefined : troopState?.player.color` — no true-owner value reaches the DOM when fogged. |
| `Territory.troopState` (troop count display) | `TroopState \| undefined` | Unchanged — count masking stays cosmetic (`label: '?'`) per FR-002, out of this feature's scope. |

**Validation rules** (from FRs / clarification):
- A fogged territory's rendered `data-player` must never equal any real
  player's color value (FR-001, FR-005) — satisfied by omitting the
  attribute entirely rather than substituting a fake value, avoiding any
  risk of an attribute value coincidentally matching a real color key.
- A fogged territory's fill must remain the existing distinct `#555` gray,
  not any `[data-player=...]`-driven color and not a "neutral/unowned"
  look (FR-006) — already true today via the `[data-fog=true]` CSS rule;
  removing the real `data-player` attribute value makes this the actual
  state rather than a `!important`-masked one.
- Territories inside the visible set are entirely unaffected — `data-player`
  continues to reflect the true owner exactly as today (FR-003).
- Fog-disabled games are entirely unaffected — `isInFog` is always `false`
  when `gameState.fog` is `undefined` (FR-004), so `data-player` always
  reflects the true owner in that mode, same as today.

## Existing entities referenced, not modified

- **`GameState.fog?: string[]`** — the visibility set; read, not changed.
- **`MapController.getVisibleTerritories(playerId)`** — computes the
  visibility set; read, not changed.
- **`MapController.getTerritoryOwner(territory)`** — the true-owner source;
  read, not changed (still used for in-range territories and internally by
  game logic regardless of what's rendered).
