# Implementation Plan: Fortify Troop-Count Selection

**Branch**: `009-fortify-troop-selection` | **Date**: 2026-07-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-fortify-troop-selection/spec.md`

## Summary

The engine already supports this feature: `GameController.fortify(troops,
from, to)` accepts an arbitrary troop count and already auto-advances the
turn via `startNextPlayerTurn()`. The only hardcoded piece is the UI call
site in `Game.tsx` (`gameController.fortify(1, selectedTerritory,
territory)`), which fires immediately on a destination click. This feature
is a UI/wiring change: introduce a two-step select-then-confirm interaction
(source → destination → troop-count picker → Confirm) modeled on the
existing attack-phase dice-count picker pattern in `ActionMenu`, replacing
the current single-click-executes behavior for fortify only.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19, existing Vite 5 app.

**Primary Dependencies**: None new. Extends `Game.tsx`, `ActionMenu.tsx`
(+ its `.module.scss`); no new packages.

**Storage**: N/A.

**Testing**: Vitest 2. `GameController.fortify()` itself is already
implicitly covered (arbitrary troop count already works); new coverage is
needed for the UI interaction state machine — since that lives in a React
component, this is validated primarily via manual browser testing per the
constitution's UI rule, with any extractable pure logic (e.g. "what troop
counts are selectable for a given source") unit-tested if factored out of
the component.

**Target Platform**: Browser (React SPA), same local pass-and-play surface
as today; must remain usable at the mobile breakpoint per constitution
Principle IV.

**Project Type**: Single project, UI layer only — no controller/model
changes required.

**Performance Goals**: N/A — interactive UI state change, no perf budget.

**Constraints**: Must preserve "multi-hop pathing through owned territory
unchanged" (`isFortifyAllowed`/`areConnected` untouched). Must not disturb
the attack-phase dice-selector code path it's modeled on. New troop-count
control must remain usable for large values (assumption: no upper bound
beyond N−1), so the existing 3-button `DiceSelector` pattern (fixed 1/2/3
choices) cannot be reused verbatim — see research.md.

**Scale/Scope**: Single territory pair per move, at most one move per turn;
no scale concerns.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. CI Gate is Law** — Change validated by `pnpm run lint/test/build`;
  manual browser check required per Development Workflow since this is a
  UI-behavior change (golden path: multi-troop fortify; edge cases: 2-troop
  source, cancel-before-confirm, end-phase-without-fortifying; regression
  check: attack-phase dice selector still works).
- **II. Strict Typing, No Silent Escapes** — New component state
  (`fortifyDestination: string | undefined`, `fortifyTroopCount: number`)
  and new `ActionMenu` props follow the existing typed-optional-props
  pattern already used for `attackDiceCount`/`maxAttackDice`; no `any`.
- **III. CSS Module Isolation** — New selector control's styles go in
  `ActionMenu.module.scss` (or a new colocated `.module.scss` if extracted
  to its own component), never a global stylesheet.
- **IV. Mobile Rendering Discipline** — New control must be checked at the
  640px breakpoint; if it renders troop markers/positioned elements, use
  explicit `x`/`y`, not `transform: translate(-50%,-50%)` (existing
  constitution rule, likely N/A here since this is a menu control, not a
  map overlay, but flagged for the manual browser check).
- **V. Convention Over Improvisation** — No new dependencies, no lockfile
  changes.

**Result**: PASS — no violations, no Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/009-fortify-troop-selection/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md            # /speckit-tasks — not yet created
```

No `contracts/` directory — this is a local UI interaction change with no
external interface (no network message, no new engine API beyond the
already-existing `fortify()` signature).

### Source Code (repository root)

```text
src/
├── components/
│   ├── Game.tsx                          # interaction state machine (select → confirm)
│   └── actionMenu/
│       ├── ActionMenu.tsx                # + fortify troop-count control, + Confirm action
│       ├── ActionMenu.module.scss        # + styles for the new control
│       └── PhaseEndButton.tsx            # unchanged — "End turn" already works mid-selection
├── controllers/
│   └── GameController.ts                 # fortify() — unchanged, already correct
```

**Structure Decision**: Single project. All work is in the existing
`components/` layer; `GameController.fortify()` requires no changes since it
already accepts an arbitrary troop count and already auto-ends the phase.

## Complexity Tracking

*No Constitution Check violations — table intentionally omitted.*
