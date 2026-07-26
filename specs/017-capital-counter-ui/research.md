# Phase 0 Research: Capital Counter UI

No open `NEEDS CLARIFICATION` markers. The two open questions are: where
does a "round" concept come from (doesn't exist yet anywhere in the
codebase), and where does the badge visually live.

## Decision: No round-counting state exists anywhere today — this feature introduces it

**Rationale**: Grepped `src/` case-insensitively for "round" — no hits in
`GameState`, `GameController`, or anywhere else in game logic (only
unrelated CSS class names like `"slider round"` in unrelated toggle-switch
markup). `GameState.currentPlayer` (`src/models/GameState.ts:14`) plus
`GameController.getNextPlayer()`
(`src/controllers/GameController.ts:169-176`) are the only turn-cycling
primitives that exist, and neither counts completed cycles. Spec 012
(Capital Mode) only uses "round 1" as informal terminology for its
placement step's name, not as tracked state. This feature is therefore the
first to need round-counting, and — since no other feature currently
depends on a general-purpose round counter — it's scoped and owned
entirely by this feature rather than pushed into 012 or a shared utility
that doesn't otherwise exist yet.

**Alternatives considered**: Asking feature 012 to add a general round
counter as part of its own scope — rejected; 012's spec makes no mention
of round tracking, and inflating its scope to serve a dependent feature's
narrow need violates 012's own "does not compute or change anything [beyond
capital tracking]" boundary from this spec's Assumptions, in reverse. Adding
a generic reusable "turn/round tracker" utility — rejected as speculative;
nothing else in the codebase needs one, and the round definition here
("since capital placement") is specific to this feature's gating logic
rather than a general game-clock concept.

## Decision: Round increments are detected via index-wrap comparison in `startNextPlayerTurn()`, not a separate scheduler

**Rationale**: `getNextPlayer()` (`GameController.ts:169-176`) finds
`currentPlayerIndex`, then advances `nextPlayerIndex` circularly via
`(nextPlayerIndex + 1) % length`, skipping eliminated players. Because the
index only ever moves forward through the circular array, `nextPlayerIndex
<= currentPlayerIndex` is a reliable, self-correcting signal that a full
lap completed — it stays correct even as players are eliminated mid-game
(an eliminated player is simply never landed on again, so "a lap" is
naturally redefined around whoever is still active, with no separate
bookkeeping needed). `startNextPlayerTurn()` computes both indices, and
when `gameState.capitalMode` is true and the wrap condition holds,
increments `gameState.roundsSincePlacement` before delegating to
`startPlayerTurn()`.

**Alternatives considered**: Tracking "has player X (the round's starting
player) taken a turn again" via a stored player reference — rejected,
breaks once that specific player is eliminated (they can never be
"reached" again, so the round would never advance) without extra
special-casing; the index-wrap check needs none. Counting total
`startPlayerTurn` calls and dividing by `playerConfigs.length` — rejected,
drifts inaccurate once players are eliminated (fewer live players per lap
than the divisor assumes), producing a round count that runs slower than
reality.

## Decision: `roundsSincePlacement` starts at its natural default (0) — no special initialization needed at the placement→play transition

**Rationale**: `GameState`'s constructor
(`src/models/GameState.ts:33-48`) already zero-initializes every numeric
field by default; `roundsSincePlacement: number` follows the same pattern.
Because the wrap-detection increment (see above) only ever fires inside
`startNextPlayerTurn()` — which 012's placement flow never calls (placement
advances via direct `startPlayerTurn()` calls in `chooseCapital()`, not
`startNextPlayerTurn()`) — the counter is guaranteed to still be at its
default 0 the moment normal play begins, with zero coordination required
with 012's `chooseCapital()`/`initState()` changes. Display logic maps
`roundsSincePlacement` 0/1/2 to "Round 1"/"Round 2"/"Round 3" (i.e.
`roundsSincePlacement + 1` for the displayed number), switching to the
leader count once `roundsSincePlacement >= 3`.

**Alternatives considered**: Explicitly setting `roundsSincePlacement = 1`
at the exact moment `chooseCapital()` hands off to normal play — rejected
as an unnecessary cross-feature edit into 012's method for a value that's
already correct via the shared zero-default, adding coupling with no
benefit.

## Decision: Once the leader count begins showing, it never reverts — for free, with no extra flag

**Rationale**: FR-004 requires the display to never revert to the round
counter once the leader count begins. Since the switchover condition
(`roundsSincePlacement >= 3`) reads a monotonically-increasing counter that
this feature never decrements anywhere, "never reverts" is automatically
true — no `hasRevealedLeader` boolean or similar tracking flag is needed.

**Alternatives considered**: An explicit one-way `leaderRevealed: boolean`
flag, set once and never unset — rejected as redundant state that could
theoretically drift from the counter it would duplicate; the monotonic
counter alone is a strictly simpler and equally correct source of truth.

## Decision: New standalone `CapitalCounter` component, mounted beside `<PlayerStatus />`

**Rationale**: `Game.tsx:176-210` renders all persistent chrome
(`<PlayerStatus />`, `<CardHand />`, `<ActionMenu>`, `<Map>`) as flat
siblings. There is no existing global (non-per-player) status element to
extend — `PlayerStatus.tsx` maps over `playerConfigs` and has no natural
slot for a single aggregate value. `PlayerStatus.module.scss`'s container
(`position: fixed`, themed background/border, `@media (max-width: 640px)`
collapse to a horizontal top bar) is the closest and most directly
reusable visual precedent for a small persistent badge, so the new
component's stylesheet is modeled on it rather than invented from scratch.

**Alternatives considered**: Folding the counter into `PlayerStatus.tsx`
itself — rejected, that component's entire structure is a per-player map;
shoehorning a single global value in would require special-casing its
render loop for no layout benefit. Rendering it inside `ActionMenu` —
rejected, `ActionMenu` is scoped to the current player's in-turn action
controls (dice/fortify/deploy selectors), a different concern than a
global, always-visible status badge relevant to every viewer regardless of
whose turn it is.

## Decision: Leader calculation includes resigned players (per clarification), requiring no filtering logic

**Rationale**: Per this session's clarification, a resigned player's
capitals count toward the leader max the same as any active player's,
since spec 013 (not yet implemented) keeps a resigned player's territories
on the board unchanged until eventual defeat. `getPlayerCapitalCount()`
(012's helper) is already purely derived from live `TroopState.player`
ownership with no concept of "active" vs. "resigned" — so simply calling
it for every entry in `playerConfigs` (with no filter) already produces the
clarified behavior; no additional resignation-awareness needs to be added
by this feature.

**Alternatives considered**: Filtering `playerConfigs` to exclude resigned
players before computing the max — rejected per the clarification, and
also premature: feature 013 (which will introduce a "resigned" status
concept at all) doesn't exist yet, so this feature has nothing to filter
against even if it wanted to.

## Open Questions

None.
