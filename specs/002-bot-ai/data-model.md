# Phase 1 Data Model: Bot AI

This feature adds no persisted storage. It extends one existing model
(`PlayerConfig`), and adds one new, purely-in-memory type (`BotDecision`)
plus the decision engine that produces it.

## Automated Seat Configuration (spec's Key Entity) → `PlayerConfig` changes

`src/models/PlayerConfig.ts`:

```ts
export type BotSkill = 'easy' | 'medium' | 'hard' | 'expert'   // 'neutral' removed
export type BotBehavior = 'automated' | 'neutral'               // NEW

export default interface PlayerConfig {
  // ...unchanged fields (currentUser, name, color, human, position, host,
  // country, avatar, decoration, troopShape)
  botSkill?: BotSkill
  botBehavior?: BotBehavior   // NEW — defaults to 'automated' when human is false
}
```

Rules:
- `human: false` with no `botSkill` is not a valid configured state for this
  feature — the seat-filling UI (`GameOver.tsx`) must always set `botSkill`
  to `'easy'` or `'medium'` for a bot seat (FR-002); `'hard'`/`'expert'`
  remain unused values reserved for a future feature.
- `botBehavior` is independent of `botSkill` (FR-009): `{ botSkill: 'medium',
  botBehavior: 'neutral' }` is a valid, meaningful configuration — a Neutral
  seat that otherwise deploys/fortifies/trades with Medium's heuristics but
  never attacks.
- Absent/undefined `botBehavior` on a bot seat means `'automated'` (the
  default, pre-existing behavior).

## Bot Decision (spec's Key Entity) → `BotDecision`

`src/bots/BotDecision.ts` — one variant per turn-action type the engine can
produce, deliberately structurally aligned with feature 001's
`ClientGameMessage` action variants (see research.md decision 2) without
importing that type directly:

```ts
export type BotDecision =
  | { type: 'choose_capital', territory: string }
  | { type: 'deploy', troops: number, territory: string }
  | { type: 'attack', attackingTerritory: string, defendingTerritory: string, attackingTroops: number }
  | { type: 'confirm_post_conquest_move', troopsToMove: number }
  | { type: 'fortify', fromTerritory: string, toTerritory: string, troops: number }
  | { type: 'trade_cards', cardIndices: number[], bonusTerritory?: string }
  | { type: 'end_phase' }
```

`decideAction(gameState, mapController, player): BotDecision | null` —
`null` means "this player is not a configured bot seat"; every configured
bot seat always receives a concrete `BotDecision`, never `null`, per FR-012
(a safe default, typically `{ type: 'end_phase' }` or an attack/fortify
skip, is always the fallback of last resort).

### Decision precedence within `decideAction`

1. **`gameState.pendingPostConquestMove` is set** → the seat must resolve it
   before anything else (mirrors `GameController.isSelectable`'s
   "pendingPostConquestMove blocks everything else" gate) → always return
   `{ type: 'confirm_post_conquest_move', troopsToMove }` using
   `pendingPostConquestMove.minTroopsToMove` (safe default — never moves
   more than the minimum, avoiding any need for heuristic judgment here).
2. **`gameState.currentPhase === 'capitalDeploy'`** (012's phase) → return
   `{ type: 'choose_capital', territory }` for a legal, owned territory
   (any is safe/legal — capital-choice strategy is out of scope here).
3. **A forced trade-in is pending** (`GameController.hasForcedTradeIn`) →
   return `{ type: 'trade_cards', ... }` for the first valid set found
   (FR-007 — no strategic holding of cards at any tier, including Easy).
4. **Phase-specific dispatch** to the resolved agent (`RandomBotAgent` /
   `HeuristicBotAgent`, optionally wrapped by `NeutralBotAgent` for the
   attack phase) for `deploy` / `attack` / `fortify` / an optional
   available (non-forced) trade-in / `end_phase`.
5. **Fallback** — if the resolved agent throws, times out its own internal
   budget, or returns nothing usable, `decideAction` catches this and
   returns `{ type: 'end_phase' }` unconditionally (FR-012).

## Agent responsibilities

| Module | Tier | Deploy/Fortify/Trade | Attack |
|---|---|---|---|
| `RandomBotAgent.ts` | Easy | Uniform-random pick among legal targets (via `BotUtils`'s legal-action enumeration) | Uniform-random pick among legal attacks, or none if none exist |
| `HeuristicBotAgent.ts` | Medium | Prioritizes border territories (adjacent to an enemy-owned or unowned-visible territory) over interior ones; trades in at first opportunity | Only initiates attacks judged favorable (troop-count advantage per `BotUtils`'s odds heuristic); when `capitalMode` is on, weights toward a weaker opponent's capital (via `MapController.getPlayerCapitalTerritory`/`getPlayerCapitalCount`) while keeping its own capital adequately garrisoned; otherwise pursues continent completion when a reasonable opportunity exists (via `getVisibleContinentOwner`) |
| `NeutralBotAgent.ts` | wraps Easy or Medium | Delegates to the wrapped tier unchanged | Always returns no-attack (`end_phase`-equivalent for that phase), regardless of wrapped tier's evaluation (FR-010) |
| `BotUtils.ts` | shared | Legal-deploy-target enumeration, legal-fortify-route enumeration (via `MapController.areConnected` with `sameOwner`), legal-attack enumeration (via `getVisibleTerritories` + `getTerritoryOwner` + `areAdjacent`), simple troop-odds favorability check, first-valid-card-set lookup | — |

## Fog-of-war input surface

Every read `decideAction`/its agents perform is one of:
- `mapController.getVisibleTerritories(player)` — which territories/troops
  this seat may consider at all.
- `mapController.getTerritoryOwner(territory)` / `getTroopState(territory)`
  — only for territories already confirmed visible.
- `mapController.getVisibleContinentOwner(continent, player)` — fog-aware
  continent-ownership check (replaces `getContinentOwner`).
- `gameState.playerCards[player]` — the bot's own hand (always visible).
- Turn/phase/global fields that are not secret regardless of fog
  (`currentPhase`, `capitalMode`, `capitals`, `troopsToDeploy`, etc.).

No agent ever reads another player's `playerCards` entry or a
non-visible territory's `troops`/owner — this is the concrete mechanism
satisfying FR-005.
