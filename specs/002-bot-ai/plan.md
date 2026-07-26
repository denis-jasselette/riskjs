# Implementation Plan: Bot AI

**Branch**: `002-bot-ai` | **Date**: 2026-07-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-bot-ai/spec.md`

## Summary

Build a fog-of-war-respecting decision engine — `decideAction(gameState,
mapController, player): BotDecision | null` — that produces one legal turn
action at a time for an automated seat (Easy: uniform-random among legal
choices; Medium: single deterministic heuristic favoring good attacks,
border reinforcement, continent completion, and capital pressure; Neutral:
suppresses attacks regardless of tier), plus the wiring to actually drive a
bot seat's turns in local pass-and-play (`Game.tsx`) and to finally read the
three already-present-but-inert `bot_count`/`bot_behavior`/`bot_difficulty`
form fields in `GameOver.tsx` into real `PlayerConfig` entries. A related,
smaller finding: today's `BotSkill` type folds `'neutral'` into the same
enum as difficulty (`'easy'|'medium'|'hard'|'expert'|'neutral'`), which
conflicts with FR-009's requirement that Neutral be configurable
independently of difficulty — this plan splits them into two orthogonal
`PlayerConfig` fields. A prior, unmerged bot-AI branch (`issue-6-bot-ai-heuristics`)
exists as reference material but predates cards/capital mode/post-conquest
movement and isn't wired to any action-submission path — it's read for
structure, not reused as-is.

## Technical Context

**Language/Version**: TypeScript 5.2, strict mode.

**Primary Dependencies**: None new — reuses `GameController` and
`MapController` exactly as `Game.tsx` already does for human actions.

**Storage**: N/A — a bot decision is a pure function of the current
`GameState`; nothing persisted beyond the existing `PlayerConfig`/`GameState`
models.

**Testing**: Vitest 2. New `src/bots/*.test.ts` files follow the fixture
conventions already established in `src/controllers/GameController.test.ts`
(`buildGameState()`, `buildMinimalMapConfig()`, `ownTerritories()`, etc.) —
reused directly rather than duplicated, so bot tests can construct precise
board positions (e.g. "one favorable attack available, everything else
unfavorable") the same way existing rules-engine tests do.

**Target Platform**: Browser (Vite/React client) for the local-play
integration; the decision engine itself (`src/bots/`) is plain TypeScript
with no DOM dependency, so it is equally usable from a future server-side
driver once feature 001 is implemented.

**Project Type**: Existing single-repo `src/`/`server/` split. This feature
adds a new `src/bots/` module and touches `src/models/PlayerConfig.ts`,
`src/components/menu/GameOver.tsx`, `src/App.tsx` (or wherever
`HandleStartParams` is consumed to build `PlayerConfig[]`), and
`src/components/Game.tsx`. No `server/` changes — this feature only builds
the decision-making "brain," per the spec's own Assumptions; hooking it into
the not-yet-implemented online server loop (001) is a follow-on integration
task, not blocked from being written now, but not exercised end-to-end until
001 exists.

**Performance Goals**: SC-005 — a bot completes its decision for a phase
within a short, consistent time (target: well under 2s; in practice this is
a synchronous, non-search heuristic over a small map, so it resolves in
single-digit milliseconds).

**Constraints**: FR-005 — a bot's decision function must never read
information its seat couldn't legitimately see. Rather than depending on
feature 001's (not-yet-implemented) `filterGameStateForSeat` state-redaction
function, this feature routes every visibility-sensitive read through
`MapController`'s existing fog-aware primitives (`getVisibleTerritories`,
`getVisibleContinentOwner`) directly — see research.md decision 3.
FR-012 — a bot must never stall a phase; every decision path has an
unconditional safe-default fallback (end phase / no attack / no fortify).

**Scale/Scope**: Same scale as local play — up to 9 seats, turn-based,
human-paced; no concurrency concerns (a bot's turn is computed and applied
synchronously before the next player's turn begins, same as a human's).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. CI Gate is Law**: `pnpm run lint`, `pnpm run test`, `pnpm run build`
  apply as normal. PASS.
- **II. Strict Typing, No Silent Escapes**: `BotDecision` is a new,
  precisely-typed discriminated union (one variant per action type), not a
  loosened version of an existing type. The `PlayerConfig` split
  (`botSkill` vs. a new `botBehavior` field) is an additive, explicitly
  typed change. PASS.
- **III. CSS Module Isolation**: N/A for the decision engine. The
  `GameOver.tsx` wiring only reads existing, already-styled form fields —
  no new styles introduced.
- **IV. Mobile Rendering Discipline**: N/A — no new positioned UI elements;
  the bot-config fields already exist in the form and are unaffected
  visually by wiring their values through.
- **V. Convention Over Improvisation**: New module follows the existing
  `src/controllers/*.test.ts` fixture-and-`describe` convention. `src/bots/`
  as a sibling directory to `src/controllers/` (rather than nesting bot
  files inside `controllers/`) mirrors how the prior (unmerged) attempt at
  this feature was organized, which is a reasonable precedent to keep for
  discoverability of a self-contained concern.

No violations requiring the Complexity Tracking table.

**Post-Design Re-Check** (after Phase 0/1 artifacts below): The new
`src/bots/` module, the `PlayerConfig` field split, and the `Game.tsx`
bot-turn effect are all additive and precisely typed; no new project, build
target, or typing escape. All gates above still PASS.

## Project Structure

### Documentation (this feature)

```text
specs/002-bot-ai/
├── plan.md                         # This file (/speckit-plan command output)
├── research.md                     # Phase 0 output
├── data-model.md                   # Phase 1 output
├── quickstart.md                   # Phase 1 output
├── contracts/
│   └── bot-decision-interface.md   # Phase 1 output — decideAction() contract
└── tasks.md                        # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── bots/
│   ├── BotDecision.ts       # NEW — discriminated union: one variant per
│   │                        #        turn-action type a bot can produce
│   ├── decideAction.ts      # NEW — decideAction(gameState, mapController,
│   │                        #        player): BotDecision | null; dispatches
│   │                        #        to the right agent by botSkill/botBehavior
│   ├── RandomBotAgent.ts    # NEW — Easy tier
│   ├── HeuristicBotAgent.ts # NEW — Medium tier (favorable attacks, border
│   │                        #        reinforcement, continent completion,
│   │                        #        capital pressure when capitalMode is on)
│   ├── NeutralBotAgent.ts   # NEW — wraps another tier's deploy/fortify/
│   │                        #        trade_cards logic, always suppresses attack
│   └── BotUtils.ts          # NEW — shared legal-action enumeration, safe
│                             #        fallback (FR-012), card-trade-in trigger
├── models/
│   └── PlayerConfig.ts       # MODIFIED — split `neutral` out of `BotSkill`
│                              #  into a new `botBehavior?: 'automated' | 'neutral'`
│                              #  field; `BotSkill` narrows to the difficulty axis
├── components/
│   ├── menu/
│   │   └── GameOver.tsx      # MODIFIED — read bot_count/bot_behavior/
│   │                          #  bot_difficulty into HandleStartParams
│   └── Game.tsx               # MODIFIED — new effect: when
│                                #  gameState.currentPlayer is a bot seat,
│                                #  call decideAction() and apply it through
│                                #  the same gameController.<action>(...) →
│                                #  setGameState(...) pipeline every human
│                                #  action already uses
└── App.tsx                     # MODIFIED (if this is where PlayerConfig[]
                                  #  is assembled from HandleStartParams) —
                                  #  materialize bot seats with the new fields
```

**Structure Decision**: New `src/bots/` sibling to `src/controllers/` for the
self-contained decision-making concern; everything else is a targeted
modification of existing files that already own turn-flow (`Game.tsx`) and
setup-form parsing (`GameOver.tsx`/`App.tsx`). No new project. `server/` is
untouched — server-side bot turn-driving is explicitly deferred until 001
exists to drive it against.

## Complexity Tracking

*No Constitution Check violations — table not needed.*
