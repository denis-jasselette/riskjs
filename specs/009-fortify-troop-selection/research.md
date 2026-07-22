# Phase 0 Research: Fortify Troop-Count Selection

No open `NEEDS CLARIFICATION` markers — stack is fixed by the constitution
and this is a small UI change on top of an already-correct engine method.
Findings below are existing-code reconnaissance, not technology evaluation.

## Decision: `GameController.fortify()` needs no changes

**Rationale**: `fortify(troops, fromTerritory, toTerritory)`
(`src/controllers/GameController.ts:119`) already accepts any `troops`
value and decrements/increments the two territories' troop counts directly
— there is no hardcoded `1` in the engine. It also already calls
`startNextPlayerTurn()` unconditionally at the end, which is exactly FR-006
("auto-end phase after a move"). The only hardcoded `1` in the whole
codebase for this behavior is the call site in `Game.tsx:110`
(`gameController.fortify(1, selectedTerritory, territory)`). This confirms
the checklist note that this is "a UI/wiring gap, not new engine logic."

**Alternatives considered**: None — nothing to evaluate, this is a direct
finding from reading the code the checklist already pointed at.

## Decision: Model the troop-count picker on the existing attack dice-selector pattern

**Rationale**: `Game.tsx` already implements an equivalent two-step
interaction for attack: `attackDiceCount` state + `maxAttackDice` (derived
from the selected source's troop count) are threaded into `ActionMenu`,
which renders a small button row (`DiceSelector`) and only fires the attack
when the destination is clicked. Fortify should follow the same shape:
component-local state for the chosen amount, a derived max from the source
territory, and an `ActionMenu` control — but see the next decision for why
the *control widget* itself differs.

**Alternatives considered**: Inlining a one-off `<input>` directly in
`Game.tsx` without going through `ActionMenu` — rejected because
`ActionMenu` is already the established home for all in-turn action
controls (dice selector, phase indicator, end-phase button), and keeping
`Game.tsx` as the state/orchestration layer with `ActionMenu` as the
presentation layer matches the existing split.

## Decision: The troop-count control cannot reuse `DiceSelector`'s fixed 1/2/3 buttons

**Rationale**: Attack dice are capped at 3 by Risk's rules, so three
buttons work. Fortify troop count ranges from 1 to `N−1` where `N` can be
"dozens" of troops late-game (spec Assumptions: no upper bound beyond
leaving 1 behind). A fixed button row doesn't scale. No slider/stepper
component exists elsewhere in `src/components` to reuse (checked — only
unrelated form inputs in the lobby components). A new small control is
needed: a numeric stepper or range input bounded to `[1, N−1]`, paired with
a visible count and a separate "Confirm" action (distinct from the existing
"End turn" `PhaseEndButton`, which must keep working unconditionally per the
clarified requirement that ending the phase is available at any point before
confirming).

**Alternatives considered**: Reusing button-per-value like `DiceSelector` —
rejected, doesn't scale past small numbers. A modal/dialog for the
troop-count input — rejected as heavier than needed; an inline control in
the existing `ActionMenu` bar is consistent with how the dice selector
already works and avoids a new interaction pattern (modals) not used
elsewhere in the game UI.

## Decision: Interaction state machine (from the 2026-07-23 clarification)

**Rationale**: The clarified flow — click source (click again to
deselect), click destination (click again to deselect), adjust troop
count freely, Confirm executes and immediately ends the phase, and manual
end-phase is available at any point beforehand — requires one new piece of
state beyond what exists today: a `fortifyDestination` (the current code
only tracks one `selectedTerritory` and executes immediately on the second
click). `fortifyTroopCount` is additionally needed to hold the in-progress
amount before Confirm. Both reset whenever the source is deselected or a
move is confirmed.

**Alternatives considered**: Reusing `selectedTerritory` alone by executing
the fortify on the second click and only *then* letting the player "undo"
via some reversal — rejected, since a real troop transfer would have to be
speculatively applied and rolled back, which is more complex and riskier
than simply not calling `fortify()` until Confirm is pressed (the engine
call is a single atomic step with no partial-application concept today).

## Open Questions

None.
