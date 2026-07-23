# Feature Specification: Card System Overhaul

**Feature Branch**: `014-card-system-overhaul`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Card System Overhaul for RiskJS — rebuild cards as unique, individually-dealt, territory-tied objects (no duplicates), gate the deploy-to-attack transition on whether an optional or forced trade-in is available, add a forced trade-in cascade (loops until hand < 5), return traded cards to a reshuffled deck instead of discarding them, replace the placeholder Fixed-mode bonus with the real +4/+6/+8/+10 table, and add a Fixed-mode-only +2-on-occupied-territory bonus (non-cumulative, one per trade-in). Progressive mode's existing table is unchanged. Depends on Win Conditions & Elimination (013) for the elimination-transfer trigger; this feature owns the forced-trade-in mechanic itself."

## Clarifications

### Session 2026-07-23 (implementation feedback)

- Q: Should the hand UI show which territory each card depicts, and whether
  it's currently eligible for the +2 occupied-territory bonus? → A: Yes —
  this was implied by cards carrying a territory (User Story 1 / the Card
  entity) but never stated as a UI requirement; it's now explicit (see
  FR-015 and the amended User Story 6).
- Q: When more than one traded (non-wildcard) card's territory is currently
  occupied by the trading player, who picks which one receives the +2
  bonus — the system automatically, or the player? → A: The player. The
  original draft (User Story 6, FR-013) left this to the system with no
  stated tie-break; that's corrected here — the player is shown a choice
  whenever more than one traded territory qualifies, and the bonus is
  applied automatically without a prompt only when exactly one qualifies.
- Q: (Resolving the second Edge Case below) Can a forced trade-in ever occur
  with no valid 3-card set actually in hand? → A: No — proven impossible.
  With 5+ cards drawn from only 3 non-wildcard types (wildcards only ever
  make this easier), if no type reaches 3 copies, pigeonhole guarantees all
  3 types are present with at least 1 each (since 2 types capped at 2 copies
  sum to at most 4, short of 5), which is itself a valid "one of each" set.
  No special-case handling is needed; this is not a runtime condition to
  guard against.
- Q: This feature depends on Win Conditions & Elimination (013) for the
  elimination-transfer trigger, but 013 doesn't exist yet — what's the
  actual scope of what was built? → A: Only the minimal trigger this
  feature itself needs: when an attack eliminates a player (reduces them to
  zero territories), their entire hand transfers to the eliminator, and if
  that reaches the forced-trade-in threshold, the game returns to deploy
  phase (the only phase trading happens in) so the cascade can resolve
  immediately. Everything else 013 owns — win/game-over detection,
  resignation, ranking, personal elimination screens — remains unbuilt and
  is not part of what this feature covers.

### Session 2026-07-24 (implementation feedback)

- Q: The original draft restricted the +2 occupied-territory bonus to Fixed
  mode only (User Story 6, FR-013/FR-014) — is that correct, or should it
  also apply in Progressive mode? → A: It applies in both modes. The
  Fixed-only restriction was a mistake carried over uncritically from the
  original draft — in classic Risk, the occupied-territory bonus is a rule
  layered on top of whichever trade-in value table is in use, not tied to
  a specific one. Corrected: FR-013 now applies regardless of
  `cardBonusMode`; FR-014 is removed (its only purpose was excluding
  Progressive mode); User Story 6 and its acceptance scenarios, and SC-006,
  are amended to match. The wildcard exclusion (no bonus from a card with
  no territory) is unaffected and still holds in both modes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every card is unique and never duplicated (Priority: P1)

Across a whole game, no two cards are ever identical copies of each other tied
to the same territory — each territory's card exists exactly once, whether
it's currently in the deck, in a player's hand, or has been returned to the
deck after a trade-in.

**Why this priority**: This is the foundational data-integrity guarantee every
other card mechanic in this feature depends on — without unique card
identity, "do you occupy this card's territory" and "no duplicates" can't be
verified at all.

**Independent Test**: Deal out and trade in cards across a full game and
confirm at every point that no specific territory's card is ever held by more
than one player or present more than once across deck, hands, and in-flight
trades combined.

**Acceptance Scenarios**:

