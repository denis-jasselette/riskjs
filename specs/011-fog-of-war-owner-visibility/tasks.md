---

description: "Task list for Fog of War Owner Visibility"
---

# Tasks: Fog of War Owner Visibility

**Input**: Design documents from `/specs/011-fog-of-war-owner-visibility/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
quickstart.md

**Tests**: Not included as automated test tasks — per plan.md, this is a
one-line conditional change in a rendering component with no
controller/model logic to unit-test. Per the constitution, UI-only changes
are validated via manual browser testing, and the bug this feature closes
(a DOM data leak) is specifically verified by inspecting rendered markup,
not by a unit test. Manual-validation tasks below reference the exact
quickstart.md steps they satisfy.

**Organization**: This spec has a single user story (P1). There is no
separate Foundational phase — the one code change below has no shared
prerequisite distinct from the user story itself, so the structure is
Setup → User Story 1 → Polish.

## Format: `[ID] [P?] [Story] Description`

- **[Story]**: Which user story this task belongs to (US1)
- Exact file paths are included in every task description

## Path Conventions

Single project. All work lands in `src/components/board/Territory.tsx` — no
controller/model changes, per plan.md's Structure Decision.

---

## Phase 1: Setup

**Purpose**: Confirm a clean starting point before touching territory
rendering

- [x] T001 Run `pnpm run lint && pnpm run test && pnpm run build` from the
  repo root and confirm all three pass with no pre-existing failures in
  `src/components/board/Territory.tsx`, per the constitution's CI-gate
  principle.

---

## Phase 2: User Story 1 - Ownership is hidden along with troop count outside visible range (Priority: P1) 🎯 MVP

**Goal**: A territory outside a player's owned-plus-directly-bordering set
reveals neither its true owner nor its troop count — today only troop
count is genuinely hidden; owner is merely CSS-masked while the real value
still reaches the DOM.

**Independent Test**: Enable fog of war, and from one player's view,
confirm that a territory outside their owned-plus-bordering set shows
neither its true owner nor its true troop count — both are obscured, and
neither value is present in the rendered markup.

### Implementation for User Story 1

- [x] T002 [US1] In `src/components/board/Territory.tsx`, change the
  `data-player` attribute on the root `<g>` element from unconditionally
  `props.troopState && props.troopState.player.color` to
  `props.isInFog ? undefined : (props.troopState && props.troopState.player.color)`,
  so no true-owner value reaches the DOM for a fogged territory (FR-001,
  FR-005). The existing `[data-fog=true] { fill: #555 !important; }` rule
  in `Map.module.scss` already provides the required distinct-from-any-
  player-color, distinct-from-neutral visual (FR-006) — no CSS change is
  needed.

  **Addendum (found during T003 manual validation)**: this fix alone was
  not sufficient. `src/components/board/Troop.tsx` had a legacy
  imperative `useEffect` that queried the DOM directly
  (`document.querySelectorAll('.TerritoryEdge[data-territory=...]')`) and
  unconditionally set `elt.dataset.player = props.player.color` on mount,
  bypassing React and re-writing the true owner back onto the territory's
  `data-player` attribute regardless of fog — silently defeating this
  task's fix. It also set its own `data-player-color` unconditionally.
  Removed the dead effect (redundant with `Territory.tsx`'s declarative
  attribute) and made `data-player-color` fog-aware too.

### Manual Validation for User Story 1

- [x] T003 [US1] Manual validation: follow
  `specs/011-fog-of-war-owner-visibility/quickstart.md` steps 1–2 in the
  browser (`pnpm run dev`) with devtools open — confirm a fogged territory
  still renders the existing gray fill (unchanged appearance) and confirm
  its `data-player` attribute is now absent, where before this fix it
  would show the true owner's color despite looking masked (SC-001,
  Acceptance Scenario 1 — the actual DOM-leak bug this feature closes).
- [x] T004 [US1] Manual validation: follow
  `specs/011-fog-of-war-owner-visibility/quickstart.md` steps 3–4 —
  confirm in-range territories (owned or directly bordering an owned
  territory) still show real owner and troop count exactly as before
  (SC-002, Acceptance Scenario 2), and confirm a game with fog of war
  disabled shows real owner/troop count everywhere with no
  `[data-fog=true]` styling anywhere (SC-003, Acceptance Scenario 3).
- [x] T005 [US1] Manual validation: follow
  `specs/011-fog-of-war-owner-visibility/quickstart.md` steps 5–6 —
  confirm the fog gray remains visually distinct from every active
  player's color (FR-006, 2026-07-23 clarification), and confirm a
  territory that changes owner while outside a player's visible range
  continues to render as fogged afterward, never flashing the old or new
  owner's color (resolved Edge Case, no stale-owner display).

**Checkpoint**: User Story 1 is fully functional and independently
testable — owner is genuinely hidden, not just cosmetically masked.

---

## Phase 3: Polish & Cross-Cutting Concerns

- [x] T006 Verification (no code change): follow
  `specs/011-fog-of-war-owner-visibility/quickstart.md` step 7 — confirm
  `ContinentsComponent`'s continent-border coloring by full-continent owner
  (independent of fog) is understood as pre-existing, out-of-scope
  behavior per `research.md`, so it isn't mistaken for a regression
  introduced by T002.
- [x] T007 Run `pnpm run lint && pnpm run test && pnpm run build` from the
  repo root and fix any failures, per the constitution's CI-gate principle.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **User Story 1 (Phase 2)**: Depends on Phase 1. No separate Foundational
  phase — T002 is both the shared prerequisite and the entire user-facing
  change.
- **Polish (Phase 3)**: Depends on Phase 2 being complete.

### Within User Story 1

- T002 (implementation) before T003–T005 (manual validation).

### Parallel Opportunities

- None — this feature is a single one-line conditional change in a single
  file, validated sequentially.

---

## Implementation Strategy

### MVP First (and only) Scope

1. Complete Phase 1: Setup.
2. Complete Phase 2: User Story 1 (the fog-aware `data-player` fix).
3. **STOP and VALIDATE**: Run T003–T005's manual checks, confirm the DOM no
   longer leaks the true owner for fogged territories.
4. Complete Phase 3: Polish (continent-border note, full CI gate).

---

## Notes

- This feature has no controller/model changes and a single user story —
  the phase structure is intentionally minimal.
- Commit after each task or logical group.
