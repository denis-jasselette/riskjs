# Implementation Plan: Post-Conquest Troop Movement

**Branch**: `024-post-conquest-troop-movement` | **Date**: 2026-07-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/024-post-conquest-troop-movement/spec.md`

## Summary

`GameController.attack()`'s conquest branch currently moves every
surviving attacker into the newly conquered territory unconditionally
(`defendingTroopState!.count = attackingTroops - result.attackerLosses`).
This feature keeps that exact assignment as the *default* (satisfying
FR-005 for free, byte-for-byte identical to today's behavior when the
player takes no action) but makes it adjustable: `attack()` additionally
computes the winning roll's dice count (already captured as
`result.attackerDice.length` — the final, decisive round's attacker dice,
which the existing combat math guarantees cost zero attacker losses) as
the minimum, and — only when that minimum is strictly less than the
maximum (leaving 1 behind in the source) — records a new transient
`GameState.pendingPostConquestMove` marking the choice as open. A new
`ActionMenu` control, modeled directly on the existing fortify
troop-count slider, lets the player rebalance the split before a new
`confirmPostConquestMove()` method clears the pending state; until
cleared, `isSelectable()` and `PhaseEndButton` block every other action
(FR-007), exactly mirroring how forced trade-in already blocks phase
progression today.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19, existing Vite 5 app.

**Primary Dependencies**: None new. Extends `GameState`, `GameController`,
and the UI layer (`Game.tsx`, `ActionMenu.tsx` + `.module.scss`,
`PhaseEndButton.tsx`).

**Storage**: N/A — in-memory `GameState` only.

**Testing**: Vitest 2. `GameController.test.ts`'s existing `describe('attack()'
, ...)` and per-method blocks extend directly; `confirmPostConquestMove()`
and the `pendingPostConquestMove` gating in `isSelectable()` get their own
blocks, following the file's established pattern. UI wiring (the new
slider control, End Phase button disabling) validated manually per the
constitution's UI rule, as 009's equivalent slider was.

**Target Platform**: Browser (React SPA); must remain usable at the 640px
mobile breakpoint per constitution Principle IV.

**Project Type**: Single project. Small, additive change to one existing
controller method plus one new method, one new transient `GameState`
field, and UI wiring directly modeled on an existing sibling control
(`FortifySelectorRow`).

**Performance Goals**: N/A — turn-based, no perf budget.

**Constraints**:
- MUST NOT change `attack()`'s existing signature or its behavior for
  callers that never interact with the new pending state — the default
  (no action taken) must remain byte-identical to today's automatic
  full-transfer behavior (spec Assumptions: "only adds a player choice...
  combat resolution logic... is unchanged").
- MUST NOT let this choice count toward or interact with the fortify-phase
  one-move-per-turn allowance (009) — enforced simply by using entirely
  separate state (`pendingPostConquestMove` vs. the fortify slider's
  component-local state) with no shared counter (FR-008).
- MUST skip presenting the interactive control entirely when the minimum
  and maximum bounds are equal, auto-confirming that single value instead
  (this session's clarification) — achieved by only ever setting
  `pendingPostConquestMove` when `min < max`; when equal, the
  already-applied default *is* the only valid value, so there is nothing
  to adjust and no pending state to create.
- MUST NOT persist derivable state — `max` (leaving 1 behind in the
  source) is always recomputable on demand as
  `getTroopCount(source) + getTroopCount(conqueredTerritory) - 1` (the
  two territories' combined troop pool is fixed once combat ends; only
  its split changes), so `pendingPostConquestMove` only stores what
  isn't otherwise derivable: the winning roll's dice count (the minimum)
  and the two territory names.
- Explicitly out of scope: any change to the online gameplay protocol
  (001) — flagged in the spec as a likely follow-up drift-fix, not
  addressed here, consistent with how the capital-placement/resign gaps in
  001 were previously found and reported separately before being patched.

**Scale/Scope**: One choice per successful conquest; no scale concerns.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. CI Gate is Law** — Validated by `pnpm run lint/test/build`; manual
  browser check required (golden path: conquer with survivors exceeding
  the winning roll's dice count, adjust and confirm a value in between;
  edge cases: min-equals-max conquest shows no control at all and just
  proceeds, attempting another action while a choice is pending is
  blocked, End Phase button is disabled while pending; regression: fortify
  phase's own slider/one-move-per-turn behavior unaffected).
- **II. Strict Typing, No Silent Escapes** — New `GameState.pendingPostConquestMove:
  { sourceTerritory: string, conqueredTerritory: string, minTroopsToMove: number }
  | null` and new component props follow the existing typed-optional-props
  pattern already used for `fortifyDestination`/`maxFortifyTroops`; no
  `any`.
- **III. CSS Module Isolation** — New selector row's styles go in
  `ActionMenu.module.scss`, reusing the existing slider/stepper/track-fill
  styling already defined there for the fortify control, never a global
  stylesheet.
- **IV. Mobile Rendering Discipline** — New control checked at the 640px
  breakpoint; it's a menu control (not a map overlay), so the
  `transform`/`x`/`y` positioning rule is not directly implicated, but the
  manual check still applies.
- **V. Convention Over Improvisation** — No new dependencies, no lockfile
  changes.

**Result**: PASS — no violations, no Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/024-post-conquest-troop-movement/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md            # /speckit-tasks — not yet created
```

No `contracts/` directory — local UI/engine state only; the online
protocol interaction is explicitly deferred (spec Assumptions), not
implemented here.

### Source Code (repository root)

```text
src/
├── models/
│   └── GameState.ts                     # + pendingPostConquestMove: {...} | null
├── controllers/
│   └── GameController.ts                # attack() — + pending-state setup on
│                                         #   conquest (only when min < max)
│                                         # + confirmPostConquestMove(troopsToMove)
│                                         # isSelectable() — + early `false` while
│                                         #   pending
├── components/
│   ├── Game.tsx                         # + onPostConquestConfirm handler,
│                                         #   threads pending state into ActionMenu
│   └── actionMenu/
│       ├── ActionMenu.tsx               # + PostConquestSelectorRow, modeled on
│       │                                 #   the existing FortifySelectorRow
│       ├── ActionMenu.module.scss       # + styles (or reuse Fortify* classes)
│       └── PhaseEndButton.tsx           # + disabled state while pending, modeled
│                                         #   on the existing "Trade-in required"
│                                         #   disabled-button branch
```

**Structure Decision**: Single project. All work is in the existing
`controllers/`/`components/` layers, directly extending the `attack()`
method and the `ActionMenu`/`PhaseEndButton` components that already
implement the closely analogous fortify-slider and forced-trade-in-gate
patterns this feature reuses.

## Complexity Tracking

*No Constitution Check violations — table intentionally omitted.*
