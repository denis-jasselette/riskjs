# Feature Specification: Admin User Management

**Feature Branch**: `021-admin-user-management`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Admin: User Management for RiskJS — an operator-only interface to look up an account, view its basic info (stats, ban status), and ban/unban it, applying the manual ban capability already specified in the Account System (006). Single-operator context, not a multi-admin role system. Depends on 006 for account data and the ban action itself; only builds the interface to find an account and apply it. Excludes role-based permissions, any reports/appeals workflow, and admin management of lobbies or games."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find an account and see its status (Priority: P1)

The operator can look up a specific account (e.g. by its display name) and
see its basic information — its stats and whether it is currently banned.

**Why this priority**: Without the ability to find an account at all, there
is nothing to act on — this is the precondition for the ban/unban action
that gives the feature its purpose.

**Independent Test**: As the operator, look up an existing account by
display name and confirm its stats and current ban status are shown
accurately.

**Acceptance Scenarios**:

1. **Given** the operator is in the user management interface, **When** they
   look up an account by its display name, **Then** they see that account's
   basic stats and current ban status.
2. **Given** the operator looks up a display name that doesn't match any
   account, **When** the lookup completes, **Then** they are clearly told no
   matching account was found.

---

### User Story 2 - Ban or unban an account (Priority: P1)

The operator can ban an account they've found, immediately preventing it
from signing in or playing under that identity, and can later unban it,
restoring normal access.

**Why this priority**: This is the actual point of the feature — the
lookup in User Story 1 exists only to support taking this action. Equal
priority since neither story delivers value without the other.

**Independent Test**: As the operator, ban a specific account and confirm
that account can no longer sign in or play; then unban it and confirm normal
access is restored.

**Acceptance Scenarios**:

1. **Given** the operator has found an account, **When** they ban it,
   **Then** that account can no longer sign in or play under that identity,
   consistent with the ban behavior already defined in the Account System.
2. **Given** the operator has found a currently banned account, **When**
   they unban it, **Then** that account regains normal ability to sign in
   and play.
3. **Given** an account's ban status changes, **When** the operator views
   that account again, **Then** the interface reflects its current status
   accurately.

---

### Edge Cases

- What happens if the operator attempts to ban an account that is currently
  signed in and actively playing a game — does the ban take effect
  immediately (ending their access mid-session) or only on their next
  sign-in attempt?
- What happens if two display names are very similar or identical — how does
  lookup disambiguate between accounts sharing a similar or identical
  display name?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an interface, reachable only by the
  operator, for looking up an account by its display name.
- **FR-002**: System MUST NOT make this interface reachable by any player who
  is not the operator.
- **FR-003**: A successful account lookup MUST show that account's basic
  stats and current ban status.
- **FR-004**: An unsuccessful lookup (no matching account) MUST clearly
  inform the operator that no account was found.
- **FR-005**: System MUST let the operator ban a found account, applying the
  same ban behavior already defined by the Account System feature (an
  already-banned account cannot sign in or play).
- **FR-006**: System MUST let the operator unban a previously banned
  account, restoring its normal ability to sign in and play.
- **FR-007**: System MUST reflect an account's current ban status accurately
  whenever the operator views it, immediately after any ban/unban action.

### Key Entities

- **Operator Access**: The single, non-role-based elevated access level that
  distinguishes the site operator from ordinary players for the purposes of
  this interface.
- **Account Lookup Result**: The basic stats and ban status shown for a
  found account.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The operator can find any existing account by display name and
  see its accurate current stats and ban status, in 100% of lookups for
  accounts that exist.
- **SC-002**: 100% of ban and unban actions taken by the operator take
  effect consistent with the Account System's existing ban behavior.
- **SC-003**: 0% of ordinary (non-operator) players can reach this
  interface.

## Assumptions

- This is a single-operator context — one site owner/operator, not a
  multi-admin role-based permission system — consistent with the project's
  established single-person, self-hosted hobby-project philosophy.
- How the operator authenticates to reach this interface (e.g. a flag on
  their own account, a separate mechanism) is a planning/implementation
  decision, not a scope decision here; the requirement is only that the
  interface is exclusively reachable by the operator.
- This feature depends on the Account System (006) for account data and the
  underlying ban behavior itself; it does not redefine what a ban does, only
  builds the interface to find an account and apply that existing action.
- Any reports/appeals workflow remains explicitly out of scope, consistent
  with the project's stated "no moderation pipeline beyond a manual ban"
  philosophy. Admin management of lobbies or games is a separate,
  already-planned feature and not covered here.
