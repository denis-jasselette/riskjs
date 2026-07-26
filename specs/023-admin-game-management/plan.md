# Implementation Plan: Admin Game Management

**Branch**: `023-admin-game-management` | **Date**: 2026-07-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/023-admin-game-management/spec.md`

## Summary

Add an operator-only WebSocket interface — `admin_list_games` /
`admin_end_game` — that lists every `Room` whose `status === 'started'`
(players, settings, running duration) and can forcibly terminate one,
reusing the existing lobby-close mechanism (`closeRoom`) so a manually
ended game frees its `RoomStore` slot exactly like a normal conclusion
does. A new, seat-by-seat `operator_game_ended` notice (skipping seats
already present in `gameState.knockoutOrder`, per FR-010) is sent before
the room is torn down, distinct from 001's `game_over` and the existing
`room_closed` lobby-close message. **This plan defines the seam but cannot
produce a functionally complete, deployable feature today**: FR-009 gates
this entire interface behind an `is_admin` account flag owned by features
006 (Account System) and 021 (Admin User Management), and neither has any
implementation yet (`server/src` has no account/session/user model at
all — confirmed during research). The plan isolates that one gap behind a
single `requireOperator(ctx)` helper so every other part of this feature
(room listing, duration tracking, the end action, the distinct notice,
capacity-freeing reuse) can be built and tested today against a test
double, with the real 006/021 wiring being a small, later, isolated swap.

## Technical Context

**Language/Version**: TypeScript 5.2, strict mode.

**Primary Dependencies**: None new — reuses `ws`, the existing
`server/src/rooms/RoomStore`/`Room` classes, and `closeRoom`
(`server/src/handlers/closeRoom.ts`).

**Storage**: N/A for this feature itself — in-memory `RoomStore`, matching
the existing lobby layer. (The `is_admin` flag this feature *depends on* is
006's concern, and 006 is the first feature in this codebase requiring
persistence — not something 023 introduces.)

**Testing**: Vitest 2, `server/src/handlers/*.test.ts` using the existing
`FakeConnection` + `dispatch()` pattern. The operator-auth gate is tested
against a test double for `requireOperator` (an injected always-pass /
always-throw stub), since no real implementation exists yet to test against.

**Target Platform**: Node.js WebSocket server (`server/`), same process as
the lobby/game-action servers from 001.

**Project Type**: Existing `server/` (this feature has no client-visible UI
beyond whatever operator page eventually calls these messages — building
that page is out of scope here per the spec's Assumptions; only the
server-side interface is this feature's deliverable, matching how 021/022
each independently scope themselves to their own server interface without
a shared "admin UI" entity).

**Performance Goals**: N/A — an infrequent, human-operator-paced action;
no throughput/latency target beyond "responsive to one operator."

**Constraints**: FR-008/FR-009 — unreachable by any non-operator connection.
FR-006/FR-007 — must not alter or race with the normal win/elimination/
resignation flow (001/013's territory); this feature only *observes*
`gameState.gameOver`/`knockoutOrder`, never mutates game rules state.
FR-010 — the operator-end notice must be withheld from seats already in
`gameState.knockoutOrder` at the moment of the action.

**Scale/Scope**: Single operator, small number of concurrent rooms — same
scale as the rest of the lobby/room system.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. CI Gate is Law**: `pnpm run lint`, `pnpm run test`,
  `pnpm run server:typecheck`, `pnpm run build` apply as normal. PASS.
- **II. Strict Typing, No Silent Escapes**: New message types extend the
  existing `ClientMessage`/`ServerMessage` discriminated-union pattern; the
  `requireOperator(ctx)` seam is a precisely-typed function
  (`(ctx: HandlerContext) => void`, throwing a typed rejection on failure),
  not an `any`-typed placeholder. PASS.
- **III. CSS Module Isolation**: N/A — server-only feature.
- **IV. Mobile Rendering Discipline**: N/A — no UI in this feature's scope.
- **V. Convention Over Improvisation**: New handlers follow the existing
  one-file-per-message-type convention in `server/src/handlers/`
  (`requireHostRoom`/`requireBoundRoom` precedent for `requireOperator`);
  reuses `closeRoom` rather than duplicating room-teardown logic.

No violations requiring the Complexity Tracking table. The
`requireOperator` stub is explicitly not a scope reduction or a shortcut
around a principle — it is the documented, temporary seam for a real
external dependency (006/021) that does not exist yet, tracked openly here
rather than silently assumed away.

**Post-Design Re-Check** (after Phase 0/1 artifacts below): No new project,
build target, or typing escape introduced. The one open item — swapping the
`requireOperator` test double for 006/021's real admin-flag check — is
already called out as this plan's central risk, not discovered late.
All gates above still PASS.

## Project Structure

### Documentation (this feature)

```text
specs/023-admin-game-management/
├── plan.md                          # This file (/speckit-plan command output)
├── research.md                      # Phase 0 output
├── data-model.md                    # Phase 1 output
├── quickstart.md                    # Phase 1 output
├── contracts/
│   └── admin-game-protocol.md       # Phase 1 output — WS message contract
└── tasks.md                         # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
server/
├── src/
│   ├── handlers/
│   │   ├── index.ts               # extend dispatch() with admin_list_games / admin_end_game
│   │   ├── context.ts             # add requireOperator(ctx) alongside requireBoundRoom/requireHostRoom
│   │   ├── adminListGames.ts      # NEW
│   │   ├── adminEndGame.ts        # NEW — per-seat operator_game_ended notice, then closeRoom()
│   │   └── closeRoom.ts           # existing — reused as-is for the actual teardown
│   └── rooms/
│       ├── RoomStore.ts           # add listStartedRooms(): Room[]
│       └── Room.ts                # add startedAt?: number, set when status flips to 'started'
└── src/net/protocol/ (client-shared, via @)
    └── admin.ts                    # NEW — AdminClientMessage/AdminServerMessage union
```

**Structure Decision**: Server-only addition to the existing `server/src`
tree; one new shared protocol file under `src/net/protocol/` (imported by
`server/` via `@`, matching `lobby.ts`/`game.ts`'s existing pattern) since
message shapes are conceptually part of the client↔server contract even
though no client UI is built here. No new project.

## Complexity Tracking

*No Constitution Check violations — table not needed.*
