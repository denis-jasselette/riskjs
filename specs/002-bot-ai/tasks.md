---

description: "Task list for Bot AI implementation"
---

# Tasks: Bot AI

**Input**: Design documents from `/specs/002-bot-ai/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/bot-decision-interface.md, quickstart.md

**Tests**: Included, following the existing `src/controllers/*.test.ts` fixture convention (this is an established project pattern, not a new TDD requirement).

**Organization**: Tasks are grouped by user story (from `spec.md`) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US3)
- Exact file paths are included in each description

## Path Conventions

New `src/bots/` module (sibling to `src/controllers/`); modifications to `src/models/PlayerConfig.ts`, `src/components/menu/GameOver.tsx`, `src/App.tsx`, `src/components/Game.tsx`. No `server/` changes (per plan.md's Structure Decision).

---

## Phase 1: Setup

- [X] T001 Split `BotSkill`/add `BotBehavior` in `src/models/PlayerConfig.ts`: remove `'neutral'` from `BotSkill`, add `export type BotBehavior = 'automated' | 'neutral'`, add `botBehavior?: BotBehavior` to `PlayerConfig` (data-model.md's Automated Seat Configuration)

**Checkpoint**: The type surface every other task builds on exists and compiles.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Define `BotDecision` discriminated union in `src/bots/BotDecision.ts` per data-model.md (7 variants: `choose_capital`, `deploy`, `attack`, `confirm_post_conquest_move`, `fortify`, `trade_cards`, `end_phase`)
- [X] T003 [P] Implement shared enumeration/utility helpers in `src/bots/BotUtils.ts`: legal-deploy-target enumeration, legal-fortify-route enumeration (via `MapController.areConnected` with `sameOwner`), legal-attack-candidate enumeration (via `getVisibleTerritories` + `getTerritoryOwner` + `areAdjacent`), a troop-odds favorability check, and first-valid-card-set lookup (via `GameController.isValidCardSet`/`resolveCardSetKind`)
- [X] T004 [P] Unit tests for `BotUtils` in `src/bots/BotUtils.test.ts`, reusing `GameController.test.ts`'s fixture builders (`buildGameState`, `buildMinimalMapConfig`, `ownTerritories`) to construct known board positions with a specific number of legal deploys/attacks/fortifies
- [X] T005 Implement `decideAction()`'s precedence dispatcher in `src/bots/decideAction.ts`: `pendingPostConquestMove` gate → `capitalDeploy` phase gate → forced-trade-in gate → phase-dispatch stub → safe-default (`{ type: 'end_phase' }`) fallback wrapped in try/catch around the whole dispatch (data-model.md's Decision precedence; depends on T002, T003)
- [X] T006 Wire `bot_count`/`bot_behavior`/`bot_difficulty` into `HandleStartParams` in `src/components/menu/GameOver.tsx` (add refs, read values on submit) and into the `playerConfigs` assembly in `src/App.tsx`'s `handleStart` (materialize the requested bot count as seats with `human: false`, `botSkill`, `botBehavior`) (depends on T001)

**Checkpoint**: Foundation ready — `decideAction` compiles and returns safe defaults; bot seats can be configured from the setup form (even though no agent tier is implemented yet).

---

## Phase 3: User Story 1 - Fill empty seats with a playable opponent (Priority: P1) 🎯 MVP (part 1)

**Goal**: An automated seat takes legal, non-stalling turns with no external input, and a game with automated seats reaches a normal conclusion.

**Independent Test**: Start a game with a mix of human and automated seats, let the automated seats play without any external input, and confirm the game reaches a normal conclusion with only legal moves from every automated seat.

### Tests for User Story 1

- [X] T007 [P] [US1] Test `RandomBotAgent`'s deploy/fortify/trade_cards choices are always among the legal set (never picks an illegal target) in `src/bots/RandomBotAgent.test.ts`
- [X] T008 [P] [US1] Test `RandomBotAgent`'s attack choice: picks among legal attacks when any exist, returns the no-attack/end-phase case when none exist (US1 AC2)
- [X] T009 [US1] Integration test in `src/bots/decideAction.integration.test.ts`: drive a full game where every seat is Easy-tier by repeatedly calling `decideAction` + applying the result via `GameController`, for every seat in turn, until `gameState.gameOver` or an iteration cap; assert it concludes normally well under the cap (US1 AC3, SC-002)

### Implementation for User Story 1

- [X] T010 [P] [US1] Implement `RandomBotAgent.ts`: uniform-random pick among `BotUtils`'s legal-deploy/-fortify/-trade/-attack enumerations for each phase, no-attack/end-phase when an enumeration is empty
- [X] T011 [US1] Wire the Easy case into `decideAction.ts`'s phase-dispatch stub from T005 (depends on T005, T010)
- [X] T012 [US1] Add the bot-turn-driving effect in `src/components/Game.tsx`: when `gameState.currentPlayer`'s `PlayerConfig.human === false`, call `decideAction(gameState, mapController, gameState.currentPlayer)` and apply the result through the same `gameController.<action>(...).gameState` → `setGameState(...)` pipeline every human-triggered handler already uses; depend the effect on `[gameState]` so it continues driving the bot's turn across multiple actions/phases (depends on T011)

**Checkpoint**: A local game with Easy-tier bot seats plays itself to a normal conclusion with no external input.

---

## Phase 4: User Story 2 - Choose a difficulty that changes how a bot plays (Priority: P1) 🎯 MVP (part 2)

**Goal**: Easy and Medium seats are observably, materially different in play quality.

**Independent Test**: Run the same game scenario twice, once with an Easy seat and once with a Medium seat in the identical position, and confirm the Medium seat consistently makes materially better strategic choices.

### Tests for User Story 2

- [X] T013 [P] [US2] Test `HeuristicBotAgent` avoids an unfavorable attack that `RandomBotAgent` sometimes takes, on an identical fixed board position, across repeated runs, in `src/bots/HeuristicBotAgent.test.ts` (SC-003)
- [X] T014 [P] [US2] Test `HeuristicBotAgent` prioritizes border-territory reinforcement over interior territories when deploying/fortifying
- [X] T015 [P] [US2] Test `HeuristicBotAgent` pursues continent completion when a reasonable opportunity exists (via `getVisibleContinentOwner`)
- [X] T016 [P] [US2] Test `HeuristicBotAgent` with `capitalMode: true`: weights attacks toward a weaker opponent's capital when plausible, while keeping its own capital adequately garrisoned
- [X] T017 [P] [US2] Test `HeuristicBotAgent` trades in an available card set (forced or optional) at its first opportunity, no strategic holding

### Implementation for User Story 2

- [X] T018 [US2] Implement `HeuristicBotAgent.ts`: favorable-attack evaluation via `BotUtils`'s odds check, border-first deploy/fortify targeting, continent-completion pursuit, capital-aware attack weighting (via `MapController.getPlayerCapitalTerritory`/`getPlayerCapitalCount`) with own-capital-defense floor, first-opportunity card trade-in (depends on T003)
- [X] T019 [US2] Wire the Medium case into `decideAction.ts`'s phase-dispatch (depends on T005, T018)

**Checkpoint**: Easy vs. Medium are behaviorally distinguishable; the `bot_difficulty` selector (wired in T006) fully controls real play quality. **MVP complete.**

---

## Phase 5: User Story 3 - A passive (Neutral) seat holds ground without attacking (Priority: P2)

**Goal**: A Neutral-configured seat never initiates an attack, regardless of its assigned difficulty tier, while still playing its other phases normally.

**Independent Test**: Configure a seat as Neutral with an otherwise-attack-ready board position, run through several of its turns, and confirm it never initiates an attack while still taking its other turn actions normally.

### Tests for User Story 3

- [X] T020 [P] [US3] Test `NeutralBotAgent` never returns an attack decision when wrapping either `RandomBotAgent` or `HeuristicBotAgent`, even on a board position with an overwhelming favorable attack available, in `src/bots/NeutralBotAgent.test.ts` (SC-004)
- [X] T021 [P] [US3] Test `NeutralBotAgent` still deploys/fortifies/trades normally by delegating to the wrapped tier's own logic (matches that tier's existing test expectations)

### Implementation for User Story 3

- [X] T022 [US3] Implement `NeutralBotAgent.ts`: delegates deploy/fortify/trade_cards to the wrapped agent unconditionally; always returns the no-attack/end-phase case for the attack phase regardless of the wrapped agent's own evaluation (depends on T010, T018)
- [X] T023 [US3] Wire `botBehavior === 'neutral'` into `decideAction.ts`'s dispatcher: resolve the tier agent as usual, then wrap it in `NeutralBotAgent` before use (depends on T005, T022)

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T024 [P] Cross-cutting fog-of-war test in `src/bots/decideAction.test.ts`: a deliberately "obviously good" attack planted on a territory outside the acting seat's `getVisibleTerritories` is never proposed by `decideAction` for either tier (FR-005)
- [X] T025 [P] Cross-cutting safe-fallback test: force the resolved agent to throw (malformed fixture) and confirm `decideAction` still returns `{ type: 'end_phase' }` rather than propagating the error (FR-012)
- [X] T026 [P] Run quickstart.md's full validation: `pnpm run test && pnpm run lint && pnpm run build`, plus the manual local-pass-and-play checklist (Automated bots play a full game; Neutral seat never attacks; fog-of-war + bots together don't stall)
  - Automated portion: `pnpm run test` (302 passed), `pnpm run server:typecheck`, root `tsc --noEmit`, `pnpm run lint` (0 problems), and `pnpm run build` are all green. Confirmed `pnpm run dev` boots and serves successfully.
  - Manual portion: not executed -- no browser/UI-driving tool is available in this environment (same limitation as 001's T037 and 010's T005). The automated coverage above (unit + integration tests exercising every acceptance scenario) stands in as this feature's verification per plan.md's Testing section; a human should still walk through quickstart.md's 5-step manual checklist in a real browser before considering this fully done.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup (needs `BotBehavior`/`botBehavior` field) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — no dependency on US2/US3
- **US2 (Phase 4)**: Depends on Foundational — independent of US1's `RandomBotAgent`, but both P1 stories together form the MVP
- **US3 (Phase 5)**: Depends on Foundational + at least one of US1's `RandomBotAgent` (T010) or US2's `HeuristicBotAgent` (T018) to wrap
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: No dependency on US2/US3
- **US2 (P1)**: No dependency on US1's code, but its comparison tests (T013) reference `RandomBotAgent`'s behavior, so is easiest to validate after US1
- **US3 (P2)**: Depends on US1 and/or US2 existing (it wraps a tier agent) — cannot be implemented standalone

### Parallel Opportunities

- All Foundational [P] tasks (T002, T003, T004) can run in parallel
- US1 and US2 can be implemented in parallel by different contributors once Foundational is done (T010 and T018 touch different files)
- All US2 test tasks (T013–T017) can run in parallel
- T024–T026 can run in parallel with each other

---

## Parallel Example: Foundational + US1/US2 split

```bash
# Foundational, in parallel:
Task: "Define BotDecision in src/bots/BotDecision.ts"
Task: "Implement BotUtils helpers in src/bots/BotUtils.ts"
Task: "Unit tests for BotUtils in src/bots/BotUtils.test.ts"

# Once Foundational lands, US1 and US2 in parallel:
Task: "Implement RandomBotAgent.ts (US1)"
Task: "Implement HeuristicBotAgent.ts (US2)"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2 — both P1)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T006) — CRITICAL
3. Complete Phase 3: US1 (T007–T012) and Phase 4: US2 (T013–T019) — both P1, together form the MVP per the spec's own priority assignment
4. **STOP and VALIDATE**: play a local game with a mix of Easy and Medium bots to completion
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → bot seats configurable, `decideAction` safe-defaults to `end_phase`
2. Add US1 → a game with Easy bots plays itself to conclusion
3. Add US2 → Medium bots are visibly smarter than Easy — MVP complete
4. Add US3 → Neutral seats become available as a configuration on top of either tier
5. Polish → fog-of-war and fallback cross-cutting tests, full CI gate, manual pass-and-play check

### Parallel Team Strategy

After Foundational (Phase 2):

- Contributor A: US1 (`RandomBotAgent` + `Game.tsx` wiring)
- Contributor B: US2 (`HeuristicBotAgent`)
- Contributor C: waits for either A or B's tier agent to land, then does US3 (`NeutralBotAgent` wrapping it)

---

## Notes

- [P] tasks touch different files with no unfinished dependency between them
- `decideAction.ts` (T005) is the one deliberately shared, non-story-specific artifact — extended by T011 (US1), T019 (US2), and T023 (US3), not duplicated; this is intentional per plan.md's Project Structure
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before continuing
