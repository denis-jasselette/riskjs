# Implementation Plan: Capital Mode

**Branch**: `012-capital-mode` | **Date**: 2026-07-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-capital-mode/spec.md`

## Summary

Add a selectable game mode in which each player designates one owned
territory as their capital during a new one-time, round-1 placement step
(+2 troops on selection), track that territory's live owner as normal
capture happens (no special transfer logic), feed the current player's
capital count into the already-implemented `calculateReinforcement()`
capital bonus (currently hardcoded to 0 everywhere it's called), grant
capital territories +1 max defending die, and expose an "owns every
capital" query for the separate Win Conditions feature (013) to consume
later. Most of the consuming logic (`calculateReinforcement`'s
`capitalsOwned` param, the troop-cap-capped dice-roll math, a dead
`capitalDeploy` `GamePhase` value) already exists from prior groundwork —
this feature is primarily: (1) new tracked state for capital
assignment/ownership, (2) a new one-time placement step reusing the dead
phase value, and (3) wiring that state into the two existing consumers.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19, existing Vite 5 app.

**Primary Dependencies**: None new. Extends `GameState`, `GameController`,
`MapController`, `GameLogic`, and the UI layer (`App.tsx`, `GameOver.tsx`,
`Game.tsx`, `ActionMenu.tsx` + siblings).

**Storage**: N/A — in-memory `GameState` only, no persistence layer exists
for in-game state (only `src/net/LobbySocket.ts` for pre-game lobby
networking; no `GameState` serialization exists yet, so no wire-format
compatibility concern for new fields).

**Testing**: Vitest 2. `GameController.test.ts` already has a
`describe('GameController', ...)` suite with per-method blocks (e.g.
`attack()`, `fortify()`, `getNextPlayer()`); new methods
(`chooseCapital`, `ownsAllCapitals`, capital-aware `attack()`/
`calculateReinforcement()` behavior) follow that same pattern. UI wiring
(new placement-step control, mode-toggle checkbox) is validated manually
per the constitution's UI rule.

**Target Platform**: Browser (React SPA), same local pass-and-play surface
as today; must remain usable at the mobile breakpoint per constitution
Principle IV.

**Project Type**: Single project. Touches model (`GameState`), controller
(`GameController`, `MapController`, `GameLogic`) and UI layers — broader
than a UI-only change, but no new packages or architectural layers.

**Performance Goals**: N/A — turn-based, no perf budget.

**Constraints**:
- MUST NOT change `calculateReinforcement(player, capitalsOwned = 0)`'s
  existing signature/contract (`GameController.ts:195`) — 008 already
  built this to accept a real count; this feature only needs to pass one
  at the call site (`startPlayerTurn`, `GameController.ts:185`) instead of
  relying on the default.
- MUST NOT implement any win-condition/game-ending logic — FR-009 only
  requires an queryable "owns all capitals" fact; acting on it is 013's
  responsibility (explicitly out of scope per spec Assumptions).
- MUST reuse the existing `'capitalDeploy'` `GamePhase` value
  (`src/models/GamePhase.ts:1`) for the new placement step rather than
  inventing a new phase name — it already exists as unreferenced
  scaffolding from the abandoned prior branch and is the obvious intended
  slot.
- MUST NOT break the existing `blizzards`-style precedent: capital state
  should follow the same "plain tracked field on `GameState`, read via a
  small `MapController` helper" shape already used for
  `blizzards: string[]` / `isTerritoryBlizzard()`, not a heavier
  abstraction.

**Scale/Scope**: Up to 6 players (existing player-count ceiling), one
capital per player, one placement step per game.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. CI Gate is Law** — Validated by `pnpm run lint/test/build`; manual
  browser check required per Development Workflow since this adds a new
  UI step (golden path: full capital-mode game through placement into
  normal play; edge cases: 2-player and 6-player placement turn order,
  capital captured mid-game, capital-mode toggle off leaves everything
  unchanged; regression check: non-capital-mode games behave exactly as
  today).
- **II. Strict Typing, No Silent Escapes** — New `GameState` fields
  (`capitalMode: boolean`, `capitals: Record<string, string>`) and new
  `GameController`/`MapController` methods are fully typed, no `any`; the
  existing `GamePhase` union type already includes `'capitalDeploy'` so no
  type-widening is needed.
- **III. CSS Module Isolation** — Any new placement-step control styles go
  in `ActionMenu.module.scss` (or a colocated module if factored into its
  own component), never a global stylesheet.
- **IV. Mobile Rendering Discipline** — New placement-step control checked
  at the 640px breakpoint; no map-overlay positioning is introduced by this
  feature (no new SVG-positioned elements), so the `transform`/`x`/`y` rule
  is not directly implicated, but the manual check still applies to the new
  control.
- **V. Convention Over Improvisation** — No new dependencies, no lockfile
  changes.

**Result**: PASS — no violations, no Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/012-capital-mode/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md            # /speckit-tasks — not yet created
```

No `contracts/` directory — this is entirely local game-engine/UI state;
no network message or external interface is added (the online protocol gap
is explicitly flagged in the spec as a deferred follow-up to feature 001,
not addressed here).

### Source Code (repository root)

```text
src/
├── models/
│   ├── GameState.ts             # + capitalMode: boolean, capitals: Record<string, string>
│   └── GamePhase.ts             # unchanged — 'capitalDeploy' already exists
├── controllers/
│   ├── GameLogic.ts             # initState() — + capitalModeEnabled param; stop at
│   │                             #   'capitalDeploy' phase instead of auto-starting play
│   │                             #   when capital mode is on
│   ├── MapController.ts         # + isTerritoryCapital(), getPlayerCapitalTerritory(),
│   │                             #   getPlayerCapitalCount() — mirrors isTerritoryBlizzard()
│   └── GameController.ts        # + chooseCapital(territory), + ownsAllCapitals(player)
│                                 #   attack() — capital-aware maxDefender (2 → 3)
│                                 #   startPlayerTurn() — pass real capitalsOwned count
│                                 #   isSelectable() — + 'capitalDeploy' phase case
├── components/
│   ├── App.tsx                   # threads capitalMode through handleStart → initState
│   ├── menu/GameOver.tsx         # + "Capital mode" checkbox, mirrors blizzards/fog
│   ├── Game.tsx                  # + capital-placement click handling (mirrors deploy)
│   └── actionMenu/
│       ├── ActionMenu.tsx        # + capital-placement control area
│       ├── ActionMenu.module.scss
│       └── PhaseIndicator.tsx    # unchanged — placement step intentionally has no tab
│                                 #   (it's a one-time pre-game step, not a turn phase)
```

**Structure Decision**: Single project. State lives on `GameState`
alongside `blizzards`, following that exact precedent; engine logic lives
in `GameController`/`MapController` alongside the equivalent
attack/reinforcement/selectability logic it modifies; UI wiring follows the
existing deploy-phase click-to-select pattern in `Game.tsx`/`ActionMenu.tsx`.

## Complexity Tracking

*No Constitution Check violations — table intentionally omitted.*