1. **Given** a new game begins, **When** the card deck is built, **Then** it
   contains exactly one card per territory (per the map's card configuration)
   plus the configured number of wildcards, with no duplicates.
2. **Given** any point during a game, **When** all cards currently in the
   deck and in every player's hand are checked, **Then** no territory's card
   appears more than once across all of them combined.

---

### User Story 2 - The deploy phase waits for an optional trade-in decision (Priority: P1)

When a player has no troops left to deploy, their phase advances to attack
automatically only if they have no usable card trade-in available; if they do
have a usable (but not yet mandatory) trade-in available, the phase instead
waits for them to manually decide whether to trade in before moving on.

**Why this priority**: Central to how a player experiences their deploy
phase — auto-advancing past a genuinely available strategic choice (trading
in for more troops) would take away meaningful decisions, so getting this
gating right is as foundational as card uniqueness itself.

**Independent Test**: Deplete a player's deploy troops down to zero while
they hold no valid 3-card set, and confirm the phase advances automatically;
separately, deplete deploy troops to zero while they do hold a valid set (and
fewer than 5 cards total), and confirm the phase requires a manual action to
proceed instead.

**Acceptance Scenarios**:

1. **Given** a player has no troops left to deploy and holds no valid 3-card
   trade-in set, **When** their last troop is deployed, **Then** the phase
   advances to attack automatically.
2. **Given** a player has no troops left to deploy, holds a valid 3-card
   trade-in set, and has fewer than 5 cards total, **When** their last troop
   is deployed, **Then** the phase does not auto-advance — it waits for the
   player to either trade in or manually end the phase.

---

### User Story 3 - Holding 5+ cards forces a trade-in, possibly repeatedly (Priority: P1)

Whenever a player's hand reaches 5 or more cards — whether at the start of
their turn or mid-turn from receiving cards — they must trade in a valid set
before doing anything else, and if their hand is still at 5 or more after
that trade, they're immediately required to trade in again, repeating until
their hand drops below 5.

**Why this priority**: A core rules-integrity guarantee (hand size never
exceeds the intended cap for long) that also directly enables the
elimination-driven card transfer scenario from the separate Win Conditions
feature — without this cascade, a player receiving a large transferred hand
could sit indefinitely above the cap.

**Independent Test**: Give a player a hand of 5 or more cards (including
enough for at least two consecutive valid trade-ins) and confirm they are
required to trade in immediately, and again immediately afterward if still at
5 or more, until their hand drops below 5.

**Acceptance Scenarios**:

1. **Given** a player's hand reaches 5 or more cards, **When** this is
   detected, **Then** they are required to complete a valid trade-in before
   any other action is available to them.
2. **Given** a forced trade-in has just completed and the player's hand is
   still 5 or more cards, **When** the trade-in resolves, **Then** another
   forced trade-in is immediately required.
3. **Given** a forced trade-in resolves and the player's hand is now below 5
   cards, **When** the trade-in completes, **Then** no further trade-in is
   required and normal play (or the optional-trade-in gating from User Story
   2) resumes.

---

### User Story 4 - Traded-in cards return to the deck, shuffled (Priority: P2)

When a player trades in a set of 3 cards, those specific cards go back into
the deck at a random position rather than being permanently removed from the
game, so they can be dealt out again later.

**Why this priority**: Preserves card scarcity/availability over a long game
without permanently depleting the deck, but is a secondary mechanic compared
to the foundational identity, phase-gating, and forced-trade-in rules above.

**Independent Test**: Trade in a known 3-card set, then continue drawing
cards over subsequent turns until one of the returned cards is dealt out
again, confirming it re-enters circulation rather than being gone for good.

**Acceptance Scenarios**:

1. **Given** a player trades in a valid 3-card set, **When** the trade
   completes, **Then** those 3 cards are returned to the deck at random
   positions rather than being discarded permanently.
2. **Given** cards have been returned to the deck from a trade-in, **When**
   later card draws happen, **Then** those returned cards are eligible to be
   dealt out again like any other card still in the deck.

---

### User Story 5 - Fixed-mode bonuses use the real values (Priority: P2)

In Fixed bonus mode, trading in three infantry, three cavalry, three
artillery, or one of each awards a specific, different troop bonus for each
of those four set types, rather than the same flat amount regardless of which
kind of set was traded.

**Why this priority**: Replaces a known placeholder value with the real,
agreed numbers — a straightforward data/logic correction, sequenced after the
more structural card-identity and phase-gating work above.

**Independent Test**: Trade in each of the four valid set types (three
infantry, three cavalry, three artillery, one-of-each) in separate games or
turns under Fixed mode, and confirm each awards its correct, distinct bonus
amount.

**Acceptance Scenarios**:

1. **Given** Fixed mode is active, **When** a player trades in three
   infantry, **Then** they receive +4 troops.
2. **Given** Fixed mode is active, **When** a player trades in three
   cavalry, **Then** they receive +6 troops.
3. **Given** Fixed mode is active, **When** a player trades in three
   artillery, **Then** they receive +8 troops.
4. **Given** Fixed mode is active, **When** a player trades in one of each
   type, **Then** they receive +10 troops.
5. **Given** Fixed mode is active and a set includes one or more wildcards,
   **When** the set is evaluated, **Then** the wildcard(s) are assigned
   whichever type(s) produce a valid set, and the bonus corresponding to that
   resulting set type is awarded.

---

### User Story 6 - Occupying a traded card's territory earns a bonus, once (Priority: P3)

When trading in a set, in either bonus mode, if the player currently
occupies the territory shown on one or more of the three traded
(non-wildcard) cards, they receive 2 additional troops placed directly on
one such territory — but only once per trade-in. If exactly one traded
territory is occupied, that territory receives the bonus automatically; if
more than one qualifies, the player is shown which ones qualify and picks
the one that receives it before the trade can be confirmed. The hand itself
shows, per card, the territory it depicts and whether that territory
currently qualifies.

**Why this priority**: A nice-to-have strategic bonus layered on top of the
core trade-in mechanic; lowest priority since the trade-in system is fully
functional and correct without it.

**Independent Test**: Trade in a set where the player currently occupies
exactly one of the traded territories, and confirm that territory gains 2
troops automatically without a prompt; separately, trade in a set where the
player occupies two or all three of the traded territories, and confirm
they are prompted to choose which one receives the bonus, and that only the
chosen one gains troops. Repeat under both Fixed and Progressive modes to
confirm the bonus is mode-independent.

**Acceptance Scenarios**:

1. **Given** a player trades in a set where they currently occupy the
   territory shown on exactly one of the three cards, **When** the trade
   completes, **Then** 2 troops are added directly to that occupied
   territory automatically, with no choice required — regardless of which
   bonus mode is active.
2. **Given** a player occupies the territories shown on two or all three of
   the traded cards, **When** they select that set to trade, **Then** they
   are presented with a choice of which qualifying territory receives the
   bonus, and confirming the trade with a choice made applies the +2 bonus
   to only that one territory — regardless of which bonus mode is active.
3. **Given** none of the traded cards' territories (excluding any wildcard,
   which has no territory) are currently occupied by the trading player,
   **When** the trade completes, **Then** no territory bonus is applied.
