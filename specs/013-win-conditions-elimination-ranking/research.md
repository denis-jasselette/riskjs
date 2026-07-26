# Phase 0 Research: Win Conditions, Elimination, Resignation & Ranking

No open `NEEDS CLARIFICATION` markers (two were resolved earlier this
session). Findings below establish exactly what already exists to build
on, and what's genuinely net-new.

## Decision: `gameOver` truly is never set during play today

**Rationale**: `GameState.gameOver` (`src/models/GameState.ts:9`) defaults
`true` in the constructor (reset/idle state) and is set from an
`initState` parameter (`src/controllers/GameLogic.ts:161,176`, default
`false`) at game creation. Grepping `GameController.ts` for writes to
`gameOver` returns nothing — `attack()`, `fortify()`,
`startNextPlayerTurn()`, etc. never touch it. This confirms the spec's
premise exactly and means the win-check this feature adds is the *only*
place `gameOver` ever flips `true` mid-game.

**Alternatives considered**: N/A — pure confirmation, not a design choice.

## Decision: `ResultsModal` already implements both User Story 2 (personal defeat) and User Story 5 (final ranking) as one component

**Rationale**: `ResultsModal`'s `Hero` sub-component
(`src/components/menu/ResultsModal.tsx:137-209`) branches on `gameOver &&
winner`: when true, it shows the winner banner + full standings table
(User Story 5); when false, it shows a "You were eliminated" /
"Game in progress" state keyed off `localEliminated` (derived from
`standings.find(local).territories === null`, line 50) — this is exactly
User Story 2's personal, distinct-from-final-results screen, already
built, already distinguishing "it's just you" from "everyone sees this."
It's `git`-confirmed unused outside its own file and
`src/stories/ResultsModal.stories.tsx` — never imported by `App.tsx` or
`Game.tsx`. This feature's job is computing and passing the right props at
the right moments, not building new UI.

**Alternatives considered**: Building a separate, new personal-defeat
component — rejected, would duplicate `ResultsModal`'s already-correct
`localEliminated` branch and create two places that could drift out of
sync with each other's "am I looking at the final game or not" logic.

## Decision: Showing the modal is gated by `gameOver || (hasPlayerLost(viewingPlayer) && !isResigned(viewingPlayer))`

**Rationale**: This single condition, evaluated against `viewingPlayer`
(the existing `App.tsx:26` derived value, already `GameContext`-provided —
`onlineViewingPlayer ?? gameState.currentPlayer`), produces exactly the
behavior the spec and this session's clarification require:
- A defeated, never-resigned player: `hasPlayerLost` true, `isResigned`
  false → shows the interim "You were eliminated" view (User Story 2).
- A resigned player who's later defeated: `isResigned` true → the second
  clause is false, so no interim popup — exactly this session's
  clarification (no duplicate "you lost" notification for someone who
  already left voluntarily).
- Any viewer once the game truly ends: `gameOver` true → shows the full
  final results (User Story 5), including a resigned player who never got
  an interim popup, and including a player who *did* get one earlier (the
  same component, now rendering its `gameOver && winner` branch instead —
  no risk of "replaced or confused with" the earlier screen, since it's a
  different render of the same modal at a later, distinct moment, matching
  Acceptance Scenario 2 of User Story 2 by construction).
- A player whose single conquest is simultaneously their opponent's
  defeat *and* the winning move: both clauses can become true in the same
  render (their `hasPlayerLost` and `gameOver` both flip together) — the
  condition still correctly resolves to "show the modal," and `ResultsModal`
  itself picks the `gameOver && winner` branch since that check is first in
  its own internal `Hero` logic, so the player who happened to be defeated by
  the winning move sees final results directly rather than a
  now-meaningless interim screen.

**Alternatives considered**: A separate boolean flag tracking "has this
player already seen their interim screen" — rejected, unnecessary; the
gate condition above is already idempotent and derives cleanly from
existing/new state with no risk of double-triggering logic to maintain.

## Decision: Resignation is genuinely new state — `resignedPlayers: string[]`, mirroring the `blizzards` precedent

