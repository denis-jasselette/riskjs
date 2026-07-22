# Implementation Plan: Reinforcement Calculation

**Branch**: `008-reinforcement-calculation` | **Date**: 2026-07-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-reinforcement-calculation/spec.md`

## Summary

Replace the hardcoded `troopsToDeploy = 3` assignment in
`GameController.startPlayerTurn()` with a computed total: `max(3,
floor(territories/3)) + sum(continent bonuses fully controlled) +
(capitalsOwned * 2)`. Two of the three sub-rules can reuse existing engine
primitives almost as-is (`getPlayerTerritoryTotal`,
`MapController.getContinentOwner`, `MapConfig.continents[x].bonusTroops`);
only the territory-count formula and a new capital-bonus term are net-new
logic. Capital ownership count is threaded through as a parameter defaulting
to 0, since Capital Mode (012) does not exist yet.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), targeting the existing Vite
5 + React 19 app.

**Primary Dependencies**: None new. Reuses `GameController`, `MapController`,
`GameState`, `MapConfig` already in `src/`.

**Storage**: N/A — in-memory `GameState`, no persistence.

**Testing**: Vitest 2, colocated `*.test.ts` files (`GameController.test.ts`
already covers `startPlayerTurn`/territory-total helpers and is the natural
home for new cases).

**Target Platform**: Browser (React SPA), same runtime as the rest of the
Rules Engine axis — this feature has no server-side component.

**Project Type**: Single project (existing `src/` React+TS app). No
frontend/backend split applies to this feature.

**Performance Goals**: N/A beyond "instant" — reinforcement is computed once
per turn start on data already held in memory (a handful of territories/
continents); no measurable perf budget needed.

**Constraints**: Must not regress `hasPlayerLost`/`getPlayerTerritoryTotal`
behavior (shared with elimination logic). Must remain correct with capital
mode absent (capitals param defaults to 0, contributing nothing) per the
spec's Assumptions.

**Scale/Scope**: One map (`classic`, 42 territories, 6 continents) today;
formula must generalize to any `MapConfig` (continent count/bonus values are
data, not hardcoded).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. CI Gate is Law** — Plan produces logic exercised by `pnpm run test`
  (Vitest) and passes `pnpm run lint` / `pnpm run build`; no exception
  needed.
- **II. Strict Typing, No Silent Escapes** — New function takes explicit
  typed params (`territoryCount: number`, `continentBonuses:
  Record<string, number>` derived from typed `MapConfig`, `capitalsOwned:
  number`); no `any`/casts required since all inputs already have types in
  `GameState`/`MapConfig`.
- **III. CSS Module Isolation** — N/A, no UI/styling change.
- **IV. Mobile Rendering Discipline** — N/A, no rendering change; the
  reinforcement total surfaces through the existing `troopsToDeploy` display,
  unchanged.
- **V. Convention Over Improvisation** — Will branch as
  `issue-<number>-008-reinforcement-calculation` (or equivalent per repo
  convention) when implementation starts; no lockfile changes anticipated
  (zero new dependencies).

**Result**: PASS — no violations, no entries needed in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/008-reinforcement-calculation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not yet created)
```

No `contracts/` directory: this feature has no external interface (no new
API endpoint, CLI surface, or network message) — it changes an internal
calculation consumed only by `GameController` itself. Skipped per the
plan template's "skip if purely internal" guidance.

### Source Code (repository root)

```text
src/
├── controllers/
│   ├── GameController.ts       # startPlayerTurn() — wire in new total
│   ├── GameController.test.ts  # new reinforcement test cases
│   └── MapController.ts        # getContinentOwner() — reused as-is
├── models/
│   ├── GameState.ts             # troopsToDeploy target field (unchanged shape)
│   └── MapConfig.ts             # continents[x].bonusTroops (existing, reused)
```

**Structure Decision**: Single project, no new directories. All changes land
in the existing `src/controllers/` layer that already owns turn-start logic
(`GameController.startPlayerTurn`) and continent/ownership queries
(`MapController`).

## Complexity Tracking

*No Constitution Check violations — table intentionally omitted.*
