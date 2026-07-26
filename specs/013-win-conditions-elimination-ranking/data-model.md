# Phase 1 Data Model: Win Conditions, Elimination, Resignation & Ranking

## `GameState` additions

| Field             | Type                     | Default | Lifecycle |
|--------------------|--------------------------|---------|-----------|
| `resignedPlayers`  | `string[]`               | `[]`    | Player colors, appended once per player via `resign()`. Never removed — resignation is permanent for the game (FR-009's territories stay theirs; only current ownership, via `TroopState.player`, can later change through normal capture). |
| `knockoutOrder`    | `Record<string, number>` | `{}`    | Player color → count of players still active immediately before this player's status changed to defeated or resigned. Written exactly once per player (first of resignation or defeat, whichever comes first) via `recordKnockoutIfNeeded()`; never overwritten. Absent entries mean "never defeated or resigned" (i.e. still active, or the winner). |
| `turnCount`        | `number`                 | `0`     | Incremented by 1 on every `startPlayerTurn()` call, in every game mode. Drives `ResultsModal`'s `totalTurns` prop and each `PlayerStanding.turnsAlive`. |

`gameOver: boolean` (already exists, `GameState.ts:9`) is set `true` by
`checkWinCondition()` the moment a win condition is met; no separate
"winner" field is added — the winner is re-derivable on demand (via the
same `findConquestWinner()`/`findCapitalWinner()` logic) since no further
captures occur once the game has ended.

## New behavior (`GameController`)

| Method | Behavior |
|---|---|
| `resign(player: string): GameController` | Appends `player` to `resignedPlayers` (no-op if already present). Calls `recordKnockoutIfNeeded(player)`. Calls `checkWinCondition()` (this session's clarification — a resignation alone can satisfy the conquest-mode win condition). If `player === gameState.currentPlayer`, ends their turn via `startNextPlayerTurn()` (mirrors how `fortify()` already ends a turn); otherwise leaves the current turn untouched. |
| `isResigned(player: string): boolean` | `gameState.resignedPlayers.includes(player)`. |
| `recordKnockoutIfNeeded(player: string): void` (private) | If `player` is not already a key in `knockoutOrder`, sets `knockoutOrder[player] = playerConfigs.length - Object.keys(knockoutOrder).length` (count of players not yet recorded as knocked out, i.e. still "in" at this moment, including `player` themselves). |
| `checkWinCondition(): GameController` (private) | No-op if `gameState.gameOver` already true. Otherwise: `winner = gameState.capitalMode ? findCapitalWinner() : findConquestWinner()`; if defined, sets `gameState.gameOver = true`. |
| `findConquestWinner(): string \| undefined` (private) | `eligible = Object.keys(mapConfig.territories).filter(t => !isTerritoryBlizzard(t) && !isResigned(getTerritoryOwner(t)))`. If `eligible.length > 0` and every entry resolves to the same owner, returns that owner. |
| `findCapitalWinner(): string \| undefined` (private) | Returns the one `playerConfigs` entry for which `ownsAllCapitals(player)` (012) is true, if any. |
| `getStandings(): PlayerStanding[]` | Computes the three-tier ranking (see below) fresh from current state on every call — never cached, matching `calculateReinforcement()`'s existing "recalculated fresh every time" convention. |

## Modified existing behavior

| Location | Change | Requirement |
|---|---|---|
| `GameController.attack()` (`GameController.ts:124-133`, the conquest branch) | After the existing territory-transfer lines, call `checkWinCondition()`. Guard the existing `transferCardsOnElimination(defendingPlayer)` call (and its own `recordKnockoutIfNeeded` addition, see below) so it's skipped when `checkWinCondition()` just set `gameOver = true` as a result of this same conquest. | FR-001, FR-006 |
| `GameController.attack()`'s `hasPlayerLost(defendingPlayer)` branch (`GameController.ts:131`) | Also call `recordKnockoutIfNeeded(defendingPlayer)` before the (possibly-guarded) card transfer. | Key Entity: Player Status |
| `GameController.getNextPlayer()` (`GameController.ts:169-176`) | `while` condition gains `|| this.isResigned(...)` alongside the existing `hasPlayerLost(...)` check. | FR-010 |
| `GameController.startPlayerTurn()` (`GameController.ts:183-189`) | Increments `gameState.turnCount` by 1. | `totalTurns`/`turnsAlive` |

## `getStandings()` ranking algorithm

1. **Winner** (rank 1): if `gameState.gameOver`, the player found by
   `findConquestWinner()`/`findCapitalWinner()` (re-derived, not stored).
   `territories`/`troops` are their live totals; `turnsAlive = turnCount`.
2. **Still-alive non-winners** (next ranks): every `playerConfigs` entry
   that is neither the winner, nor `hasPlayerLost`, nor `isResigned`.
   Ordered by live troop total (`getPlayerTroopTotal`) descending;
   `turnsAlive = turnCount` for all of them (still playing as of the
   snapshot). Ties broken by a stable secondary order (spec Assumptions —
   implementation detail, not scope-affecting).
3. **Defeated/resigned** (remaining ranks): every `playerConfigs` entry
   present in `knockoutOrder`. `territories`/`troops` are `null` (per
   `PlayerStanding`'s existing "null when eliminated" convention — applies
   equally to a still-territory-holding-but-resigned player once the game
   itself has ended, since the ranking is about final competitive standing,
   not literal current board occupancy). `turnsAlive` is the `turnCount`
   value recorded at their knockout moment — **not yet captured by
   `knockoutOrder` today**; either `knockoutOrder`'s value type expands to
   `{ playersRemaining: number, turnAtKnockout: number }` or a second
   parallel record is added — resolved during implementation as a small
   internal detail, not a spec-level ambiguity (the ranking's *ordering*
   only depends on `playersRemaining`, which is fully specified; the
   *displayed* `turnsAlive` number is cosmetic detail already anticipated
   by `PlayerStanding`'s doc comment). Ordered by `playersRemaining`
   descending (more players still in at knockout = eliminated earlier =
   ranks worse/lower).

`rating`/`ratingDelta` are left `undefined` for every standing — out of
scope (no rating system is specified anywhere in this codebase yet).
`history` is left `undefined` on the `ResultsModal` call site — out of
scope (belongs to the separate, unimplemented Game Replay feature, 016).

## Validation rules (from FRs / clarifications)

- `checkWinCondition()` runs after every capture and every resignation,
  never anywhere else (FR-001 + this session's clarification).
- Once `gameOver` is `true`, `checkWinCondition()` is a guaranteed no-op —
  the game cannot "un-end" or switch winners.
- `resignedPlayers` and `knockoutOrder` are strictly append-only /
  write-once-per-key for the life of a game.
- A resigned player's `TroopState.player` continues to change normally on
  ordinary capture (FR-009 constrains only the moment of resignation
  itself, not subsequent gameplay) — `resignedPlayers` membership is
  wholly independent of current territory ownership.
- The interim personal-defeat view (via `ResultsModal`, App-level gating —
  see research.md) is shown only when `hasPlayerLost(viewingPlayer) &&
  !isResigned(viewingPlayer)`; the final results view is shown to everyone
  once `gameOver` is `true`, regardless of resigned/defeated status
  (FR-013's "every remaining connected participant").