4. **Given** any trade-in completes with at least one traded territory
   occupied, **When** checked under both Fixed and Progressive modes,
   **Then** the +2 territory bonus is applied identically in both — the
   bonus mode only changes the base troop bonus (FR-010/FR-012), never
   whether the territory bonus applies.

---

### Edge Cases

- What happens when the deck runs out of cards and a player who conquered
  territory this turn would otherwise draw one — does the game simply
  proceed with no card drawn, and does this ever realistically occur on the
  standard 42-territory map given how few trade-ins typically happen in a
  game?
- Resolved: a forced trade-in can never occur with no valid 3-card set in
  hand — proven impossible by pigeonhole once the hand reaches 5 cards (see
  2026-07-23 Clarifications). No special-case handling exists or is needed.
- How does the territory-occupation bonus behave if the player's occupied
  matching territory is somehow not a legal place to add troops at that
  moment (e.g. an edge case in a future rule interaction) — is this
  considered out of scope since no current rule would prevent it?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST build the card deck as one unique card per
  territory (as defined by the map's card configuration) plus the map's
  configured number of wildcards, with no card ever duplicated.
- **FR-002**: System MUST ensure that, at any point in a game, no specific
  territory's card exists more than once across the deck, all players'
  hands, and any cards currently mid-trade combined.
- **FR-003**: System MUST award exactly one card to a player at the end of
  their turn if they conquered at least one territory that turn and the deck
  still has at least one card remaining; if the deck is empty, no card is
  awarded.
- **FR-004**: System MUST automatically advance a player's phase from deploy
  to attack, once they have no troops left to deploy, if they hold no valid
  3-card trade-in set.
- **FR-005**: System MUST NOT automatically advance a player's phase from
  deploy to attack, even with no troops left to deploy, if they hold a valid
  3-card trade-in set and their hand has fewer than 5 cards — this requires a
  manual action to proceed instead.
- **FR-006**: System MUST require a player to complete a valid trade-in
  before any other action is available to them whenever their hand size
  reaches 5 or more cards, regardless of when that threshold is reached
  (start of turn or mid-turn).
- **FR-007**: System MUST immediately require another trade-in if, after a
  forced trade-in completes, the player's hand is still 5 or more cards —
  this repeats until the hand drops below 5.
- **FR-008**: System MUST return the 3 cards involved in any trade-in to the
  deck at random positions, rather than removing them from circulation
  permanently.
- **FR-009**: System MUST NOT change the existing validation logic for what
  constitutes a valid 3-card trade-in set (three of a kind, one of each
  type, or a wildcard-substituted equivalent).
- **FR-010**: In Fixed bonus mode, system MUST award +4 troops for a set of
  three infantry, +6 for three cavalry, +8 for three artillery, and +10 for
  one of each type.
- **FR-011**: In Fixed bonus mode, when a set includes one or more wildcards,
  system MUST assign each wildcard to whichever type makes the set valid, and
  award the bonus corresponding to the resulting set type. When more than one
  resolution is valid (e.g. one real card plus two wildcards, which could
  become either three-of-a-kind or a mixed set), system MUST resolve to the
  reading worth the highest bonus — in practice this always means preferring
  "mixed" (+10) over any three-of-a-kind resolution whenever both are
  possible.
- **FR-012**: System MUST leave Progressive bonus mode's existing bonus table
  and behavior (4, 6, 8, 10, 12, 15, then +5 per further trade, tracked
  globally across all players) unchanged.
- **FR-013**: Regardless of bonus mode (Fixed or Progressive), if the trading
  player currently occupies the territory shown on exactly one of the three
  traded (non-wildcard) cards, system MUST add 2 troops directly to that
  territory automatically. If the player occupies the territory shown on
  more than one of the traded cards, system MUST require the player to
  choose which one receives the bonus before the trade can be confirmed,
  and MUST apply the bonus to only that chosen territory. This bonus is
  layered on top of the mode-specific base troop bonus (FR-010/FR-012) and
  is never withheld based on which mode is active.
- **FR-014**: System MUST NOT apply the territory-occupation bonus based on
  a wildcard card (which has no associated territory), in either bonus mode.
- **FR-015**: System MUST display, for each card in a player's hand, the
  territory it depicts (or that it is a wildcard, for wildcards), and
  whether that territory currently qualifies for the +2 occupied-territory
  bonus — regardless of bonus mode.

### Key Entities

- **Card**: A unique game object representing either one specific territory
  (with an associated type: infantry, cavalry, or artillery) or a wildcard
  (no territory, substitutes for any type); dealt at most once at any given
  time between the deck and players' hands.
- **Hand**: The set of cards currently held by a player, subject to the
  forced-trade-in threshold (5+) and the optional-trade-in phase-gating rule.
  Displayed with each card's territory and its bonus eligibility, in either
  bonus mode (FR-015).
- **Trade-In**: The act of exchanging a valid 3-card set for a troop bonus
  (per the active bonus mode) and a possible territory-occupation bonus,
  applied identically regardless of mode — applied to a player-chosen
  territory when more than one traded territory qualifies (FR-013); returns
  the 3 cards to the deck afterward.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of games maintain unique card identity throughout — no
  territory's card is ever found duplicated across deck, hands, or in-flight
  trades at any point.
- **SC-002**: 100% of deploy phases with zero troops remaining and no valid
  trade-in set auto-advance to attack; 100% of deploy phases with zero troops
  remaining and a valid-but-optional trade-in set require a manual action
  instead.
- **SC-003**: 100% of hands that reach 5 or more cards are brought below 5
  through one or more immediate, consecutive forced trade-ins, with no game
  state left standing at 5+ cards after the cascade completes.
- **SC-004**: 100% of traded-in cards remain available to be dealt again
  later in the same game, rather than being permanently removed.
- **SC-005**: 100% of Fixed-mode trade-ins award the correct bonus (+4/+6/
  +8/+10) matching the specific set type traded.
- **SC-006**: 100% of trade-ins, in either bonus mode, where the player
  occupies at least one traded territory apply exactly one +2 territory
  bonus, never more than one regardless of how many traded territories they
  occupy, and identically whether Fixed or Progressive mode is active.
- **SC-007**: 100% of cards shown in a player's hand display their depicted
  territory (or wildcard status) and current bonus eligibility, regardless
  of bonus mode; 100% of trade-ins where more than one traded territory is
  occupied require an explicit player choice before the trade can be
  confirmed, never applying the bonus to an unchosen territory.

## Assumptions

- The elimination-transfer trigger actually implemented is scoped narrowly
  to what this feature needs: an attack reducing a player to zero
  territories transfers their hand to the eliminator and, if that reaches
  the forced threshold, returns the game to deploy phase. The rest of Win
  Conditions & Elimination (013) — win/game-over detection, resignation,
  ranking, personal elimination screens — remains unbuilt and is not part of
  what shipped here (see 2026-07-23 Clarifications).
- This feature depends on the separate, already-specified Win Conditions &
  Elimination feature (013) to determine when a defeated player's cards
  transfer to another player and whether that transfer is skipped (because
  the same conquest ended the game); this feature is only responsible for
  what happens to the receiving hand once a transfer occurs, including
  triggering the forced trade-in cascade described in User Story 3.
- The existing 3-card-set validation logic (three of a kind, one of each,
  wildcard substitution) is already correct and is unchanged by this feature.
- On the standard classic map (42 territories), the deck is large enough
  relative to typical trade-in frequency that running out of cards to award
  is expected to be rare to nonexistent; a smaller or different map running
  out of cards is handled gracefully (simply no card awarded) rather than
  treated as an error condition.
- Capital mode, blizzards, and fog of war are unrelated to this feature and
  are unaffected by it.
