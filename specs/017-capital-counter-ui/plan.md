# Implementation Plan: Capital Counter UI

**Branch**: `017-capital-counter-ui` | **Date**: 2026-07-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/017-capital-counter-ui/spec.md`

**Depends on**: [012-capital-mode](../012-capital-mode/spec.md) (`GameState.capitalMode`,
`GameState.capitals`, `MapController.getPlayerCapitalCount()`) — assumed
implemented first per its own plan.

## Summary

A small, mostly-standalone display component: a new global "capital
counter" badge, mounted alongside the existing `<PlayerStatus />` bar in
`Game.tsx`, that shows either a round counter or an anonymized
leader-capital count depending on how many rounds have passed since
capital placement. The one piece of state this feature needs that doesn't
already exist anywhere — a round counter — is not part of 012's scope (012
never mentions rounds beyond naming its placement phase), so this feature
introduces it: a single new `GameState.roundsSincePlacement: number` field,
incremented via a small addition to the existing turn-cycling logic in
`GameController.startNextPlayerTurn()`, gated entirely behind
`capitalMode` so non-capital-mode games are completely unaffected.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19, existing Vite 5 app.

**Primary Dependencies**: None new. Reads `GameState.capitalMode`,
`GameState.capitals` (via `MapController.getPlayerCapitalCount()`), both
introduced by 012. Adds one new `GameState` field and one small
`GameController` change of its own (the round counter), plus a new UI
component.

**Storage**: N/A — in-memory `GameState` only.

**Testing**: Vitest 2. The round-counter increment logic
(`startNextPlayerTurn()`'s wrap detection) is a `GameController` unit-test
addition, following the existing per-method `describe()` block convention
in `GameController.test.ts`. The display component itself (pure
props-in/JSX-out, no interaction) is validated manually per the
constitution's UI rule, consistent with how 009's similarly small UI
addition was handled.

**Target Platform**: Browser (React SPA); must remain usable at the 640px
mobile breakpoint per constitution Principle IV — `PlayerStatus`'s existing
mobile collapse (fixed top bar) is the direct layout precedent to match.

**Project Type**: Single project. One new small component + one small
`GameController`/`GameState` addition; no new packages.

**Performance Goals**: N/A — a per-render derived display value, recomputed
from existing state on every relevant `GameState` change (SC-003 requires
"no stale or delayed values", which a pure render-time derivation
satisfies for free — no memoization/caching to get wrong).

**Constraints**:
- MUST NOT add new capital-ownership tracking or computation — the leader
  value is `Math.max(...gameState.playerConfigs.map(p =>
  mapController.getPlayerCapitalCount(p.color)))`, entirely derived from
  012's existing `getPlayerCapitalCount()`, per spec Assumptions ("does not
  compute or change anything" about capitals themselves).
- MUST NOT reveal which player holds the lead (FR-005) — the component
  renders only the numeric max, never a per-player breakdown, and must not
  be structured in a way that leaks it indirectly (e.g. no per-player
  tooltip, no hover state showing individual counts).
- MUST NOT regress non-capital-mode games — every code path this feature
  touches (`startNextPlayerTurn`'s increment, the new component's render)
  is gated behind `gameState.capitalMode`, mirroring how 012 gates its own
  additions (FR-007, SC-005).
- The round counter is entirely new state with no other consumer in the
  codebase today (confirmed: no existing "round" concept anywhere in
  `GameState`/`GameController`) — this feature owns its definition and
  increment logic outright; it isn't shared with or exposed to 012 or 013.

**Scale/Scope**: One global badge, updated on every relevant state change;
no per-player or per-territory rendering.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. CI Gate is Law** — Validated by `pnpm run lint/test/build`; manual
  browser check required (golden path: play through placement, verify
  round counter for 3 rounds then switch to leader count; edge cases:
  tied leader value, capital captured mid-game changing the max, resigned
  player's capital still counted; regression: non-capital-mode game shows
  neither element).
- **II. Strict Typing, No Silent Escapes** — New `GameState.roundsSincePlacement:
  number` field and new component props are fully typed, no `any`.
- **III. CSS Module Isolation** — New `CapitalCounter.module.scss`,
  modeled on `PlayerStatus.module.scss`'s fixed-position badge styling;
  never a global stylesheet addition.
- **IV. Mobile Rendering Discipline** — New badge checked at the 640px
  breakpoint; positioned via normal CSS layout (fixed position + flex), not
  `transform: translate(-50%,-50%)`, consistent with the constitution's
  explicit rule and `PlayerStatus`'s existing approach.
- **V. Convention Over Improvisation** — No new dependencies, no lockfile
  changes.

**Result**: PASS — no violations, no Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/017-capital-counter-ui/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md            # /speckit-tasks — not yet created
```

No `contracts/` directory — purely local display state, no external
interface.

### Source Code (repository root)

```text
src/
├── models/
│   └── GameState.ts                     # + roundsSincePlacement: number (default 0)
├── controllers/
│   └── GameController.ts                # startNextPlayerTurn() — + wrap-detection
│                                         #   increment, gated by capitalMode
├── components/
│   ├── Game.tsx                         # + <CapitalCounter /> alongside <PlayerStatus />
│   └── capitalCounter/                  # new directory
│       ├── CapitalCounter.tsx           # new — reads gameState, renders round or leader
│       └── CapitalCounter.module.scss   # new — modeled on PlayerStatus.module.scss
```

**Structure Decision**: Single project. New component lives in its own
`components/capitalCounter/` directory (mirrors the existing
`components/playerStatus/` and `components/actionMenu/` per-feature
grouping convention); the one new piece of engine state
(`roundsSincePlacement`) lives on `GameState` next to `capitalMode` for
locality, even though this feature — not 012 — owns its definition.

## Complexity Tracking

*No Constitution Check violations — table intentionally omitted.*
