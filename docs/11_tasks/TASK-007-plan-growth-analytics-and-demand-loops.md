# TASK-007: Plan Growth Analytics And Demand Loops

```yaml
id: TASK-007
status: draft
owner: Project Owner
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../10_features/FEAT-007-growth-analytics-and-demand-loops.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-007.md
execution_plan:
  - ../21_execution_plans/EP-TASK-007-plan-growth-analytics-and-demand-loops.md
```

## Objective

Define redacted feed lifecycle, readiness, submission, leads, marketing, and digest events that turn Heureka operations into demand intelligence.

## Upstream Links

Roadmap `../08_roadmap/ROADMAP.md`, feature `../10_features/FEAT-007-growth-analytics-and-demand-loops.md`, system `../04_systems/SYS-001-feed-generation.md`, and invariants `../17_governance/PROJECT_INVARIANTS.md`.

## Goal Impact

See `../22_goal_impact/GOAL-IMPACT-TASK-007.md`. This task supports marketplace growth while preserving Heureka feed invariants.

## Project Invariant Impact

Applies INV-001 through INV-005 unless the execution plan narrows a specific non-runtime documentation-only step.

## Sensitive-Data Classification

Classification: synthetic. Use synthetic product, feed, status, event, submission, and error examples. Do not include secrets, raw production records, customer identifiers, internal cost, margin, supplier private values, JWTs, or logs.

## Contract/Schema Impact

Expected planning impact. Runtime contract or schema changes require a reviewed execution plan, synthetic tests, and validation evidence before implementation.

## Replay/Determinism Impact

High. Feed validation, readiness, lifecycle, event emission, and status updates must be deterministic for a fixed input snapshot; non-deterministic AI output must be persisted only as suggestion evidence.

## Scope

Versioned event taxonomy, redaction rules, demand segments, digest metrics, and replay/idempotency expectations.

## Non-Goals

No raw PII, no raw order exports, no production marketing writes until contracts are validated.

## Acceptance Criteria

- [ ] Execution plan is reviewed before coding.
- [ ] Invariant impacts are explicit.
- [ ] Sensitive-data handling is testable.
- [ ] Contract and replay risks are documented.
- [ ] Validation evidence is captured under `docs/12_validation/` or `reports/validation/` before closure.

## Required Context

`../08_roadmap/ROADMAP.md`, `../16_operations/INTEGRATIONS.md`, `../17_governance/PROJECT_INVARIANTS.md`, `../10_features/FEAT-007-growth-analytics-and-demand-loops.md`, `../21_execution_plans/EP-TASK-007-plan-growth-analytics-and-demand-loops.md`, `services/heureka-service/src/heureka/feed/feed.service.ts`, `services/heureka-service/src/heureka/feed/feed.controller.ts`, `prisma/schema.prisma`.

## Validation Task

Validate documentation traceability first; implementation tasks must add targeted tests and gate evidence matching the execution plan.

## Required Gates

Pre-coding gate, strict documentation audit, task-specific contract/replay validation, targeted tests for implementation, and deployment-readiness gate.

## Execution Plan Requirement

This task must not be converted into a coding prompt until an approved execution plan exists.
