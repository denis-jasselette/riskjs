# Feature Specification: Bug Report

**Feature Branch**: `019-bug-report`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Bug Report for RiskJS — an in-app way for any player (signed-in or guest) to report a bug from within the game, capturing a written description plus automatic context (screen, game mode/settings, rough situation) without requiring them to gather it themselves or expose sensitive personal information. The in-app form pre-fills the project's existing GitHub bug-report issue template, and the player completes submission on GitHub — deliberately avoiding the need for a custom backend/storage to receive reports, since GitHub's own issue tracker is already the durable, reviewable destination. Excludes report-status tracking for the player and any admin-side triage interface."

**Note**: This decision means a GitHub account is still required to complete the final submission step (GitHub itself requires being signed in to create an issue). The in-app form removes the friction of finding the right template, writing it correctly, and gathering context — it does not remove the GitHub-account requirement, since there is no backend standing in for GitHub's own submission step.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compose a bug report without hunting for the right template (Priority: P1)

A player who encounters a bug can describe it from wherever they currently
are in the app, without needing to know the project's GitHub repository
exists, find its issue templates, or write one out by hand. The app does
that work; the player's only remaining step is reviewing and submitting the
resulting, already-filled-in issue on GitHub.

**Why this priority**: This is the entire point of the feature — a
lower-friction alternative to manually finding and filling out a GitHub
issue template, which most ordinary players wouldn't know how to do at all.
Without this in-app starting point, most encountered bugs simply go
unreported.

**Independent Test**: From within the game (including mid-game), open the
bug report action, write a description, and confirm it produces an
already-filled-in GitHub issue (using the project's existing bug-report
template) ready for the player to review and submit — without the player
having had to find the repository or template themselves.

**Acceptance Scenarios**:

1. **Given** a player is anywhere in the app, **When** they choose to report
   a bug, **Then** they can write a description of what they experienced
   entirely within the app, without first needing to locate the project's
   GitHub repository or issue template themselves.
2. **Given** a player is in the middle of a game when they report a bug,
   **When** they complete the in-app portion of the report, **Then** their
   game is unaffected by having done so.