**Rationale**: Grepping "resign" case-insensitively across `src/` finds
exactly one hit: a `GameController.test.ts:789-794` comment explicitly
noting "No 'resigned' concept exists on PlayerConfig/GameState yet" (a
test for 008's reinforcement calc, which *already* assumes a resigned
player's territories count normally for continent-control — this feature
must not violate that assumption). `resignedPlayers: string[]` (player
colors) follows the same flat-array style as `GameState.blizzards`
(`GameState.ts:13`) — the established precedent for "a small, unordered
set of things flagged this way," now used for a third time (after
blizzards, capitals).

**Alternatives considered**: A richer `Record<string, 'active' | 'resigned'
| 'defeated'>` status map — rejected as partially redundant: "defeated" is
already fully derivable at any time via the existing `hasPlayerLost()`
(0 territories), so a separate status enum would need to be kept in sync
with that derivation for no benefit; a flat resigned-list is simpler and
composes cleanly with the existing defeat check (`hasPlayerLost(p) ||
isResigned(p)`).

## Decision: `getNextPlayer()` gains one additional skip condition

**Rationale**: `getNextPlayer()` (`GameController.ts:169-176`) already
skips `hasPlayerLost` players in its circular scan. Resigned players own
territories and are not "lost" by that definition, so without a change
they'd still be handed turns. Adding `|| this.isResigned(...)` to the
existing `while` condition is the minimal, exactly-analogous change —
satisfies FR-010 (skip resigned players' turns) and, as a consequence,
FR-010's "never grant reinforcement" for free, since `startPlayerTurn()`
(which calculates reinforcement) is never invoked for a player
`getNextPlayer()` never returns.

**Alternatives considered**: Checking `isResigned` separately at
`startPlayerTurn()` and immediately no-op'ing / re-advancing — rejected,
`getNextPlayer()` is the single existing chokepoint for "who's eligible to
play next"; extending it there is simpler than adding a second checkpoint
elsewhere that could fall out of sync.

## Decision: `resign(player)` takes an explicit player argument (not implicitly `currentPlayer`), and self-advances the turn only if the resigning player is currently mid-turn

**Rationale**: FR-008 requires resignation "regardless of whose turn it
currently is" — unlike every other `GameController` action method (which
implicitly act as/for `gameState.currentPlayer`), `resign` must accept an
explicit target so an off-turn player can resign. If
`player === gameState.currentPlayer` at the moment of resignation, their
turn must still end (nothing else will end it), so `resign()` calls
`startNextPlayerTurn()` in that case exactly as `fortify()` already does
at the end of a normal turn; if resigning off-turn, no turn-advance
happens, since the current player's turn is unaffected and should
continue normally.

**Alternatives considered**: Always requiring resignation to happen only
on the resigning player's own turn — rejected, contradicts FR-008
explicitly and the existing "no restriction" Assumption already recorded
in the spec.

## Decision: `knockoutOrder: Record<string, number>` records "players still in at the moment of knockout," written once, first-write-wins

**Rationale**: FR-016's ranking needs, for every defeated/resigned player,
a stable number to sort by: how many players (including themselves) were
still active immediately before their status changed. A `Record<string,
number>` keyed by player color, populated the first time a player either
resigns (`resign()`) or is newly defeated (`attack()`'s existing
`hasPlayerLost(defendingPlayer)` branch, `GameController.ts:131`) — never
overwritten afterward — captures exactly this. "First-write-wins" matters
for a player who resigns and is *later* defeated: their knockout moment,
for ranking purposes, is the resignation (when they effectively left
competitive contention), not the later formality of their last territory
falling; recording only on first status-change transition naturally
enforces this without a special case. The value itself: count of
`playerConfigs` not yet present as a key in `knockoutOrder` at the moment
of the transition (i.e., everyone still "in," including the player
currently transitioning out). Sorting the defeated/resigned ranking tier
by this value descending (most-players-remaining-at-knockout first) puts
early-eliminated players at the bottom and late-eliminated ones just below
the still-alive tier, matching FR-016's "ranks below a player eliminated
while fewer players were still in the game" (i.e. a *smaller* remaining
count ranks *better*, closer to the still-alive tier).

