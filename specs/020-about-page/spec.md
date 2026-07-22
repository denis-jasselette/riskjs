# Feature Specification: About Page

**Feature Branch**: `020-about-page`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "About Page for RiskJS — a simple, static, reachable-from-anywhere page explaining what RiskJS is, who made it, and links out to the existing GitHub repo and the existing donation link. Low-stakes, purely informational, no game-state or account interaction. Excludes dynamic/account-specific content, versioning/changelog, and legal pages."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Learn what this project is and how to support it (Priority: P1)

A visitor, from anywhere in the app, can reach a page that explains what
RiskJS is and who made it, and can follow a link to the project's source
code/issue tracker or its existing donation page from there.

**Why this priority**: This is the entire feature — a single static
informational page with outbound links, not a multi-part capability.

**Independent Test**: From any screen in the app, navigate to the About
page, confirm it displays information about the project, and confirm its
links to the GitHub repository and the donation page work correctly.

**Acceptance Scenarios**:

1. **Given** a visitor is anywhere in the app, **When** they navigate to the
   About page, **Then** they see information describing what RiskJS is and
   who made it.
2. **Given** a visitor is viewing the About page, **When** they follow the
   link to the project's source/issues, **Then** it correctly leads to the
   existing GitHub repository.
3. **Given** a visitor is viewing the About page, **When** they follow the
   link to support the project, **Then** it correctly leads to the existing
   donation destination.

---

### Edge Cases

- None beyond standard link-correctness — this is a static, low-complexity
  page with no state-dependent behavior.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an About page reachable from anywhere in
  the app.
- **FR-002**: The About page MUST describe what RiskJS is and who made it.
- **FR-003**: The About page MUST link out to the project's existing GitHub
  repository.
- **FR-004**: The About page MUST link out to the project's existing
  donation destination, rather than duplicating that functionality.

### Key Entities

- Not applicable — this is a static informational page with no data entities
  of its own.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can reach the About page from any screen in the app.
- **SC-002**: 100% of the About page's outbound links (GitHub repository,
  donation destination) resolve correctly.

## Assumptions

- Exact wording and additional informational content on the page are left to
  whoever builds it — this is a low-stakes, purely informational feature
  with no behavioral ambiguity worth specifying further.
- No dynamic or account-specific content, versioning/changelog display, or
  legal pages (privacy policy, terms of service) are included; those are out
  of scope for this feature.
