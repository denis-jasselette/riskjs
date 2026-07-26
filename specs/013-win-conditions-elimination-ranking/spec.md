# Feature Specification: Win Conditions, Elimination, Resignation & Ranking

**Feature Branch**: `013-win-conditions-elimination-ranking`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Win Conditions, Elimination, Resignation & Ranking for RiskJS — currently the game never actually ends: nothing sets gameOver, and the built ResultsModal is never rendered. This feature wires up conquest and capital win conditions, defeat with card transfer (skipped if it's the winning move), resignation (troops stay on board, no more turns/reinforcements, cards kept until defeated), personal game-over screens on defeat, full results+ranking on game end, and a three-tier ranking (winner, then still-alive by troops, then defeated/resigned ordered by how many players remained at their knockout moment). Depends on Capital Mode (012) for the capital win fact; interacts with the Card System feature for the forced trade-in cascade on card transfer."

## Clarifications

### Session 2026-07-25

- Q: FR-001 only checks the win condition "after every territory capture." If the second-to-last active player resigns (leaving one sole remaining player, with no capture involved), should that also trigger the win check and end the game? → A: Yes — win-condition checking must also run whenever a player resigns, not just after captures, otherwise a game could get stuck with one player left but never declared a winner.
- Q: FR-005 shows a personal game-over screen when a player "is defeated (loses their last territory)." Should a resigned player get that same personal defeat screen when their last territory is later conquered, even though they already left the game voluntarily? → A: No — suppress it. A resigned player already saw their own resignation confirmed; showing a fresh "you lost" screen when their last territory eventually falls would be a confusing, unnecessary second notification. The card-transfer and ranking consequences of that later conquest still apply (FR-006, FR-011) — only the personal game-over screen itself is skipped for players who resigned before their last territory was conquered.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The game actually ends when someone wins (Priority: P1)

When a player meets the game's win condition (owning every non-frozen,
non-resigned-held territory in conquest mode, or every capital in capital
mode), the game immediately recognizes this and ends, rather than continuing
indefinitely with one player effectively already having won.

**Why this priority**: This is the single most fundamental gap being closed —
without it, there is no way to actually finish and win a game at all,
regardless of how good every other rule is.

**Independent Test**: Play a game down to one player controlling every
non-frozen, non-resigned territory (conquest mode) and confirm the game ends
at that exact moment; separately, in a capital-mode game, capture every
capital and confirm the game ends at that exact moment even if non-capital
territories remain split among other players.

**Acceptance Scenarios**:

1. **Given** capital mode is off, **When** a player comes to own every
   territory that is neither blizzard-frozen nor still held by a resigned
   player, **Then** the game ends immediately with that player as the winner.
2. **Given** capital mode is on, **When** a player comes to own every capital
   currently in the game, **Then** the game ends immediately with that player
   as the winner, regardless of how other non-capital territories are
   distributed.
3. **Given** neither win condition has yet been met, **When** a territory is
   captured, **Then** the game continues normally.

---

### User Story 2 - A defeated player sees their own game-over screen (Priority: P1)

When a player loses their last territory, they immediately see a personal
result screen telling them they've been eliminated, distinct from the
overall game's results screen (which comes later, if at all, for them).

**Why this priority**: Equal priority to User Story 1 — without this, an
eliminated player has no indication their part in the game has ended, even
though the underlying elimination logic (`hasPlayerLost`) already exists;
this closes the "silent elimination" gap.

**Independent Test**: Reduce a player to zero territories and confirm that
player's view immediately shows a personal game-over/eliminated screen,
independent of whether the overall game continues for others.

**Acceptance Scenarios**:

1. **Given** a player's last territory is conquered by another player,
   **When** that capture resolves, **Then** the defeated player's view shows
   a personal game-over screen.
2. **Given** a player has been shown their personal game-over screen, **When**
   the overall game later ends for the remaining players, **Then** the
   defeated player's earlier screen is not replaced or confused with the
   final full-game results screen meant for still-active participants.

---

### User Story 3 - Cards transfer on defeat, unless it's the winning blow (Priority: P2)

When a player is defeated, all the cards in their hand transfer to whoever
conquered their last territory — except when that same conquest is also the
move that ends the entire game, in which case no transfer happens since the
game is simply over.

**Why this priority**: A meaningful strategic consequence of eliminating an
opponent, but it depends on the elimination detection from User Story 1/2
already working, and is secondary to the core win/elimination detection
itself.

