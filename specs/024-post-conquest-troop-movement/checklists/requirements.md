# Specification Quality Checklist: Post-Conquest Troop Movement

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-23
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Closes a real gap in current behavior: `GameController.attack()` currently
  moves every surviving attacker into a conquered territory automatically
  (`defendingTroopState!.count = attackingTroops - result.attackerLosses`),
  with no player choice.
- Verified (not just assumed) that the minimum bound can never exceed the
  maximum: the decisive final attack roll that brings the defender to
  exactly 0 troops requires all of the defender's remaining troops to lose
  their comparison, which forces zero attacker losses that same round —
  reasoning included in Edge Cases rather than left as an open question.
- Independent of 009 (fortify) by design — does not consume or interact with
  that separate one-move-per-turn allowance.
- Flags, but deliberately does not fix, a follow-up drift gap in 001 (online
  gameplay protocol), which has no action/step for this choice yet —
  consistent with how the capital-placement/resign gap in 001 was previously
  found and reported before being patched separately.
- All checklist items pass on first pass.