**Alternatives considered**: Recording a raw timestamp or move-sequence
number instead of a "players remaining" count — rejected, more precision
than FR-016 asks for (ties are explicitly called out in spec Assumptions
as "broken by a stable, consistent (if arbitrary) secondary ordering...
not a scope-affecting rule") and would require plumbing a global sequence
counter this feature doesn't otherwise need.

## Decision: `turnCount` is new, general-purpose state (not reused from 017's capital-mode-only round counter)

**Rationale**: `ResultsModal`'s `totalTurns` prop and `PlayerStanding.turnsAlive`
(`src/models/ResultsData.ts:11`, "turn they were knocked out, or total
game length for the winner") both need a running count of individual
player-turns, incrementing regardless of whether capital mode is on. A
sibling planning session's research (feature 017, "Capital Counter UI")
confirmed there is no existing round/turn counter anywhere in the
codebase, and that 017's own new `roundsSincePlacement` field is
deliberately narrow (capital-mode-only, "since placement" semantics,
increments once per *full player cycle* rather than per individual turn).
This feature's `turnCount` is a different, simpler counter — one that
matters in every game mode, incrementing once per `startPlayerTurn()` call
— so it's added independently rather than repurposing 017's field, keeping
each feature's counter scoped to what it actually needs.

**Alternatives considered**: Sharing a single counter between this
feature and 017 — rejected, the two need different semantics (per-turn vs.
per-round-since-a-specific-mode-only-event) and 017 is explicitly scoped
to capital-mode games only, while this feature's `turnCount` must work in
every game.

## Decision: Card transfer and forced-cascade logic is reused unmodified, gated with one new condition

**Rationale**: `transferCardsOnElimination()` (`GameController.ts:141-153`)
already moves the defeated player's full hand to the current attacker and
triggers the forced trade-in cascade
(`hasForcedTradeIn`/`startPhase('deploy')`) if that push crosses the
threshold — this is precisely FR-006/FR-007. The only gap is FR-006's
exception: no transfer when the same conquest is also the game's winning
move. Since `checkWinCondition()` (this feature, new) runs immediately
after the capture that might trigger `transferCardsOnElimination()`, the
call site in `attack()` (`GameController.ts:131-132`) is reordered/guarded
so the win check runs first, and the transfer is skipped when it reports a
win.

**Alternatives considered**: Running the transfer first and "undoing" it
if a win is detected — rejected, needlessly reintroduces a card
move-then-possibly-reverse step when simply checking win state before
transferring avoids it entirely.

## Decision: Conquest-mode win check excludes resigned-held territories from the denominator; capital-mode does not

**Rationale**: FR-002 explicitly defines the conquest-mode win condition
as "every territory that is neither blizzard-frozen nor still held by a
resigned player" — mirroring the existing blizzard-exclusion pattern
already used by `getContinentTerritories()`
(`MapController.ts:26-29`, which filters out `isTerritoryBlizzard`) but
extended with a second, new exclusion for resigned-held territories. This
means a resignation can *by itself* end a conquest-mode game with no
capture at all — e.g. the second-to-last active player resigning removes
their territories from the count, potentially leaving the sole remaining
active player owning 100% of what's left eligible — which is exactly why
the "also check on resignation" clarification matters mechanically, not
just for the trivial "last player standing" framing. FR-003, by contrast,
has no resigned-exclusion language at all — a resigned player's
still-held capital continues to block the capital-mode win exactly like
an active player's would, until it's actually captured.

**Alternatives considered**: Applying the same resigned-exclusion to
capital mode for consistency — rejected, contradicts FR-003's explicit
"regardless of non-capital territory distribution" framing and would
silently let a resignation manufacture a capital-mode win without any
capital actually changing hands, which nothing in the spec supports.

## Open Questions

None — all mechanics have a direct hook point, either into existing logic
(`transferCardsOnElimination`, `getNextPlayer`, `attack`) or as clearly
net-new, appropriately scoped state (`resignedPlayers`, `knockoutOrder`,
`turnCount`).
