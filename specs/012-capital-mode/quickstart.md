# Quickstart: Capital Mode

A mix of engine logic (unit-testable) and UI wiring (manual per the
constitution's UI rule). Engine changes are small, additive call-site
changes to already-correct existing logic (see [research.md](./research.md)),
so most of the risk is in the new placement-step UI and end-to-end wiring.

## Prerequisites

- `pnpm install`
- On branch `012-capital-mode` (or with the implementation applied
  locally)

## Automated validation

```bash
pnpm run test
pnpm run lint
pnpm run build
```

Add/confirm `GameController.test.ts` coverage for:
- `chooseCapital()`: +2 troops applied immediately on selection
  (SC-002); turn order advances through all `playerConfigs` in order
  (User Story 1, Acceptance Scenario 3); after the last player chooses,
  `startPlayerTurn(playerConfigs[0].color)` is invoked and normal
  `'deploy'` phase begins (Acceptance Scenario 4).
- `attack()`: a capital territory with troops that would normally cap at 2
  dice can roll 3 (SC-004); a capital territory with only 1 troop is still
  capped at 1 die despite the bonus (User Story 3, Acceptance Scenario 2);
  a non-capital territory is never affected (Acceptance Scenario 3).
- `startPlayerTurn()` / `calculateReinforcement()`: a player owning N
  capitals (own and/or captured) receives the correct capital bonus at
  turn start (SC-003); a non-capital-mode game never passes a nonzero
  count (SC-006).
- `ownsAllCapitals()`: correctly `true` only once a player owns every
  capital territory, `false` at every prior state, including a "owns all
  but one" case (SC-005, User Story 4 Acceptance Scenario 2).
- `capitals` persists a territory's capital designation across an ordinary
  capture (owner changes via existing capture logic; the `capitals` entry
  itself is untouched) — confirms FR-005's "no special transfer behavior."

## Manual validation (`pnpm run dev`)

1. **Golden path — placement (User Story 1)**: Start a new game with the
   capital-mode checkbox enabled. Confirm each player, in turn order, is
   prompted to choose one of their own territories; confirm the chosen
   territory's troop count increases by 2 immediately; confirm normal
   deploy/attack/fortify play begins automatically once every player has
   chosen.
2. **2-player and 6-player turn order**: Repeat step 1 at both player-count
   extremes; confirm placement order matches normal turn order in both
   cases.
3. **Reinforcement bonus (User Story 2)**: Capture an opponent's capital
   territory. Confirm your next turn's reinforcement total increases by
   the capital bonus, and the previous owner's no longer includes it for
   that capital.
4. **Extra defending die (User Story 3)**: Attack a capital territory with
   enough troops for 2 dice normally; confirm a 3rd defending die is rolled.
   Attack a capital territory with only 1 troop; confirm it still defends
   with just 1 die. Attack a non-capital territory; confirm no bonus die.
5. **Non-capital-mode regression (SC-006)**: Start a game with capital mode
   off. Confirm no placement step appears, no capital-related UI shows, and
   behavior is identical to the game today.
6. **Capital as last territory (Edge Case)**: Reduce a player to only their
   capital territory remaining; confirm nothing capital-specific changes
   about how that last-territory state is handled (defeat still triggers
   normally when it, too, is captured — this feature adds no special
   handling here, per FR-005 and spec Assumptions).
7. **Mobile breakpoint (constitution Principle IV)**: Resize to ≤640px
   width and repeat step 1's placement UI — confirm it's usable and
   doesn't overlap other UI.
8. **Regression check**: Confirm deploy/attack/fortify phases and their
   existing controls (dice selector, fortify selector) are unaffected when
   capital mode is on but placement has already completed.
