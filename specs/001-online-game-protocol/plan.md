# Implementation Plan: Online Gameplay Protocol

**Branch**: `001-online-game-protocol` | **Date**: 2026-07-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-online-game-protocol/spec.md`

## Summary

Extend the existing lobby server (`server/src/`) so that once a room's game has
started, it accepts the same five turn actions the local game already supports
(deploy, attack, fortify, trade cards, end phase — plus place-capital and
resign, added for 012/013) as WebSocket messages, validates each one
authoritatively by reusing the existing `GameController` exactly the way the
client's local-play `Game.tsx` already does, and pushes back two things per
valid action: one shared `action_event` (so every connected player sees the
same dice roll/outcome) and one *personalized*, fog-of-war-filtered
`state_snapshot` per connection. Illegal actions get an `error` sent only to
the sender, with no other effect. A new pure filtering function closes a real
gap found while reading the code: today the server ships the entire
`GameState` object (all players' actual cards, all troop counts) to every
connected client on `game_started`/`reconnect`, relying on the *client* to
choose not to render hidden information — which cannot be trusted as an
authoritative-server security boundary once real players are connecting
independent clients.

## Technical Context

**Language/Version**: TypeScript 5.2, strict mode (`tsconfig.json` /
`server/tsconfig.json`)

**Primary Dependencies**: `ws` (WebSocket server, already in use), Node's
built-in `http` module for the upgrade handshake. No new runtime dependency
is needed — this feature adds message types and handlers to the existing
server, not a new transport.

**Storage**: N/A — in-memory only (`RoomStore`/`SessionStore`), matching the
existing lobby layer. Per this feature's clarification, server restart/crash
recovery for an in-progress game is explicitly out of scope; nothing here
introduces a persistence requirement.

**Testing**: Vitest 2, `server/src/handlers/*.test.ts` using the existing
`FakeConnection` + `dispatch()` pattern from `lobby.test.ts` — no real socket
needed to test handler logic. Existing `GameController.test.ts` /
`MapController.test.ts` continue to cover rules-engine correctness
unchanged; this feature does not modify game rules, only how actions reach
`GameController` and how results are delivered.

**Target Platform**: Node.js (`lts/*`, per `.github/workflows/ci.yml`),
server process started via `tsx watch server/src/index.ts` in dev
(`pnpm run server:dev`); browser (existing Vite/React client) for the UI side.

**Project Type**: Web application — existing single-repo split between
`src/` (React client, also imported by the server via the `@` path alias for
shared game-logic modules) and `server/` (Node WebSocket server, `@server`
alias for server-only modules). This feature works entirely within that
existing split; no new project/package is introduced.

**Performance Goals**: SC-001 (action → all views updated within 1s under
normal network conditions), SC-003 (reconnect → correct view within 2s).
Both are comfortably met by synchronous in-memory validation + immediate
broadcast; no batching/queueing is needed at this scale (turn-based, human-
paced actions, per the same reasoning already recorded for the lobby
protocol).

**Constraints**: Single-flight per seat (at most one in-flight action per
seat at a time; FR-012) — no client-side optimistic prediction. The client
submits an action-intent message and updates its view only from server-
pushed `action_event`/`state_snapshot`, mirroring the "two pushes per
action" model already used for `game_started`.

**Scale/Scope**: Same scale as the existing lobby system — small
rooms (2-9 seats per the classic map's player count), one server process,
no horizontal scaling concerns introduced by this feature.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. CI Gate is Law**: New/changed code lands through `pnpm run lint`,
  `pnpm run test`, `pnpm run build` same as any other change. `pnpm run
  server:typecheck` also applies to everything under `server/`. PASS —
  no exception requested.
- **II. Strict Typing, No Silent Escapes**: New message types extend the
  existing discriminated unions (`ClientMessage`/`ServerMessage` pattern from
  `src/net/protocol/lobby.ts`) rather than introducing `any`. The per-seat
  filtered view is a new, precisely-typed shape (not a loosened/optional-
  everything version of `GameState`). PASS.
- **III. CSS Module Isolation**: N/A — this feature is server/protocol work;
  no new component styles.
- **IV. Mobile Rendering Discipline**: N/A at the plan level — this feature
  does not add new positioned UI elements. If implementation ends up
  touching how the existing board re-renders from pushed snapshots, that
  code must still follow the existing rendering conventions untouched by
  this feature.
- **V. Convention Over Improvisation**: New server handlers follow the
  existing one-file-per-message-type convention in `server/src/handlers/`;
  new client protocol types follow `src/net/protocol/lobby.ts`'s existing
  style in a sibling file rather than a new pattern.

No violations requiring the Complexity Tracking table.

**Post-Design Re-Check** (after Phase 0/1 artifacts below): The one new
shared module (`GameStateView.ts`) and one new server-local field
(`actionInFlight`) don't introduce a new project, a new build target, or
any typing escape — all gates above still PASS with no new
Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-online-game-protocol/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── game-protocol.md  # Phase 1 output — WS message contract
└── tasks.md              # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── net/
│   └── protocol/
│       ├── lobby.ts        # existing — room/session messages (unchanged)
│       └── game.ts         # NEW — turn-action ClientMessage/ServerMessage union
├── controllers/
│   ├── GameController.ts   # existing — reused as-is, not modified for this feature
│   ├── MapController.ts    # existing — getVisibleTerritories() reused
│   └── GameStateView.ts     # NEW — filterGameStateForSeat(), the fog-of-war +
│                             #        hidden-card redaction shared by server
│                             #        (and optionally future local-play reuse)
└── components/               # existing local-play UI; wiring an online game
                               # screen to this feature's messages instead of
                               # calling GameController directly is a
                               # task-level concern, not a plan-level one

server/
├── src/
│   ├── handlers/
│   │   ├── index.ts          # extend dispatch() switch with new cases
│   │   ├── deploy.ts          # NEW
│   │   ├── attack.ts          # NEW
│   │   ├── fortify.ts         # NEW
│   │   ├── tradeCards.ts      # NEW
│   │   ├── endPhase.ts        # NEW
│   │   ├── placeCapital.ts    # NEW (carries 012's action; rules owned by 012)
│   │   ├── resign.ts          # NEW (carries 013's action; rules owned by 013)
│   │   └── gameAction.ts      # NEW — shared turn/phase/single-flight guard +
│   │                          #        broadcast helper used by the above
│   └── rooms/
│       └── Room.ts             # add per-seat in-flight lock (FR-012)
```

**Structure Decision**: Reuse the existing `src/` (shared client + server
game logic via the `@` alias) / `server/` (Node-only via `@server`) split.
No new top-level project. The one new *shared* module
(`src/controllers/GameStateView.ts`) lives next to `GameController` and
`MapController` because it depends on both and is conceptually part of the
same rules-engine layer, even though its only consumer for this feature is
the server.

## Complexity Tracking

*No Constitution Check violations — table not needed.*