**Independent Test**: Defeat a player who is not the last remaining opponent
and confirm their cards transfer to the attacker; separately, defeat the last
remaining opponent (ending the game) and confirm no card transfer occurs.

**Acceptance Scenarios**:

1. **Given** a player is defeated and the game does not end as a result,
   **When** their last territory is conquered, **Then** all cards in their
   hand transfer immediately to the conquering player.
2. **Given** a player is defeated and that conquest is simultaneously the
   game's winning move, **When** the last territory is conquered, **Then** no
   card transfer occurs.
3. **Given** a card transfer brings the receiving player's hand to 5 or more
   cards, **When** the transfer completes, **Then** the forced trade-in
   cascade (defined separately) is triggered for that player.

---

### User Story 4 - A player can resign without disrupting the board (Priority: P2)

A player can choose to resign from an ongoing game at any time. Their
territories and troops remain exactly where they are — visible and capturable
by other players — but they never take another turn or receive reinforcements
again, though they keep any cards they're currently holding until they're
eventually defeated.

**Why this priority**: Handles a real player behavior (giving up) gracefully
without corrupting board state, but is independent of and less foundational
than the win/elimination mechanics in User Stories 1-3.

**Independent Test**: Have a player resign mid-game, confirm their
territories/troops are unchanged and remain on the board, confirm their turn
is skipped from that point forward, confirm they receive no further
reinforcements, and confirm they still hold their cards until another player
eventually conquers their last territory.

**Acceptance Scenarios**:

1. **Given** a player chooses to resign, **When** they do so, **Then** all
   their territories and troop counts remain unchanged on the board.
2. **Given** a player has resigned, **When** turn order reaches them, **Then**
   their turn is skipped and play passes to the next non-resigned,
   non-defeated player.
3. **Given** a player has resigned, **When** reinforcement is calculated for
   any player's turn, **Then** the resigned player never receives any
   reinforcement.
4. **Given** a player has resigned and still holds cards, **When** another
   player later conquers their last remaining territory, **Then** the normal
   defeat card-transfer rule applies to whoever makes that conquest.

---

### User Story 5 - The game ends with a full ranking for everyone (Priority: P2)

When the game as a whole ends, every remaining connected participant sees a
results screen showing the complete final ranking of all players — the
winner, then still-active non-winners ordered by troops held, then
defeated/resigned players ordered by how long they lasted.

**Why this priority**: Delivers the complete, satisfying end-of-game
experience once win detection (User Story 1) exists; naturally sequenced
after the more foundational detection and personal-elimination stories.

**Independent Test**: Play a game to completion with a mix of a winner, at
least one still-active non-winner, and at least one defeated/resigned player,
and confirm the final results screen shows all of them in the correct
relative order.

**Acceptance Scenarios**:

1. **Given** the game ends, **When** the results screen is shown, **Then**
   the winning player is always ranked first.
2. **Given** one or more players were still alive (neither defeated nor
   resigned) when the game ended but did not win, **When** the ranking is
   computed, **Then** they are ranked immediately after the winner, ordered
   among themselves by troop count held at that moment (more troops ranking
   higher).
3. **Given** one or more players were defeated or resigned before the game
   ended, **When** the ranking is computed, **Then** they are ranked below
   all still-alive players, ordered so that a player who dropped out while
   more players were still in the game ranks lower than one who dropped out
   later (while fewer players remained).
4. **Given** the game ends, **When** any remaining connected player views the
   results, **Then** they see the same complete ranking of all players.

---

### Edge Cases

- If the very last elimination of the game (the one that reduces the field
  to one remaining player) happens through a resignation rather than a
  conquest, the sole remaining player automatically wins — the win-condition
  check runs on resignation as well as on capture, not only on capture.
- How is "troops held at that moment" determined for the still-alive ranking
  tier if two players happen to have exactly the same troop count when the
  game ends?
- What happens if two players are defeated/resigned at moments with the
  exact same number of players remaining (e.g. simultaneous-seeming
  eliminations in quick succession) — how are they ordered relative to each
  other within that tier?
- When a resigned player's last territory is conquered, this does NOT
  trigger their own personal "you lost" screen — they already saw their
  resignation confirmed and a fresh defeat screen would be a confusing,
  unnecessary second notification. The card-transfer and ranking
  consequences of that conquest still apply as normal.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST check whether the active win condition for the
  current game mode is now met after every territory capture, and MUST also
  perform this check after every resignation (in case the resignation
  itself leaves a single remaining player as the winner).
