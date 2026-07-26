# Phase 0 Research: Post-Conquest Troop Movement

No open `NEEDS CLARIFICATION` markers. Findings below establish exactly
how the existing single-call, multi-round `attack()` resolution already
provides everything this feature needs, and where the closest UI
precedent lives.

## Decision: The winning roll's dice count is already computed and available — `result.attackerDice.length`

**Rationale**: `attackRng()` (`GameController.ts:83-106`) resolves an
entire battle to completion in one call via a `while (attackingTroops > 0
&& defendingTroops > 0)` loop; each iteration overwrites
`lastAttackerDice`/`lastDefenderDice` with that round's dice, so by the
time the loop exits (defender reaches 0), these hold exactly the *final,
decisive* round's dice — precisely "the dice used in the winning (final,
decisive) attack roll" (FR-002). No new tracking is needed; `attack()`
already receives this via `result.attackerDice.length`
(`GameController.ts:117-118`).

**Alternatives considered**: Re-deriving the winning round's dice count
from `attackerLosses`/`defenderLosses` after the fact — rejected,
unnecessary and less direct than the value the loop already produces.

## Decision: The spec's "zero attacker losses in the winning round" claim is independently verifiable from the existing loop, confirming the min-never-exceeds-max guarantee needs no new enforcement

**Rationale**: Walking `attackRng`'s per-round comparison loop
(`GameController.ts:93-102`): for a round to reduce `defendingTroops`
to exactly 0, every compared die pair that round must resolve in the
attacker's favor (each such pair increments `losses[1]`, defender losses
— none increment `losses[0]`, attacker losses). So the decisive round
inherently costs the attacker 0 losses, confirming the spec's Edge Case
reasoning directly against the actual combat code, not just by
assumption. This is why `min` (dice used in that round) can never exceed
`max` (troops available to move minus 1) — already proven, nothing new to
enforce.

**Alternatives considered**: Adding a defensive bounds-check / fallback for
`min > max` — rejected per the spec's own Edge Case conclusion ("no
fallback handling for a bounds conflict is needed"); adding one would be
dead code for a mathematically impossible case.

## Decision: `max` is never stored — it's always recomputable as the two territories' combined troop pool minus 1

**Rationale**: Once combat ends, `attackingTroopState.count` (troops that
never left the source) and `defendingTroopState.count` (survivors, now in
the conquered territory) sum to a fixed total — moving troops between them
via `confirmPostConquestMove()` only redistributes that sum, never changes
it. So `max = getTroopCount(source) + getTroopCount(conqueredTerritory) -
1` is correct at any moment without needing to freeze it at conquest time.
Only the winning roll's dice count (`min`) is genuinely ephemeral — it's
not derivable from any territory's troop count after the fact — so that's
the only bound the new `GameState.pendingPostConquestMove` field actually
stores, alongside the two territory names needed to know what's being
adjusted.

**Alternatives considered**: Storing both `min` and `max` on
`pendingPostConquestMove` at conquest time — rejected as redundant state
that could theoretically drift from the live territory counts it would
duplicate (the same "derive, don't duplicate" reasoning already used for
012's `getPlayerCapitalCount()` and 017's leader calculation in this
session's other plans).

## Decision: The pending choice lives on `GameState`, not component-local React state

**Rationale**: FR-007 requires blocking *any* further action — not just
disabling one specific control — until the choice is resolved. Component-
local state (like 009's `fortifyTroopCount`) is sufficient when only one
component's own behavior needs gating, but here `isSelectable()`
(`GameController.ts:46-67`, called for every territory click regardless of
which component renders the clickable element) and `PhaseEndButton`
(`PhaseEndButton.tsx`, which already reads `gameState` directly for its
own disabled-state logic) both need to independently observe "is a
post-conquest choice pending" — which requires it to live in `GameState`,
the one piece of data both already have access to.

**Alternatives considered**: Lifting a `pendingConfirm: boolean` flag into
`Game.tsx`'s component state and threading it down as a new prop to both
`isSelectable()`'s caller and `PhaseEndButton` — rejected, `isSelectable()`
is a `GameController` method that operates purely on `GameState` today
(no additional UI-state parameters); adding one would break its existing
signature and every other call site, whereas a `GameState` field composes
with the existing method for free.

## Decision: Only set `pendingPostConquestMove` when `min < max` — directly implements this session's clarification with no extra branching later

**Rationale**: When the winning roll's dice count equals the maximum
(leaving 1 behind), there is exactly one valid value — the default already
applied. Setting `pendingPostConquestMove` in that case would require
`ActionMenu`'s visibility check and `PhaseEndButton`'s disabled check to
*both* additionally special-case "pending, but only one valid value, so
don't actually show/block" — two extra conditions across two components.
Simply never creating the pending record when `min === max` collapses
both of those into "if pending, gate; if not, don't" with zero special
cases, while still being behaviorally correct: the single valid value is
already in place via the unconditional default assignment.

**Alternatives considered**: Always setting `pendingPostConquestMove` and
having `ActionMenu`/`PhaseEndButton` separately check `min === max` —
rejected as the exact two-extra-conditions duplication described above,
for identical net behavior.

## Decision: New UI control is modeled directly on the existing `FortifySelectorRow`, not the 3-button `DiceSelector`

**Rationale**: `ActionMenu.tsx:106-145` (`FortifySelectorRow`) already
implements exactly the shape this feature needs: a stepper +/- pair, a
range `<input>` with the same custom track-fill gradient helper
(`sliderTrackFill`, `ActionMenu.tsx:14-17`), a live count display, and a
separate Confirm button — bounded `[min, max]` rather than fixed small
choices. This is the same reasoning 009 itself used when it rejected
reusing the fixed 1/2/3-button `DiceSelector` for its own troop-count
range. The new control's minimum is `pendingPostConquestMove.minTroopsToMove`
rather than 009's hardcoded `1`, otherwise it's a direct structural copy.

**Alternatives considered**: A modal dialog — rejected, same reasoning 009
already recorded: heavier than needed, and inconsistent with how every
other in-turn choice in this game lives inline in `ActionMenu`.

## Decision: `PhaseEndButton` gains a new disabled branch, modeled on its existing "Trade-in required" pattern

**Rationale**: `PhaseEndButton.tsx:29-35` already disables the End Phase
button with an explanatory label ("Trade-in required") when
`hasForcedTradeIn()` is true, before the phase's normal button renders.
Adding an equivalent early check — `if (gameState.pendingPostConquestMove)
return <button disabled>Choose troops to move</button>` — is a direct,
consistent extension of an already-established gating pattern, requiring
no new UI paradigm.

**Alternatives considered**: Leaving the End Phase button enabled but
making its click handler a no-op while pending — rejected, a disabled
button with an explanatory label (the existing pattern) communicates the
blocked state to the player far more clearly than a button that silently
does nothing.

## Open Questions

None — every mechanic has a direct hook point in `attack()`'s existing
combat resolution, and the UI has a directly analogous existing control to
model against.
