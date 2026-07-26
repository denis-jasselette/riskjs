# Implementation Plan: Win Conditions, Elimination, Resignation & Ranking

**Branch**: `013-win-conditions-elimination-ranking` | **Date**: 2026-07-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-win-conditions-elimination-ranking/spec.md`

**Depends on**: [012-capital-mode](../012-capital-mode/spec.md)
(`GameState.capitalMode`, `GameController.ownsAllCapitals()`) for the
capital win condition — assumed implemented first per its own plan.

## Summary

Wire up the missing "the game actually ends" gap: `GameState.gameOver` is
declared but never set `true` during play, and a fully-built
`ResultsModal` component (winner banner, personal-elimination view, and
full standings table, all in one component gated by `winner`/`localPlayer`
props) is never rendered anywhere. This feature adds: a win-condition check
run after every capture *and* every resignation (per this session's
clarification); a `resign()` engine method with no prior concept in the
codebase; a `knockoutOrder` snapshot recorded once per player at the
moment they're defeated or resign (whichever comes first), driving the
three-tier ranking; a `turnCount` counter (nothing currently counts turns
either); and wiring `<ResultsModal>` into `App.tsx`, gated so it shows in
"personal elimination" mode to a defeated (non-resigned) viewer mid-game,
and in "final results" mode to every remaining connected participant once
`gameOver` becomes true — reusing the component's existing internal mode
switch rather than building a second screen. Card-transfer-on-defeat
(`transferCardsOnElimination`) already exists and almost exactly matches
FR-006/FR-007; it only needs a guard for the "this conquest is also the
winning move" exception.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19, existing Vite 5 app.

**Primary Dependencies**: None new. Extends `GameState`, `GameController`,
`MapController`; wires the already-built `ResultsModal`
(`src/components/menu/ResultsModal.tsx`) and `PlayerStanding`/`TurnSnapshot`
(`src/models/ResultsData.ts`) into `App.tsx`/`Game.tsx`. `history`
(`TurnSnapshot[]`) and the `rating`/`ratingDelta` standing fields are
out of scope (belong to the separate Game Replay (016) and a not-yet-specified
rating system respectively) — left `undefined`, which `ResultsModal`
already handles gracefully (optional prop; `HistoryChart` renders a "No
history recorded yet" placeholder).

**Storage**: N/A — in-memory `GameState` only.

**Testing**: Vitest 2. `GameController.test.ts`'s existing per-method
`describe()` blocks extend naturally: `resign()`, `checkWinCondition()`
(or however the win check is exposed/tested — likely via its effect on
`gameOver` after `attack()`/`resign()`), knockout-order recording, and
standings computation. `ResultsModal` itself already has a Storybook story
(`src/stories/ResultsModal.stories.tsx`) for its internal rendering logic;
this feature's job is the wiring/data-computation layer feeding it, which
is unit-testable in isolation from the component. UI wiring (when the
modal mounts, dismiss/spectate flow) validated manually per the
constitution's UI rule.

**Target Platform**: Browser (React SPA); mobile breakpoint per
constitution Principle IV (the modal's existing `dialog`-based layout is
inherited, not new).

**Project Type**: Single project. Model + controller + UI wiring, similar
scope to 012.

**Performance Goals**: N/A — turn-based, no perf budget.

**Constraints**:
- MUST reuse `transferCardsOnElimination()` (`GameController.ts:141-153`)
  rather than duplicating card-transfer logic — only add the "skip if this
  is the winning move" guard around its existing call site in `attack()`
  (`GameController.ts:131-132`).
- MUST reuse `ResultsModal` as-built (`src/components/menu/ResultsModal.tsx`)
  rather than building a separate personal-defeat screen — its
  `localEliminated`-vs-`gameOver` internal branching already produces
  exactly the two distinct views User Stories 2 and 5 require from a
  single component, gated by the props this feature computes and passes
  in.
- MUST NOT let a resigned player's continent-control contribution change —
  `calculateReinforcement()` (008) already treats resigned players'
  territories as normally owned for other players' continent checks
  (confirmed by existing test `GameController.test.ts:788-795`, whose
  comment explicitly notes "no resigned concept exists yet" — this feature
  is what finally adds it, without needing to touch 008 at all since it
  already made the correct assumption).
- MUST exclude resigned-held territories only from the *conquest-mode*
  win-condition denominator (FR-002) — capital-mode's win condition
  (FR-003) has no such exception; a resigned player's still-held capital
  continues to block the capital win until actually captured. This
  asymmetry comes directly from the spec (FR-002 vs. FR-003) and must not
  be collapsed into one shared "exclude resigned" rule.
- MUST make `getNextPlayer()` (`GameController.ts:169-176`) skip resigned
  players in addition to its existing `hasPlayerLost` skip — otherwise a
  resigned player could still be handed a turn.

**Scale/Scope**: Up to 6 players; ranking computed once per game end, and
recomputed live for the "eliminated mid-game" interim view.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. CI Gate is Law** — Validated by `pnpm run lint/test/build`; manual
  browser check required (golden path: play to a conquest-mode win, confirm
  `ResultsModal` shows correct winner/standings; capital-mode win with
  non-capital territory still split among losers; a mid-game elimination
  shows the interim personal screen to only the defeated player; a
  resignation immediately ending the game via the last-active-player case;
  edge case: resigned player's eventual defeat shows no duplicate personal
  screen but does appear correctly in final standings; regression: normal
  play unaffected until a win condition is actually met).
- **II. Strict Typing, No Silent Escapes** — New `GameState` fields
  (`resignedPlayers: string[]`, `knockoutOrder: Record<string, number>`,
  `turnCount: number`) and new `GameController` methods fully typed, no
  `any`. `getStandings()`'s return type is the existing `PlayerStanding[]`
  from `src/models/ResultsData.ts` — no new type needed for the shape
  `ResultsModal` already expects.
- **III. CSS Module Isolation** — No new stylesheets expected;
  `ResultsModal.module.scss` already exists and is unmodified by this
  feature (pure wiring, not a visual redesign). If any new wiring-only
  markup is needed in `App.tsx`, it stays inline/logic-only (no new visual
  component).
- **IV. Mobile Rendering Discipline** — `ResultsModal` is an existing
  `<dialog>`-based component; manual check confirms it still renders
  correctly at 640px once actually mounted (previously untested in a live
  game since it was never rendered).
- **V. Convention Over Improvisation** — No new dependencies, no lockfile
  changes.

**Result**: PASS — no violations, no Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/013-win-conditions-elimination-ranking/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md            # /speckit-tasks — not yet created
```