3. **Given** a guest (not signed into a RiskJS account) player fills out the
   in-app portion of a bug report, **When** they do so, **Then** they can
   complete it the same as a signed-in player would — no RiskJS account is
   required for the in-app portion. (Completing the final submission on
   GitHub still requires a GitHub account, per this feature's design.)

---

### User Story 2 - The report includes useful context automatically (Priority: P1)

When a player submits a bug report, it automatically includes relevant
context about what they were doing — which screen they were on, and if they
were in a game, relevant non-sensitive details like the game mode and
settings — without the player having to describe or gather that context
themselves.

**Why this priority**: Equally essential to User Story 1 — a report with
only a player's written description and no situational context is much
harder to act on. Automatic context capture is what makes the lower-friction
path still useful for diagnosis, not just a suggestion box.

**Independent Test**: Submit a bug report while in an active game with
specific settings (e.g. fog of war on, capital mode on), and confirm the
resulting report includes those settings and an indication of what screen/
situation the player was in, without the player having typed any of that
themselves.

**Acceptance Scenarios**:

1. **Given** a player submits a bug report, **When** the report is
   generated, **Then** it automatically includes which screen or part of the
   app they were using at the time.
2. **Given** a player submits a bug report while in an active game, **When**
   the report is generated, **Then** it automatically includes that game's
   mode/settings and a rough indication of what was happening, without
   requiring the player to describe it themselves.
3. **Given** a player submits a bug report, **When** the report is
   generated, **Then** it does not include any sensitive personal
   information beyond what the player chose to write in their description.

---

### User Story 3 - The pre-filled report is handed off to GitHub ready to submit (Priority: P2)

Once a player finishes the in-app portion of a bug report, they are taken to
a GitHub issue-creation page with the project's bug-report template already
filled in from their description and the automatically captured context —
all they need to do is review it and submit.

**Why this priority**: Necessary for the feature to have any real value
beyond the act of writing a report, but is naturally sequenced after the
capture mechanics (User Stories 1-2) are in place — a well-formed in-app
draft that never reaches GitHub is as useless as no report at all.

**Independent Test**: Complete the in-app portion of a bug report and
confirm it hands off to a GitHub issue-creation page with the project's
bug-report template already filled in with the player's description and the
automatically captured context, ready to submit.

**Acceptance Scenarios**:

1. **Given** a player completes the in-app portion of a bug report,
   **When** that completes, **Then** they are taken to a GitHub
   issue-creation page with the project's bug-report template already
   filled in from their description and the captured context.
2. **Given** a player is on the resulting pre-filled GitHub issue-creation
   page, **When** they submit it there, **Then** the report becomes a
   regular GitHub issue — durably stored and reviewable by the operator
   through GitHub's own tracker, with no separate backend required.
3. **Given** a player reaches the pre-filled GitHub page but does not have a
   GitHub account, **When** they attempt to submit, **Then** they are
   prompted by GitHub itself to sign in or create an account before the
   issue can be created — the in-app portion of the report is not lost, but
   final submission does require a GitHub account.

---

### Edge Cases

- What happens if a player doesn't have a GitHub account when they reach the
  hand-off step — is the filled-in content preserved so they can create an
  account and still complete submission, rather than having to start over?
- What happens if a player submits an empty or extremely short description —
  is a minimal description still accepted, or is some minimum content
  required before hand-off to GitHub?
- What happens if a player abandons the flow after the in-app portion but
  before submitting on GitHub — is there any partial report left behind
  anywhere, or does nothing happen until GitHub submission completes?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let any player, signed in or guest (with respect
  to a RiskJS account), complete the in-app portion of a bug report from
  within the app, without first needing to locate the project's GitHub
  repository or issue template themselves.
- **FR-002**: A bug report MUST include a written description provided by
  the reporting player.
- **FR-003**: System MUST automatically include, in every bug report, which
  screen or part of the app the player was using at the time of submission.
- **FR-004**: System MUST automatically include, in a bug report submitted
  during an active game, that game's mode/settings and a rough indication of
  the situation, without requiring the player to describe it manually.
- **FR-005**: System MUST NOT include any sensitive personal information in
  a bug report beyond what the reporting player chose to write in their
  description.
- **FR-006**: System MUST NOT disrupt or alter a player's active game as a
  result of completing the in-app portion of a bug report.
- **FR-007**: System MUST hand off a completed in-app bug report to a GitHub
  issue-creation page with the project's existing bug-report template
  already filled in from the player's description and the automatically
  captured context.
- **FR-008**: System MUST NOT require any custom backend or storage to
  receive bug reports — GitHub's own issue tracker, once the player submits
  there, is the durable, reviewable destination.
- **FR-009**: System MUST NOT lose the player's written description or
  captured context if they need to sign in or create a GitHub account before
  they can submit.

### Key Entities

- **Bug Report Draft**: A player's written description plus automatically
  captured context (current screen, and game mode/settings/situation if
  applicable), assembled in-app and handed off to pre-fill a GitHub issue.
- **Pre-Filled GitHub Issue**: The GitHub issue-creation page, populated from
  a Bug Report Draft using the project's existing bug-report template,
  awaiting the player's review and submission on GitHub.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player can complete the in-app portion of a bug report from
  anywhere in the app, including mid-game, without first needing to find the
  project's GitHub repository or issue template themselves.
- **SC-002**: 100% of completed in-app bug reports include automatically
  captured context (current screen, and game mode/settings if applicable)
  without the player needing to provide it themselves.
- **SC-003**: 0% of bug reports include personal information beyond what the
  reporting player explicitly wrote.
- **SC-004**: 100% of completed in-app bug reports hand off successfully to
  a GitHub issue-creation page with the project's bug-report template
  correctly filled in, ready for the player to submit.
- **SC-005**: 0% of bug reports require any custom backend or storage to
  reach a durable, reviewable state — GitHub's own tracker serves that role
  entirely once a player submits there.

## Assumptions

- Reports are handed off to pre-fill the project's existing GitHub
  bug-report issue template rather than being received by any custom
  backend or storage — this deliberately avoids the complexity of
  implementing and operating a separate report-receiving system, since
  GitHub's own issue tracker already durably stores and makes reports
  reviewable once a player submits there.
- A GitHub account is still required to complete the final submission step,
  since that step happens on GitHub's own page and GitHub requires sign-in
  to create an issue. This feature removes the friction of finding the
  right template, writing it correctly, and gathering context — it does not
  remove GitHub's own account requirement, because there is no backend
  standing in for GitHub's submission step. A player without a GitHub
  account would need to create one at that point to finish submitting.
- This feature does not include any in-app UI for a player to track the
  status of reports they've previously submitted, and does not include any
  admin-side triage or management interface for reviewing/organizing
  incoming reports — handing off a correctly filled-in report to GitHub is
  the full extent of this feature's scope.
- This is a lower-friction way to reach the same destination as the existing
  GitHub issue templates (manually filed), not a replacement for them; both
  remain valid, and this feature reuses rather than duplicates the existing
  template.
