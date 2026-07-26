# Quickstart: Win Conditions, Elimination, Resignation & Ranking

Larger feature than most in this codebase — a mix of engine logic
(heavily unit-testable, following `GameController.test.ts`'s existing
per-method pattern) and wiring a previously-orphaned UI component into
real gameplay for the first time.

## Prerequisites

- `pnpm install`
- On branch `013-win-conditions-elimination-ranking`, with 012 (Capital
  Mode) already implemented locally (this feature's capital-mode win
  condition depends on `GameController.ownsAllCapitals()`)

## Automated validation

```bash
pnpm run test
pnpm run lint
pnpm run build
```

Add/confirm `GameController.test.ts` coverage for:
- `checkWinCondition()` / conquest mode: a capture that leaves one player
  owning every non-frozen, non-resigned territory sets `gameOver = true`
  immediately (SC-001); a game with territory still split does not.
- `checkWinCondition()` / capital mode: a capture that leaves one player
  owning every capital ends the game regardless of non-capital territory
  split (User Story 1, Acceptance Scenario 2).
- **Resignation-triggered win** (this session's clarification): the
  second-to-last active player resigning, with no capture involved, still
  ends the game for the sole remaining player.
- `resign()`: territories/troops completely unchanged at the moment of
  resignation (SC-004); resigning on one's own turn ends that turn;
  resigning off-turn does not disturb the current turn; `getNextPlayer()`
  never returns a resigned player afterward; no reinforcement is ever
  calculated for a resigned player.
- Card transfer: a non-winning defeat transfers the full hand (SC-003);
  a defeat that is simultaneously the winning move transfers nothing;
  a transfer that crosses the forced-trade-in threshold triggers the
  cascade (existing `transferCardsOnElimination` behavior, confirm the new
  win-move guard doesn't break it).
- `getStandings()`: winner always rank 1; still-alive non-winners ordered
  by troop count; defeated/resigned ordered by players-remaining-at-
  knockout, worse (more players remaining) ranking lower; a resigned
  player who's later defeated appears once, ranked by their resignation
  moment, not their eventual capture.

## Manual validation (`pnpm run dev`)

1. **Golden path — conquest win (User Story 1)**: Play to one player
   controlling every non-frozen territory. Confirm the game ends
   immediately and `ResultsModal` shows that player as the winner with a
   full standings table.
2. **Capital-mode win**: With capital mode on, capture every capital while
   non-capital territory remains split among other players. Confirm the
   game ends immediately regardless.
3. **Personal defeat screen (User Story 2)**: As a non-resigned player,
   lose your last territory mid-game (game continues for others). Confirm
   you immediately see the personal "You were eliminated" view, distinct
   from — and not later confused with — the eventual full results screen
   other players/you see when the game truly ends.
4. **Card transfer (User Story 3)**: Defeat a non-final opponent; confirm
   their cards transfer to you. Separately, defeat the last remaining
   opponent (the winning move); confirm no card transfer occurs.
5. **Resignation (User Story 4)**: Resign mid-game. Confirm your
   territories/troops are unchanged and visible/capturable, your turn is
   permanently skipped, you receive no reinforcement, and you keep your
   cards until eventually defeated (at which point the normal defeat
   card-transfer rule applies to whoever conquers your last territory —
   and confirm you do **not** see a second personal "you lost" popup at
   that point, since you already resigned).
6. **Resignation ends the game**: With exactly two active players
   remaining, have one resign. Confirm the game ends immediately for the
   sole remaining player with no capture required.
7. **Full ranking (User Story 5)**: Play a game to completion with a mix
   of winner, still-alive non-winner(s), and defeated/resigned player(s).
   Confirm every remaining connected participant sees the same final
   ranking, correctly ordered per the three tiers.
8. **Regression check**: Confirm normal play (deploy/attack/fortify,
   reinforcement, card trade-ins) is completely unaffected until an actual
   win condition or resignation occurs.
