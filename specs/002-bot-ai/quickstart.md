# Quickstart: Validating Bot AI

## Prerequisites

```bash
pnpm install --ignore-scripts
```

## Automated validation (primary)

New tests live alongside the new modules, following
`src/controllers/GameController.test.ts`'s fixture conventions
(`buildGameState()`, `buildMinimalMapConfig()`, `ownTerritories()`):

```bash
pnpm run test
pnpm run lint
pnpm run build
```

Scenarios each acceptance criterion maps to:

1. **US1 AC1/AC2 (legal action every phase, ends phase when nothing
   beneficial)**: `decideAction.test.ts` — for each phase, build a board
   position with at least one legal action and confirm the returned
   `BotDecision` is legal per the matching `GameController` check; build a
   position with *no* favorable attack for Medium and confirm it returns
   the end-phase/no-attack decision rather than a random one.
2. **US1 AC3 / SC-002 (full bot-only game reaches a conclusion)**: an
   integration test that repeatedly calls `decideAction` + applies the
   result via `GameController`, for every seat, until `gameState.gameOver`
   is true or an iteration cap is hit; assert it concludes normally well
   under the cap across repeated runs (⇒ SC-002's 95% threshold).
3. **US2 AC1 (Easy ≠ Medium)**: `HeuristicBotAgent.test.ts` vs.
   `RandomBotAgent.test.ts` — same fixed board position with one clearly
   unfavorable attack available; run `RandomBotAgent` many times and
   confirm it sometimes takes the unfavorable attack, while
   `HeuristicBotAgent` never does (SC-003).
4. **US2 AC2/AC3 (Medium heuristics)**: dedicated `HeuristicBotAgent.test.ts`
   cases for border-reinforcement preference, continent-completion pursuit,
   and (with `capitalMode: true`) capital-targeting weighted against
   keeping its own capital garrisoned.
5. **US3 (Neutral never attacks)**: `NeutralBotAgent.test.ts` — wrap both
   Easy and Medium, present an overwhelming favorable-attack position, and
   confirm the attack-phase decision is always the no-attack case for many
   iterations (SC-004), while deploy/fortify/trade decisions still match the
   wrapped tier's own tests.
6. **FR-005 (fog respected)**: a test with `fogEnabled: true` and a
   deliberately-planted "obviously good attack" on a territory outside the
   bot's `getVisibleTerritories` — confirm the decision engine never
   proposes it (it can't see it).
7. **FR-012 (never stalls)**: a test that forces the resolved agent to throw
   (e.g. an intentionally malformed fixture) and confirms `decideAction`
   still returns a safe-default `BotDecision` rather than propagating the
   error.

## Manual validation (secondary — local pass-and-play)

Per the constitution's rule that UI-adjacent changes are exercised manually:

```bash
pnpm run dev
```

1. Start a new local game, set **Bots** to 2+, leave **Bot behavior** on
   Automated, set **Bot difficulty** to Medium.
2. Confirm bot seats take believable turns automatically when it becomes
   their turn — deploying, attacking only when sensible, fortifying,
   trading cards, ending phase — with no input from you, and that human
   seats are unaffected.
3. Restart with one seat's **Bot behavior** set to Neutral; confirm that
   seat still deploys/fortifies/trades but never attacks even when an
   obviously favorable attack is available to it.
4. Restart with **Fog of war** enabled and bots present; confirm bot seats
   still play sensibly rather than stalling or erroring (their decisions
   are necessarily working from less information, but the game must still
   progress).
5. Let an all-bot game play to completion (set players to bots only, if the
   form allows 0 humans, or just don't act on your own seat) and confirm it
   reaches a normal win/elimination conclusion without needing a page reload
   or getting stuck.

## Expected outcome

All `Done When` items in `spec.md`'s acceptance scenarios pass; `pnpm run
lint && pnpm run test && pnpm run build` is green.
