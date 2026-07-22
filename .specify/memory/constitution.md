<!--
Sync Impact Report
==================
Version change: (template, unratified) → 1.0.0
Rationale: Initial ratification. No prior concrete constitution existed (file only
contained unfilled template placeholders), so this is treated as a first adoption
rather than an amendment — MAJOR version 1.0.0.

Modified principles: n/a (first fill of template placeholders)

Added sections:
- I. CI Gate is Law
- II. Strict Typing, No Silent Escapes
- III. CSS Module Isolation
- IV. Mobile Rendering Discipline
- V. Convention Over Improvisation
- Technology Stack Constraints
- Development Workflow

Removed sections: none

Templates requiring updates:
- ✅ .specify/templates/plan-template.md — reviewed, Constitution Check section is
  generic and already compatible with these principles; no edit required.
- ✅ .specify/templates/spec-template.md — reviewed, no constitution-specific
  references to reconcile.
- ✅ .specify/templates/tasks-template.md — reviewed, task categories (setup, tests,
  core, integration, polish) already accommodate CI-gate and typing principles;
  no edit required.
- ✅ .claude/skills/speckit-constitution/SKILL.md (this command) — no agent-specific
  naming found that needed genericizing.
- ⚠ README.md — does not exist in this repo; no runtime quickstart doc to sync.
  CLAUDE.md remains the authoritative agent-facing guidance file and already
  reflects these principles (it was the primary source for this draft).

Follow-up TODOs:
- TODO(RATIFICATION_DATE): Original project inception predates this constitution's
  drafting and no earlier ratified version exists in history; ratification date is
  set to the date this document was first filled in (2026-07-22). If an earlier
  informal agreement date is known, update this field accordingly.
-->

# RiskJS Constitution

## Core Principles

### I. CI Gate is Law
Every change lands through the same three checks the CI pipeline runs on every PR
and push to `main`: `pnpm run lint`, `pnpm run test`, `pnpm run build` (in that
order). A change is not "done" until all three pass locally, mirroring
`.github/workflows/ci.yml`. No merge bypasses this gate; there is no
"fix it in a follow-up" exception for red CI on the PR being merged.

**Rationale**: The project has no staging environment or manual QA process —
CI passing is the only objective signal that a change is safe to merge. Treating
it as advisory rather than mandatory has no fallback.

### II. Strict Typing, No Silent Escapes
The codebase runs TypeScript in strict mode (`tsc && vite build`). New code MUST
type-check without introducing `any`, non-null assertions, or `@ts-ignore` as a
substitute for modeling the actual shape of the data. Where a type is genuinely
unknown (e.g. an external payload), narrow it explicitly rather than casting past
the compiler.

**Rationale**: `GameState`, `GameController`, and `MapController` encode
non-trivial invariants (turn order, adjacency, card ownership). Silent type
escapes are exactly how those invariants get violated at runtime instead of at
compile time.

### III. CSS Module Isolation
Component styles live in `ComponentName.module.scss`, imported as `styles` and
applied via `classnames`. Global styles (element selectors, CSS custom
properties, `@font-face`) belong exclusively in `src/index.scss`. Global rules
placed inside a `.module.scss` file are silently dropped in production builds —
this is not a style preference, it is a hard build-time failure mode.

**Rationale**: This has already bitten the project once (see `CLAUDE.md`); the
failure is invisible in dev and only surfaces after a production build, making it
expensive to diagnose after the fact.

### IV. Mobile Rendering Discipline
UI work MUST be validated against the mobile breakpoint
(`@media (max-width: 640px)`). SVG troop icons and similarly positioned elements
are placed with explicit `x`/`y` attributes, never `transform: translate(-50%,
-50%)` — the latter is unreliable on mobile WebKit and has caused real layout
bugs (e.g. map hidden behind the player bar on mobile, #27).

**Rationale**: Risk is played in local multiplayer sessions that include mobile
devices; a rendering bug that only reproduces on WebKit is easy to ship
unnoticed from a desktop dev environment.

### V. Convention Over Improvisation
Branch names follow `issue-<number>-<short-slug>`. PRs merge via squash only.
`pnpm-lock.yaml` is committed only when dependencies actually changed (`pnpm
add`/`remove`), never as a side effect of a plain `pnpm install`. Bug reports and
feature requests use the repo's issue templates
(`.github/ISSUE_TEMPLATE/*.md`), including explicit acceptance criteria and
an "out of scope" list for feature work.

**Rationale**: These conventions keep history and issue tracking legible for
both human and AI contributors working the same repo; deviating from them
creates noise (unrelated lockfile diffs, unreviewable merge commits, ambiguous
issue scope) disproportionate to the effort of following them.

## Technology Stack Constraints

- **Framework**: React + TypeScript (strict mode) — no migration to another
  framework without a constitution amendment.
- **Build**: Vite 5. `pnpm run build` (`tsc && vite build`) is the canonical
  build command and must remain the CI build step.
- **Styles**: SASS CSS Modules per component; no CSS-in-JS, no global
  stylesheet frameworks introduced ad hoc.
- **Tests**: Vitest 2. New logic in `controllers/` and `models/` requires
  corresponding test coverage; UI-only changes are validated per the "For UI or
  frontend changes" rule in `CLAUDE.md` (run it in a browser, don't just trust
  type-checking).
- **Package manager**: pnpm exclusively. `pnpm install --ignore-scripts` is the
  CI-safe restore path; do not introduce npm/yarn lockfiles.
- **Path alias**: `@` maps to `/src`; new modules should use it rather than deep
  relative imports (`../../../..`).

## Development Workflow

- Every non-trivial change is tied to a GitHub issue, branched as
  `issue-<number>-<short-slug>`.
- CI (`lint`, `test`, `build`) must be green on the PR before merge; merges are
  squash-only.
- `pnpm-lock.yaml` changes are committed only alongside an actual dependency
  change, never incidentally.
- UI/frontend changes are exercised manually in a browser (golden path + edge
  cases + a regression check on adjacent features) before being reported as
  complete — passing tests alone does not establish a UI change works.
- Key architectural surfaces (`GameController`, `GameLogic`, `MapController`,
  `GameState`, `Game.tsx`, `App.tsx`, the classic map config) are treated as
  load-bearing: changes there should be reviewed with extra care for turn-logic
  and pathfinding invariants rather than treated as routine edits.

## Governance

This constitution supersedes ad hoc conventions and undocumented tribal
knowledge for this repository. `CLAUDE.md` remains the day-to-day operational
guidance file for AI agents; where the two overlap, `CLAUDE.md` should be kept
consistent with this document, and this document takes precedence in case of
conflict.

**Amendment procedure**: Amendments are made by editing this file directly (via
the `speckit-constitution` workflow or an equivalent manual edit), with a Sync
Impact Report prepended as an HTML comment describing the version change,
modified/added/removed sections, and any templates or docs requiring follow-up.
Amendments should be accompanied by a review of `.specify/templates/*` and
`CLAUDE.md` for consistency, per the same checklist used to produce this
version.

**Versioning policy**: Semantic versioning applies to this document itself —
MAJOR for backward-incompatible principle removals or redefinitions, MINOR for
new principles or materially expanded guidance, PATCH for clarifications and
wording fixes with no rule change.

**Compliance review**: PRs and code reviews are expected to check compliance
with the Core Principles above (CI gate, typing discipline, CSS Module
isolation, mobile rendering, and stated conventions) as part of normal review,
not as a separate formal gate.

**Version**: 1.0.0 | **Ratified**: 2026-07-22 | **Last Amended**: 2026-07-22
