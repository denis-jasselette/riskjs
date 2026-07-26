# Phase 0 Research: Capital Mode

No open `NEEDS CLARIFICATION` markers — stack is fixed by the constitution.
Findings below are existing-code reconnaissance establishing where this
feature's four mechanics (placement, ownership tracking, reinforcement
input, extra defending die) each already have a hook point or precedent.

## Decision: The placement step reuses the existing dead `'capitalDeploy'` phase value

**Rationale**: `GamePhase` (`src/models/GamePhase.ts:1`) is already
`'deploy' | 'attack' | 'fortify' | 'capitalDeploy'` — `'capitalDeploy'` is
never referenced anywhere in `GameController`, `Game.tsx`, `ActionMenu.tsx`,
`PhaseEndButton.tsx`, or `PhaseIndicator.tsx` (confirmed by grep across
`src/components/` and `src/controllers/`). It's dead scaffolding left over
from the prior unmerged branch mentioned in the spec's Assumptions. Since
none of the phase-branching code in this codebase uses an exhaustive
`switch`, only `if (currentPhase === '...')` chains, reusing this value
costs nothing structurally and is clearly the intended slot rather than
inventing a fifth phase name that means the same thing.

**Alternatives considered**: Adding a new `'capitalPlacement'` value —
rejected as pure churn; the existing name is fine and already exists in the
type.

## Decision: Capital placement happens entirely before the turn state machine starts, not as a normal turn phase

**Rationale**: `GameLogic.initState()` (`src/controllers/GameLogic.ts:152`)
currently calls `autoSetupTroops()` then unconditionally
`startPlayerTurn(playerConfigs[0].color)`, which immediately enters the
normal `'deploy'` phase for player 1. There is no existing initial-placement
step to hook into — initial troop setup is already fully automatic
(`autoSetupTroops`). The placement step must be inserted here: when capital
mode is enabled, `initState` stops after building the base `GameState` with
`currentPhase: 'capitalDeploy'` and `currentPlayer: playerConfigs[0].color`,
*without* calling `startPlayerTurn` yet (that call — which sets
`troopsToDeploy` via `calculateReinforcement` — only makes sense once every
player has a capital and normal turns begin). `chooseCapital()` (new
method) advances through `playerConfigs` in array order one player at a
time; once the last player has chosen, it calls
`startPlayerTurn(playerConfigs[0].color)` to hand off into the normal game
exactly as `initState` does today for non-capital-mode games.

**Alternatives considered**: Modeling capital placement as a special case
of the existing `'deploy'` phase (e.g. a flag that changes deploy's
behavior) — rejected because deploy's existing selectability/troop-pool
semantics (`troopsToDeploy`, forced-trade-in gating) don't apply here at
all (no reinforcement pool exists yet at round 1, no cards exist yet); a
distinct phase keeps `isSelectable()`'s per-phase branches simple and
avoids conditionally suppressing deploy-only behavior.

## Decision: Turn order for placement is plain `playerConfigs` array order, not `getNextPlayer()`

**Rationale**: `getNextPlayer()` (`GameController.ts:169`) skips players who
`hasPlayerLost()` — irrelevant at round 1 since no combat has happened yet
and every player owns territories. Iterating `playerConfigs` directly by
index (the same order `initState` already uses to pick `playerConfigs[0]`
as the very first player) is simpler and correct, and naturally answers the
spec's edge case about 2-player vs. 6-player turn order: it's just array
length, no special-casing needed.

**Alternatives considered**: Reusing `getNextPlayer()` anyway for
consistency — rejected as unnecessary complexity; its elimination-skipping
logic is dead weight at a point in the game where no one can possibly be
eliminated yet.

## Decision: Capital state shape mirrors the existing `blizzards: string[]` precedent