No `contracts/` directory — local engine/UI state only; the spec's
Assumptions explicitly note this feature interacts with the Card System
only by *triggering* its already-separate forced trade-in cascade
(`hasForcedTradeIn`/`startPhase('deploy')`, already implemented), not by
defining a new interface.

### Source Code (repository root)

```text
src/
├── models/
│   └── GameState.ts              # + resignedPlayers: string[]
│                                  # + knockoutOrder: Record<string, number>
│                                  # + turnCount: number
├── controllers/
│   └── GameController.ts         # + resign(player)
│                                  # + checkWinCondition() (private, dispatches
│                                  #   conquest vs. capital per capitalMode)
│                                  # + findConquestWinner() / findCapitalWinner()
│                                  # + isResigned(player)
│                                  # + recordKnockoutIfNeeded(player) (private)
│                                  # + getStandings(): PlayerStanding[]
│                                  # attack() — checkWinCondition() after conquest;
│                                  #   guard transferCardsOnElimination() when the
│                                  #   conquest is also the winning move (FR-006)
│                                  # getNextPlayer() — also skip resigned players
│                                  # startPlayerTurn() — + turnCount increment
├── components/
│   ├── App.tsx                   # + mount <ResultsModal> when gameOver, or when
│                                  #   viewingPlayer is defeated-and-not-resigned
│                                  # + computes standings/winner/totalTurns props
│                                  #   from gameState via GameController
│   └── Game.tsx                  # + resign action entry point (wherever the UI
│                                  #   exposes it — e.g. a menu/button; existing
│                                  #   elimination-diffing useEffect pattern
│                                  #   (Game.tsx:33-52) is the model for detecting
│                                  #   "viewingPlayer just became eligible for the
│                                  #   interim results view")
├── models/
│   └── ResultsData.ts            # unchanged — PlayerStanding/TurnSnapshot shape
│                                  #   already fits; this feature is the first to
│                                  #   populate them
```

**Structure Decision**: Single project. New engine state lives on
`GameState` alongside the existing `blizzards`/(012's `capitals`)
precedent; ranking computation lives in `GameController` as a pure query
method (`getStandings()`), mirroring `calculateReinforcement()`'s
"recomputed fresh, never cached" style; UI wiring connects existing,
previously-orphaned pieces (`ResultsModal`, `ResultsData` types) rather
than introducing new visual components.

## Complexity Tracking

*No Constitution Check violations — table intentionally omitted.*
