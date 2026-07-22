# Phase 0 Research: Blizzard Connectivity Guarantee

No open `NEEDS CLARIFICATION` markers. The main research question this
feature actually poses is algorithmic (how to select a connectivity-safe
subset), not a technology choice — captured below.

## Decision: Current selection is `shuffle(deck).slice(0, mapConfig.blizzards)` with zero connectivity awareness

**Rationale (finding)**: `GameLogic.autoSetupTroops()`
(`src/controllers/GameLogic.ts:28-37`) builds `blizzards` by shuffling the
full territory-name deck and taking the first `mapConfig.blizzards` entries.
This is exactly the "purely random, no connectivity check" behavior the spec
describes replacing. No other code path selects blizzards — `GameState.
blizzards` is set once here and only read elsewhere (`MapController.
isTerritoryBlizzard`, pathing, continent checks) — confirming this is the
single, isolated point of change.

## Decision: Greedy randomized removal with a per-candidate connectivity check, not generate-and-retry

**Rationale**: Two viable strategies exist for "pick N territories whose
removal keeps the rest connected":

1. **Generate-and-retry**: pick a random N-subset, run one connectivity
   check on the remainder, and re-roll a fresh random subset if it fails.
2. **Greedy randomized removal**: shuffle all territory names
   (`shuffled()` from `lib/Random.ts`, already used elsewhere in
   `GameLogic`), then walk the shuffled list one territory at a time;
   tentatively freeze it, run a connectivity check on the remainder, and
   keep it frozen only if the graph stays connected — otherwise put it
   back and move to the next candidate. Stop once `mapConfig.blizzards`
   territories are frozen or candidates are exhausted.

Strategy 2 is preferred: each candidate is checked against the graph with
*already-frozen* territories also removed (so freezing decisions compose
correctly instead of being independently re-validated against the original
graph), it never needs an unbounded retry loop since it makes forward
progress through a finite shuffled list, and on a small graph (42 nodes) the
"is remainder still connected" check is cheap enough to run once per
candidate. It also degrades predictably: if `mapConfig.blizzards` is too
high for the map to sustain, it simply runs out of freezable candidates
partway through — a clear signal, not a hang — which lines up with the
spec's Assumption that an unsatisfiable blizzard count is a map-authoring
error out of this feature's scope.

**Alternatives considered**: Generate-and-retry (strategy 1) was rejected
because a fully-random N-subset is far more likely to fail the connectivity
check as `N` (blizzard count) grows relative to map size, and there's no
bound on retries in the worst case (only mitigated by the fact the classic
map's `blizzards: 3` on 42 territories makes failure rare in practice) — the
greedy approach makes the same guarantee without that risk. A precomputed
"articulation points never eligible" approach (compute all cut vertices
up-front via a standard algorithm, then randomly sample only from
non-cut-vertices) was also considered; rejected as unnecessary complexity for
a 42-node graph and 3 blizzards — articulation-point status changes as
territories are removed (a vertex that's safe to remove first may become a
cut vertex after an earlier removal, and vice versa is not an issue but the
converse subtlety is), so it would still need a check-after-each-removal
step, converging on essentially the same algorithm as strategy 2 with more
up-front machinery.

## Decision: New standalone connectivity-check helper, not a `MapController` method

**Rationale**: `MapController` requires a constructed `GameState`
(`constructor(gameState: GameState)`), but blizzard selection happens in
`GameLogic.autoSetupTroops()` *before* a `GameState` exists (it's one of
`autoSetupTroops`'s two return values, consumed later by `initState` to
*build* that `GameState`). The connectivity check therefore has to operate
directly on `MapConfig.territories[x].adjacency` as a plain graph, ignorant
of ownership — closer in shape to a minimal BFS/DFS reachability check than
to `MapController._bfs` (which is ownership/pathing-aware and requires
`GameState`). A new pure function (e.g. `isConnectedExcluding(territories,
excluded)` walking `adjacency` lists) is added near `GameLogic`, not
`MapController`.

**Alternatives considered**: Restructuring setup to construct a
provisional `GameState`/`MapController` early just to reuse `_bfs` — rejected
as needless indirection for what is a plain graph-reachability question with
no ownership dimension.

## Open Questions

None.
