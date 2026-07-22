# Feature Specification: Hosting & Reachability

**Feature Branch**: `007-hosting-reachability`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Hosting and reachability for RiskJS online play — securely expose the game server to the public internet over the existing owned domain, with automatic TLS certificate provisioning/renewal, and ensure the server process starts on boot and auto-restarts on crash without manual intervention. Independent of all other online-multiplayer features; purely operational. Excludes purchasing a new domain and any multi-instance/scaling work."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reach the game securely from anywhere (Priority: P1)

A player visits the game's public web address from any device with an internet
connection and is able to load the game and play online, over a secure
connection, without any special network configuration on their end.

**Why this priority**: Without secure public reachability, none of the other
online-multiplayer features (rooms, gameplay protocol, matchmaking) are
actually usable by a real player outside the developer's own network — this is
the precondition for everything else being a real product.

**Independent Test**: From an ordinary internet connection with no special
configuration, load the game's public address and confirm the page loads and
an online game connection can be established, both over a secure connection.

**Acceptance Scenarios**:

1. **Given** a player has the game's public web address, **When** they visit
   it from any standard internet connection, **Then** the game loads
   successfully.
2. **Given** a player is using the game online, **When** their connection to
   the game is inspected, **Then** all traffic (both regular page content and
   the live game connection) is encrypted in transit.
3. **Given** the service's security certificate is due for renewal, **When**
   renewal time arrives, **Then** it renews automatically with no interruption
   to players and no manual action required.

---

### User Story 2 - The game stays available without someone watching it (Priority: P1)

The game service keeps running continuously, recovering automatically from a
crash or the host machine restarting, without requiring a person to notice
something is down and manually bring it back.

**Why this priority**: Equally foundational to User Story 1 — reachability
that depends on a human noticing an outage and manually restarting the
service isn't real uptime for a public product. Both stories describe the
minimum bar for treating this as a live service rather than a manually-run
demo.

**Independent Test**: Simulate the game server process crashing or the host
machine rebooting, and confirm the service comes back online automatically
without any manual restart action.

**Acceptance Scenarios**:

1. **Given** the game server process crashes unexpectedly, **When** the crash
   occurs, **Then** the process restarts automatically without requiring a
   person to intervene.
2. **Given** the host machine restarts (e.g. after a reboot), **When** it
   comes back up, **Then** the game service starts automatically without
   requiring a person to manually start it.

---

### Edge Cases

- What happens to players with an active connection at the moment a crash
  and automatic restart occurs — are they informed the connection was lost, or
  does client-side reconnection logic (already built) simply reconnect them
  once the service is back?
- What happens if the automatic certificate renewal itself fails (e.g. due to
  an external outage) — does the service continue running on the existing
  still-valid certificate until the next renewal attempt, or does it fail
  closed?
- How does the service behave if it crashes repeatedly in a short window
  (e.g. a persistent bug) — does automatic restart retry indefinitely, and
  could that itself become a problem (e.g. rapid restart-crash looping)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST be reachable by players over the public internet at
  a stable, existing web address, without requiring any special network
  configuration (e.g. VPN, manual port access) on the player's side.
- **FR-002**: System MUST encrypt all traffic between a player's device and
  the service, for both regular page content and the live game connection.
- **FR-003**: System MUST automatically renew its security certificate before
  expiry, without requiring manual action, and without causing a service
  interruption for players during renewal.
- **FR-004**: System MUST automatically restart the game server process if it
  crashes, without requiring a person to notice and manually restart it.
- **FR-005**: System MUST automatically start the game service when the host
  machine starts or restarts, without requiring a person to manually start it.
- **FR-006**: System MUST continue serving the game from the same public web
  address before and after any automatic restart (crash recovery or machine
  reboot) — reachability is not lost as a side effect of recovery.

### Key Entities

- **Public Service Endpoint**: The stable, secure, public-internet-reachable
  address at which players access the game (both page content and live game
  connection).
- **Service Uptime Guarantee**: The automatic start-on-boot and
  restart-on-crash behavior that keeps the Public Service Endpoint available
  without manual intervention.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of connections between a player's device and the service
  are encrypted, with zero unencrypted access paths to game content or the
  live game connection.
- **SC-002**: The service's security certificate never expires unrenewed —
  0 player-facing incidents caused by an expired certificate.
- **SC-003**: Following an unexpected server-process crash, the service is
  automatically back online without manual intervention, in effectively all
  cases, within a short recovery window (target: under 1 minute).
- **SC-004**: Following a host machine restart, the service resumes serving
  players automatically, with zero manual steps required.
- **SC-005**: The game's public web address remains reachable at the same
  address across any crash-recovery or reboot event — players never need a
  new address to find the service again.

## Assumptions

- The host machine is already cloud-hosted, has a public IP, and is
  dedicated/always-on, per docs/SPEC.md — this feature does not need to solve
  reachability problems like CGNAT, port-forwarding, or dynamic DNS, since
  none apply to this hosting environment.
- The existing, already-owned domain is used for this launch; registering a
  separate, more brand/SEO-optimized domain is an explicitly deferred future
  decision and out of scope here.
- This feature is purely operational/infrastructure — it does not change any
  game behavior, and is independent of the other online-multiplayer features
  (gameplay protocol, Bot AI, seat takeover, room limits, landing page,
  accounts); it can be completed at any point once there is a server process
  worth exposing.
- Multi-instance scaling or load-balancing is explicitly out of scope — this
  remains a single-machine deployment, consistent with the project's stated
  v1 hosting approach.
- Automatic certificate provisioning/renewal and process supervision
  (start-on-boot, restart-on-crash) are treated here as behavioral
  requirements rather than naming specific tools; docs/SPEC.md anticipates a
  reverse proxy with automatic Let's Encrypt provisioning and a service
  supervisor (e.g. systemd) as the mechanism, but the specific tooling choice
  is left to planning.
