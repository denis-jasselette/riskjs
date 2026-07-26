# Phase 1 Data Model: Capital Mode

## `GameState` additions

| Field         | Type                     | Default | Lifecycle |
|---------------|--------------------------|---------|-----------|
| `capitalMode` | `boolean`                | `false` | Set once at game creation (`GameLogic.initState`), never changes for the life of the game. Gates every other capital-related behavior (FR-010). |
| `capitals`    | `Record<string, string>` | `{}`    | Key: territory name. Value: the color of the player who chose it as their capital during the round-1 placement step (`GameController.chooseCapital`). Populated exactly once per territory during placement; never mutated afterward — a capital's *designation* is permanent even after the territory changes hands (only `TroopState.player`, read separately, reflects current ownership). Stays empty for the whole game when `capitalMode` is `false`. |

No changes to `TroopState` — current ownership of a capital territory is
already fully represented by its existing `player: PlayerConfig` field;
`capitals` only needs to remember the one immutable fact (original
assignment) that `TroopState` doesn't carry.

## `GamePhase` (no changes to the type)

`'capitalDeploy'` (already present in the union, previously unused) becomes
the round-1 placement step's phase value. Only entered when
`capitalMode === true`; skipped entirely (never assigned) otherwise, so a
non-capital-mode game's `currentPhase` never differs from today's behavior.

## New derived queries (`MapController`)

| Method | Behavior |
|---|---|
| `isTerritoryCapital(territory: string): boolean` | `territory in this.gameState.capitals`. Mirrors `isTerritoryBlizzard()`. |
| `getPlayerCapitalTerritory(player: string): string \| undefined` | The territory this player originally chose as their capital, or `undefined` if `capitalMode` is off or they haven't chosen yet (mid-placement). `Object.entries(capitals).find(([, p]) => p === player)?.[0]`. |
| `getPlayerCapitalCount(player: string): number` | Count of entries in `capitals` whose territory currently resolves (`getTerritoryOwner`) to `player` — i.e. capitals **currently owned**, own or captured, per User Story 2. `Object.keys(capitals).filter(t => getTerritoryOwner(t) === player).length`. |

## New behavior (`GameController`)

| Method | Behavior |
|---|---|
| `chooseCapital(territory: string): GameController` | Validates implicitly via existing `isSelectable()` gating (only the current player's own territory, only during `'capitalDeploy'` phase — enforced at the UI/selection layer the same way `deploy`/`fortify` selection already is, consistent with how `deploy()`/`fortify()` don't re-validate ownership internally either). Sets `capitals[territory] = currentPlayer`, adds 2 troops to that territory's `TroopState.count` (FR-003). Advances to the next player in `playerConfigs` order; if the current player was last in order, calls `startPlayerTurn(playerConfigs[0].color)` to begin normal play (FR-001's "before normal turn-based play begins", User Story 1 Acceptance Scenario 4). |
| `ownsAllCapitals(player: string): boolean` | `capitalMode && Object.keys(capitals).length > 0 && Object.keys(capitals).every(t => getTerritoryOwner(t) === player)`. Pure query, no side effects (FR-009). Not called from anywhere in this feature — exposed for feature 013 to consume later. |

## Modified existing behavior

| Location | Change | Requirement |
|---|---|---|
| `GameController.attack()` (`GameController.ts:117`) | `maxDefender: 2` → `maxDefender: this.mapController.isTerritoryCapital(defendingTerritory) ? 3 : 2` | FR-007, FR-008 |
| `GameController.startPlayerTurn()` (`GameController.ts:185`) | `this.calculateReinforcement(player)` → `this.calculateReinforcement(player, this.gameState.capitalMode ? this.mapController.getPlayerCapitalCount(player) : 0)` | FR-006 |
| `GameController.isSelectable()` (`GameController.ts:56`) | New branch: `if (this.gameState.currentPhase === 'capitalDeploy') return owner === this.gameState.currentPlayer` (any owned territory is choosable; no forced-trade-in check applies since no cards exist yet at round 1) | FR-001, User Story 1 |
| `GameLogic.initState()` (`GameLogic.ts:152`) | New `capitalModeEnabled: boolean` parameter. When `true`: build `GameState` with `capitalMode: true, capitals: {}, currentPhase: 'capitalDeploy', currentPlayer: playerConfigs[0].color`, and return it directly **without** calling `startPlayerTurn` (that only happens once placement completes, via `chooseCapital`). When `false`: unchanged existing behavior. | FR-001, FR-010 |

## Validation rules (from FRs / clarifications)

- A territory can only become a capital via `chooseCapital()` during the
  `'capitalDeploy'` phase, and only for the territory's current owner
  (enforced the same way other phase-gated selections are: `isSelectable()`
  controls what the UI offers; the engine method itself trusts its caller,
  consistent with `deploy()`/`fortify()`'s existing style).
- Each player chooses exactly one capital, once, in `playerConfigs` order —
  `chooseCapital()` always advances to the next player or starts normal
  play; there is no path to choose a second capital or skip a player.
- `capitals` is write-once per territory: no code path removes or
  reassigns an entry after it's set, regardless of subsequent capture,
  defeat, or resignation (FR-005).
- `getPlayerCapitalCount()` / `ownsAllCapitals()` always reflect
  current-moment board state (derived from live `TroopState.player` lookups
  each call) — never cached (SC-003, matching how `calculateReinforcement`
  itself is already documented as "recalculated fresh every time, never
  cached").
