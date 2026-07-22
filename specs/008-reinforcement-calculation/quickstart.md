# Quickstart: Reinforcement Calculation

Validates the feature end-to-end via the existing Vitest suite plus a manual
in-browser check.

## Prerequisites

- `pnpm install`
- On branch `008-reinforcement-calculation` (or with the implementation
  applied locally)

## Automated validation

```bash
pnpm run test -- GameController
```

Expected: all existing `GameController.test.ts` cases continue to pass
(especially `getPlayerTerritoryTotal` / `hasPlayerLost`, which the new
formula depends on but must not alter), plus new cases covering:

- **SC-001**: a player with 1–8 territories gets exactly 3.
- **SC-002**: a player with 12 territories gets 4 (territory component only,
  isolated from continent/capital); 15 → 5; etc.
- **SC-003**: a player owning every non-frozen territory in one continent
  gets that continent's `bonusTroops` added; owning all-but-one (unfrozen)
  territory in a continent gets none for it; owning two full continents sums
  both bonuses.
- Continent full-control check ignores a blizzard-frozen territory (uses the
  existing `getContinentOwner` behavior — see `data-model.md`).
- **FR-006**: a resigned player's untouched territories still count toward
  another player's continent full-control check.
- **SC-004**: with capital mode off (`capitalsOwned` defaults to `0`),
  reinforcement never includes a capital component.
- **SC-005**: capturing a continent-completing territory during turn N
  raises that player's computed total the next time `startPlayerTurn` runs
  for them.

Also run the full gate before considering this feature done, per the
constitution:

```bash
pnpm run lint && pnpm run test && pnpm run build
```

## Manual validation (local pass-and-play)

1. `pnpm run dev`, start a local game on the classic map.
2. Play until one player controls ≥9 territories; confirm their deploy-phase
   troop count on turn start is `3 + floor(territories/3) - 1`... i.e. matches
   `max(3, floor(territories/3))` (no continent/capital yet).
3. Capture every non-frozen territory in one continent (e.g. via repeated
   attacks or a debug/test shortcut); end the turn and start the next one for
   that player; confirm the deploy troop count jumps by that continent's
   configured bonus.
4. With blizzards enabled, confirm a continent where the only missing
   territory is frozen still counts as fully controlled (bonus awarded).

Capital-bonus manual validation is out of scope until feature 012 (Capital
Mode) exists — SC-004 is covered by the automated suite in the meantime.