**Rationale**: The codebase already has exactly one precedent for a
territory-level modifier flag: `GameState.blizzards: string[]`
(`src/models/GameState.ts:13`), read via
`MapController.isTerritoryBlizzard()` (`MapController.ts:22`), a one-line
`.includes()` check. Capital assignment needs slightly more than a flag — it
needs to remember *which player* originally chose each capital territory
(FR-004's "which territory is each player's capital", independent of who
currently owns it) — so the natural shape is
`capitals: Record<string, string>` (territory name → the player who chose
it, permanent for the game's duration; never mutated after
`chooseCapital()` runs, since FR-005 gives capitals no special
elimination/transfer behavior beyond ordinary capture, which only changes
the territory's `TroopState.player`, not this record). Current owner is
never stored redundantly — `getPlayerCapitalTerritory(player)` finds the
originally-assigned territory, and `getTerritoryOwner()`
(`MapController.ts:32`, already exists) resolves who owns it *right now*
via `TroopState.player`. This gives `isTerritoryCapital()` /
`getPlayerCapitalCount()` / `ownsAllCapitals()` all for free from two small
helpers plus existing lookups.

**Alternatives considered**: A `Record<player, territory>` (inverse
direction) — equivalent information, but `isTerritoryCapital(territory)`
(needed by `attack()`'s dice-cap logic, keyed by territory) would require an
O(n) reverse scan instead of an O(1) key lookup; territory-keyed is the
better fit given both consumers. Storing "current owner" redundantly on the
capital record itself — rejected, it would need to be kept in sync with
`TroopState.player` on every capture (violating FR-005's "no special
transfer behavior") when the existing owner lookup already answers this
correctly with zero new synchronization.

## Decision: Reinforcement bonus wiring is a one-line call-site change, not new arithmetic

**Rationale**: `calculateReinforcement(player, capitalsOwned = 0)`
(`GameController.ts:195`) already computes `capitalBonus = capitalsOwned *
2` and sums it into the total — built by feature 008 specifically anticipating
this feature, with an explicit comment saying so
(`GameController.ts:191-194`). The only change needed is at the call site,
`startPlayerTurn()` (`GameController.ts:185`):
`this.calculateReinforcement(player)` becomes
`this.calculateReinforcement(player, this.gameState.capitalMode ?
this.mapController.getPlayerCapitalCount(player) : 0)`. This also
mechanically satisfies FR-010 (no capital-related reinforcement input when
capital mode is off) — the ternary means a non-capital-mode game always
passes 0, identical to today's behavior.

**Alternatives considered**: Changing `calculateReinforcement`'s default or
internals — rejected, unnecessary and would touch a feature (008) this spec
depends on rather than modifies.

## Decision: Extra defending die is a one-line conditional at the existing dice-cap call site

**Rationale**: `attack()` (`GameController.ts:110`) hardcodes
`maxDefender: 2` at line 117 when calling `attackRng()`. `attackRng()`
(`GameController.ts:83`) already computes
`Math.min(options.maxDefender, defendingTroops)` (line 88) — the
"capped by what troop count actually supports" requirement (FR-007, User
Story 3 Acceptance Scenario 2) is already correct and needs no change.
The only change is what gets passed in:
`maxDefender: this.mapController.isTerritoryCapital(defendingTerritory) ? 3
: 2`. This automatically satisfies FR-008 (no bonus on non-capital
territories) since `isTerritoryCapital` returns `false` for them, and
FR-010 (no bonus when capital mode is off) since `capitals` stays empty
whenever `capitalMode` is false (placement never runs to populate it).

**Alternatives considered**: Threading a `capitalMode`/`isCapital` parameter
through `attackRng()` itself — rejected, `attackRng()` is
already parameterized purely in terms of dice counts and has no territory
concept; keeping the capital check in `attack()` (which already resolves
`defendingTerritory` to a `TroopState`) keeps `attackRng()`'s existing
contract untouched.

## Decision: "Owns all capitals" is exposed as a plain public query method, not wired to any game-ending behavior

**Rationale**: FR-009 only requires the fact be *determinable*; feature 013
(not yet implemented) is explicitly responsible for consuming it to end the
game. A method like `ownsAllCapitals(player: string): boolean` — checking
that every territory in `capitals` (via `Object.keys`) currently resolves
(`getTerritoryOwner`) to `player` — is sufficient and requires no game-state
mutation, event, or side effect. This keeps the two features' boundary
exactly where the spec's Assumptions describe it.

**Alternatives considered**: Emitting an event or setting a `gameState`
flag when the condition becomes true — rejected as speculative; 013 doesn't
exist yet and the spec explicitly scopes this feature to not implement
win-condition behavior. A plain synchronous query method is the minimal
contract 013 can build on later.

## Open Questions

None — all four mechanics have a direct, unambiguous hook point in the
existing codebase.
