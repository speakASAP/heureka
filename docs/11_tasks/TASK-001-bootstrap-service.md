# TASK-001-bootstrap-service

completeness_level: complete

status: validated

## Objective
Create and validate the initial IPS adoption profile for the Heureka marketplace integration service so its required artifacts and validation evidence match the actual runtime boundary.

## Upstream links
- `../22_goal_impact/GOAL-IMPACT-TASK-001.md`
- `../21_execution_plans/EP-TASK-001-bootstrap-service.md`
- `../12_validation/VAL-TASK-001-bootstrap-service.md`

## Goal impact
The service gains a truthful adoption profile that captures the feed-generation and marketplace integration workflow without overclaiming ownership of the underlying catalog, warehouse, or payment domains.

## Project invariant impact
The project remains aligned with the invariant that service ownership must be explicit, bounded, and traceable.

## Sensitive-data classification
The onboarding docs do not include secret values or production credential material.

## Contract and schema impact
This task only defines the repository-level adoption and governance contract; it does not alter the runtime API contract beyond documentation alignment.

## Replay and determinism impact
The work is deterministic because it reflects the current repo reality and the shared IPS validator rules.

## Scope
- Document Heureka feed-generation ownership, dependencies, and operational boundary
- Align the required IPS adoption artifacts to the repo’s real runtime state
- Validate the repo against the central IPS planning rules

## Non-goals
- Changing the product catalog source-of-truth or the warehouse domain boundary
- Creating a broader commerce platform claim beyond the Heureka integration service
- Altering upstream service ownership outside the Heureka repo

## Acceptance criteria
- The required sections exist in the mandated artifacts.
- The repo passes the IPS planning validator.
- No placeholder markers or fabricated runtime claims remain in the profile.
- The adoption docs remain truthful about the service’s dependency and ownership model.

## Required context
- The real Heureka repo docs and runtime boundaries
- The central IPS onboarding standard and validation script

## Validation task
Run the repository-level IPS validator and confirm the Heureka adoption profile passes the planning gate.

## Required gates
- `python3 intent-preservation-system/scripts/validate_adoption_profile.py --root heureka --phase planning`

## Parallel workstream context
This is a single-repo onboarding task and does not include deploy work or unrelated service ownership changes.
