# Phase 0 Research: Reinforcement Calculation

No open `NEEDS CLARIFICATION` markers remain in the Technical Context — the
feature lands entirely within the existing TypeScript/Vitest stack fixed by
the project constitution, so no technology-choice research was needed. This
document instead records the existing-code reconnaissance that determines the
implementation approach.

## Decision: Reuse `MapController.getContinentOwner()` for the continent rule

**Rationale**: `MapController.getContinentOwner(continent)`
(`src/controllers/MapController.ts:40`) already:
- calls `getContinentTerritories(continent)`, which filters out
  blizzard-frozen territories (`!this.isTerritoryBlizzard(name)`) — this is
  exactly FR-004's "exclude frozen territories from the full-control check";
- returns the common owner only if every remaining territory shares one
  owner, and `undefined` otherwise (including vacuously for an
  all-frozen continent, since `[].every(...)` is `true` but
  `owners[0]` is `undefined` — matching the spec's Assumption that an
  all-frozen continent can't award its bonus to anyone).

No changes to `MapController` are required for FR-003/FR-004/FR-005; the new
reinforcement function only needs to iterate `Object.keys(mapConfig.continents)`,
call `getContinentOwner` for each, and sum `bonusTroops` for continents where
the owner matches the current player.

**Alternatives considered**: Writing a new continent-control check
duplicating this logic was rejected — `getContinentOwner` is already
exercised by existing tests (`MapController.test.ts`) and handles the
frozen-territory exclusion correctly; duplicating it would risk the two
implementations drifting.

## Decision: Resigned-player territories need no special-casing

**Rationale**: `getTerritoryOwner` reads the owner recorded on each
territory's `TroopState`/ownership data directly; there is no separate
"active players" filter anywhere in the ownership-lookup path. A resigned
player's territories keep their existing owner value (that player's color)
until captured, so `getContinentOwner` already treats them as normally owned
when checking *other* players' full control — satisfying FR-006 with zero
new code. (Confirming a resigned player never has reinforcement computed for
themselves is a concern for feature 013 - Win Conditions/Resignation, not
this feature.)

## Decision: Territory-count rule is new, self-contained arithmetic

**Rationale**: `GameController.getPlayerTerritoryTotal(player)`
(`src/controllers/GameController.ts:199`) already returns the exact count
needed as input to `max(3, floor(territories/3))`. The formula itself has no
existing equivalent in the codebase and is added as a small pure function.

**Alternatives considered**: Rounding modes other than floor (ceil, round)
were not considered — the spec (FR-002) explicitly specifies floor division.

## Decision: Capital bonus is a defaulted parameter, not a new data query

**Rationale**: No capital-ownership data structure exists yet (Capital Mode
is feature 012, unbuilt — confirmed via repo-wide search, no `capital`
references in `src/models` or `src/controllers` besides the placeholder
`'capitalDeploy'` phase name in `GamePhase.ts`). Per the spec's Assumptions,
this feature must work standalone with the capital bonus contributing zero.
The new reinforcement function therefore takes `capitalsOwned: number = 0` as
an explicit parameter; `GameController.startPlayerTurn` passes `0` until
feature 012 lands and wires in a real count.

**Alternatives considered**: Reading a `mapConfig`/`gameState` "capital mode
enabled" flag that doesn't exist yet was rejected as premature — it would
require stubbing fields that feature 012 is responsible for defining, adding
coupling in the wrong direction (008 depending on 012's not-yet-designed
shape rather than 012 depending on 008's already-stable calculation entry
point).

## Open Questions

None. All FRs map directly onto either existing, tested engine code or small
net-new pure-function arithmetic.
