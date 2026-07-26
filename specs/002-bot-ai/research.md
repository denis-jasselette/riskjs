# Phase 0 Research: Bot AI

## Decision 1: Split `neutral` out of `BotSkill` into its own `PlayerConfig` field

**Decision**: Today, `src/models/PlayerConfig.ts:5` defines
`BotSkill = 'easy' | 'medium' | 'hard' | 'expert' | 'neutral'` — Neutral is
folded into the *same* enum as difficulty. FR-009 requires Neutral to be
configurable *independently* of difficulty ("a Neutral seat... regardless
of its assigned difficulty tier"), which the current shape cannot express
(a seat can't simultaneously be `'medium'` and `'neutral'`). This feature
adds a new field, `botBehavior?: 'automated' | 'neutral'`, and narrows
`BotSkill` to just the difficulty axis it was already otherwise used for.
`'automated'`/`'neutral'` match the wording already present in
`GameOver.tsx`'s (currently inert) `bot_behavior` `<select>` options, so no
new vocabulary is introduced.

**Rationale**: Grepping the codebase confirms exactly one production
reference to the `BotSkill` type's `'neutral'` member
(`PlayerConfig.ts:5` itself) — nothing else pattern-matches on it, so
narrowing the enum is a safe, non-breaking change. `hard`/`expert` are left
in `BotSkill` unused (per the spec's own "explicitly out of scope, deferred"
Assumption) rather than removed, so a future feature can implement them
without another type change.

**Alternatives considered**: Keep `'neutral'` as a `BotSkill` value and
special-case it everywhere a difficulty is read. Rejected — it would force
every call site (`getBotAgent`-style resolution, `HeuristicBotAgent`, etc.)
to treat "neutral" as a fake difficulty tier rather than the orthogonal
behavior axis the spec actually describes, and would block a Neutral+Medium
combination the spec explicitly requires (US3's "regardless of its assigned
difficulty tier").

## Decision 2: A pure `decideAction(gameState, mapController, player)` function, not a class hierarchy tied to the wire protocol

**Decision**: The decision engine's public seam is
`decideAction(gameState: GameState, mapController: MapController, player: string): BotDecision | null`
in `src/bots/decideAction.ts`, returning a locally-defined `BotDecision`
discriminated union (own type, not `ClientGameMessage` from feature 001).
Internally it dispatches to `RandomBotAgent` (Easy), `HeuristicBotAgent`
(Medium), or wraps either in `NeutralBotAgent` when `botBehavior ===
'neutral'`, based on the acting player's `PlayerConfig`.

**Rationale**: `BotDecision`'s variants are structurally the same as
`ClientGameMessage`'s action variants (same field names/shapes, per
`contracts/game-protocol.md` in feature 001) by deliberate design — a future
server-side bot driver can trivially map one to the other — but defining it
independently avoids a hard build-order dependency on `src/net/protocol/game.ts`,
which does not exist yet (001 is only planned, not implemented). Returning
`null` is the explicit "no bot configured for this player" signal, distinct
from any in-band decision (including `end_phase`), so callers never confuse
"nothing to do" with "this seat isn't automated."

**Alternatives considered**: Import/depend on feature 001's future
`ClientGameMessage` type directly. Rejected for now — it would make 002
unable to be implemented or tested before 001 lands, contradicting the
Assumptions section's framing that 002 only needs 001's *interface
contract* (bots submit the same message shape), not its implementation.

## Decision 3: Fog-of-war enforcement via `MapController`'s existing primitives, not feature 001's (unbuilt) `filterGameStateForSeat`

**Decision**: `decideAction` and its agents never read `gameState.troops`/
`gameState.capitals`/territory ownership directly for a territory outside
the acting player's `mapController.getVisibleTerritories(player)`, and use
`mapController.getVisibleContinentOwner(continent, player)` (already
fog-aware) rather than `getContinentOwner` when evaluating continent-control
opportunities. The player's own hand (`gameState.playerCards[player]`) is
always fully visible, per the rules of the game.

**Rationale**: Feature 001's planned `filterGameStateForSeat` (a
`GameState`→`GameState` redaction function) does not exist in `src/`
yet — it's tasked but not built. `MapController` already exposes the exact
per-territory and per-continent visibility primitives a decision function
needs (`getVisibleTerritories`, `getVisibleContinentOwner`), so 002 does not
need to wait on 001's state-redaction object; it just needs to route reads
through the right query instead of the raw field. This keeps 002
independently buildable and testable, and remains consistent with whatever
`filterGameStateForSeat` eventually redacts, since both are built on the
same underlying `getVisibleTerritories` primitive.

**Alternatives considered**: Block on feature 001 shipping
`filterGameStateForSeat` first, and have `decideAction` accept an
already-filtered `GameState`. Rejected — introduces an avoidable
cross-feature ordering dependency for no behavioral difference, since both
approaches bottom out at the same `MapController` primitive.

## Decision 4: Drive bot turns from a new effect in `Game.tsx`, reusing the existing action pipeline

**Decision**: Add one `useEffect` in `Game.tsx`, modeled on the existing
turn-change-detection effect (lines 36-57), that: checks whether
`gameState.playerConfigs.find(p => p.color === gameState.currentPlayer)` is
bot-controlled (`human === false`); if so, calls `decideAction(gameState,
mapController, gameState.currentPlayer)`; and applies the result through the
same `gameController.<action>(...).gameState` → `setGameState(...)`
pipeline every human-triggered handler (`handleClickTerritory`,
`handleEndPhase`, etc.) already uses. Because a bot's turn spans multiple
phases and, within attack, potentially multiple attacks, the effect depends
on `[gameState]` broadly (not just `currentPlayer`) so it re-fires after
each of the bot's own actions and continues until control passes to a
non-bot seat or the game ends.

**Rationale**: `Game.tsx` is confirmed to have no existing "act on behalf of
the current player" hook — every action today originates from a user
click/submit. Modeling the new effect on the existing turn-change effect
keeps the addition consistent with the file's established pattern rather
than introducing a new state-management approach. This also makes bots
immediately manually testable in local pass-and-play, consistent with how
every other engine feature in this project is validated (per `CLAUDE.md`
and the project's stated reason for local play existing at all).

**Alternatives considered**: Poll on an interval/timer. Rejected — turns are
event-driven (React state changes), and a `setInterval` would either lag
behind or race the same `gameState` a plain effect already reacts to
synchronously.

## Decision 5: Prior unmerged branch (`issue-6-bot-ai-heuristics`) is reference material only

**Decision**: The abandoned `src/bots/` implementation on branch
`issue-6-bot-ai-heuristics` (worktree `agent-a9059edade2ff192e`, commit
`f4d6923`) is read for structural inspiration (its `BotAgent`
interface shape, `RandomBotAgent`'s "keep calling until null" loop idiom,
`getBotAgent`'s skill→agent resolution) but is not merged or adapted
in-place.

**Rationale**: It predates card trading, capital mode, and post-conquest
troop movement, all now on `main`; its own code comments already flag the
card-trading gap as stale. It never calls `GameController`'s mutating
methods and operates on raw, unfiltered `GameState` — it has no fog-of-war
enforcement at all, which is a hard requirement here (FR-005). Treating it
as copy-paste source would reintroduce exactly the two gaps (`FR-005`,
`FR-007`'s card-trading requirement) this feature exists to close correctly.

**Alternatives considered**: Cherry-pick the branch and patch it up.
Rejected — the amount of adaptation needed (fog filtering added
throughout, card-trade-in wired in, capital-mode-aware attack weighting
added, GameController-call wiring added, PlayerConfig field split) is
comparable to writing it fresh with the current `main` as ground truth,
with less risk of silently carrying over a stale assumption.