- **FR-002**: In a game without capital mode active, the win condition MUST
  be owning every territory that is neither blizzard-frozen nor still held by
  a resigned player.
- **FR-003**: In a game with capital mode active, the win condition MUST be
  owning every capital currently in the game, regardless of non-capital
  territory distribution.
- **FR-004**: System MUST end the game immediately once a win condition is
  met, without requiring any further action.
- **FR-005**: System MUST detect when a player is defeated (loses their last
  territory) and immediately show that player a personal game-over screen,
  independent of whether the overall game continues — except when that
  player had already resigned prior to losing their last territory, in
  which case no personal game-over screen is shown (they already saw their
  resignation confirmed).
- **FR-006**: System MUST transfer all cards from a defeated player's hand to
  the player who conquered their last territory, unless that conquest is
  simultaneously the game's winning move, in which case no transfer occurs.
- **FR-007**: System MUST trigger the (separately defined) forced trade-in
  cascade whenever a card transfer under FR-006 brings the receiving player's
  hand to 5 or more cards.
- **FR-008**: System MUST let a player resign from an ongoing game at any
  time, regardless of whose turn it currently is.
- **FR-009**: System MUST leave a resigned player's territories and troop
  counts completely unchanged on the board at the moment of resignation.
- **FR-010**: System MUST permanently skip a resigned player's turn from the
  moment they resign onward, and MUST NOT grant them any further
  reinforcement.
- **FR-011**: System MUST let a resigned player retain any cards they hold at
  the time of resignation, transferring those cards only when they are later
  defeated (their last territory is conquered), following the same rule as
  FR-006.
- **FR-012**: System MUST continue the game normally for remaining players
  whenever a single player is defeated or resigns, provided the overall win
  condition has not yet been met.
- **FR-013**: System MUST show every remaining connected participant a
  results screen, upon the game ending, containing the complete final ranking
  of all players who were in the game.
- **FR-014**: The final ranking MUST place the winning player first.
- **FR-015**: The final ranking MUST place players who were still alive
  (neither defeated nor resigned) at game end, other than the winner,
  immediately after the winner, ordered among themselves by troop count held
  at that moment (higher troop count ranking better).
- **FR-016**: The final ranking MUST place players who were defeated or
  resigned before the game ended below all still-alive players, ordered such
  that a player eliminated while more players were still in the game ranks
  below a player eliminated while fewer players were still in the game.

### Key Entities

- **Game End State**: Whether the overall game has ended, who won, and the
  full computed ranking of all participants, determined the moment a win
  condition is met.
- **Player Status**: Whether a given player is currently active, defeated, or
  resigned, and (for defeated/resigned players) how many other players were
  still in the game at the moment their status changed.
- **Final Ranking**: The ordered list of all players at game end, computed
  per the three-tier rule above.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of games reach a definitive end the moment a win condition
  is met, with no game continuing indefinitely past that point.
- **SC-002**: 100% of defeated players see a personal game-over screen at the
  moment they lose their last territory.
- **SC-003**: 100% of non-winning eliminations result in a card transfer to
  the conquering player; 0% of winning-move eliminations result in a card
  transfer.
- **SC-004**: 100% of resignations leave the resigning player's territories
  and troop counts completely unchanged at the moment of resignation, and
  permanently skip that player's future turns and reinforcements.
- **SC-005**: 100% of completed games show every remaining connected
  participant a final results screen with a ranking that correctly places the
  winner first, still-alive non-winners next (ordered by troops), and
  defeated/resigned players last (ordered by how many players remained at
  their knockout moment).

## Assumptions

- A resignation can be submitted at any time, regardless of whose turn it
  currently is — not restricted to only the resigning player's own turn —
  since nothing in the brainstormed ruleset restricts it and this is the more
  player-friendly default.
- This feature depends on the separate, already-specified Capital Mode
  feature (012) to supply the "owns all capitals" fact used by FR-003; it
  does not implement capital-ownership tracking itself.
- This feature triggers, but does not implement, the forced trade-in cascade
  mechanics themselves — those belong to the separate Card System feature.
- The reinforcement calculation itself (008) is unaffected by this feature
  beyond the fact that resigned players must be excluded from receiving any
  reinforcement, which that feature already accounts for.
- Ties in troop count among still-alive non-winning players, or ties in
  "players remaining at knockout moment" among defeated/resigned players, are
  broken by a stable, consistent (if arbitrary) secondary ordering — exact
  tie-breaking is an implementation detail, not a scope-affecting rule.
