# TASK-002: Design Governed Feed Publication Lifecycle

```yaml
id: TASK-002
status: completed
owner: Project Owner
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../10_features/FEAT-002-governed-feed-publication-lifecycle.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-002.md
execution_plan:
  - ../21_execution_plans/EP-TASK-002-design-governed-feed-publication-lifecycle.md
```

## Objective

Design and implement the first durable Heureka feed lifecycle with validation snapshots, idempotency, status, monitoring, and controlled public exposure.

## Upstream Links

Roadmap `../08_roadmap/ROADMAP.md`, feature `../10_features/FEAT-002-governed-feed-publication-lifecycle.md`, system `../04_systems/SYS-001-feed-generation.md`, and invariants `../17_governance/PROJECT_INVARIANTS.md`.

## Goal Impact

See `../22_goal_impact/GOAL-IMPACT-TASK-002.md`. This task supports marketplace growth while preserving Heureka feed invariants.

## Project Invariant Impact

Applies INV-001 through INV-005 unless the execution plan narrows a specific non-runtime documentation-only step.

## Sensitive-Data Classification

Classification: synthetic. Use synthetic product, feed, status, event, submission, and error examples. Do not include secrets, raw production records, customer identifiers, internal cost, margin, supplier private values, JWTs, or logs.

## Contract/Schema Impact

Expected planning impact. Runtime contract or schema changes require a reviewed execution plan, synthetic tests, and validation evidence before implementation.

## Replay/Determinism Impact

High. Feed validation, readiness, lifecycle, event emission, and status updates must be deterministic for a fixed input snapshot; non-deterministic AI output must be persisted only as suggestion evidence.

## Scope

XML validity, zero-stock exclusion, sensitive-field exclusion, timing evidence, feed freshness, validation snapshots, and stale/failed status endpoints.

## Non-Goals

No AI optimization, no marketing/leads integration, no payment/supplier writes, no submission ownership transfer from flipflop-service.

## Acceptance Criteria

- [x] Execution plan is reviewed before coding.
- [x] Invariant impacts are explicit.
- [x] Sensitive-data handling is testable.
- [x] Contract and replay risks are documented.
- [x] Validation evidence is captured under `docs/12_validation/` or `reports/validation/` before closure.

## Required Context

`../08_roadmap/ROADMAP.md`, `../16_operations/INTEGRATIONS.md`, `../17_governance/PROJECT_INVARIANTS.md`, `../10_features/FEAT-002-governed-feed-publication-lifecycle.md`, `../21_execution_plans/EP-TASK-002-design-governed-feed-publication-lifecycle.md`, `services/heureka-service/src/heureka/feed/feed.service.ts`, `services/heureka-service/src/heureka/feed/feed.controller.ts`, `prisma/schema.prisma`.

## Validation Task

Validate documentation traceability first; implementation tasks must add targeted tests and gate evidence matching the execution plan.

## Required Gates

Pre-coding gate, strict documentation audit, task-specific contract/replay validation, targeted tests for implementation, and deployment-readiness gate.

## Execution Plan Requirement

This task must not be converted into a coding prompt until an approved execution plan exists.

## Implementation Evidence

Implemented a first governed feed lifecycle slice without database schema changes: XML validation, zero-stock exclusion evidence, sensitive-field tag scan, 60-second generation timing check, in-process latest validation snapshot, deterministic snapshot hash/idempotency key, policy blocker/warning result, status endpoint, validation headers on XML responses, and controlled validation error responses.

Runtime files changed: `services/heureka-service/src/heureka/feed/feed-lifecycle.ts`, `services/heureka-service/src/heureka/feed/feed.service.ts`, `services/heureka-service/src/heureka/feed/feed.controller.ts`, and `services/heureka-service/src/heureka/feed/feed-lifecycle.self-test.ts`.
