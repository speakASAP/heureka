# TASK-004: Design Catalog Feed Readiness Action

```yaml
id: TASK-004
status: completed
owner: Project Owner
created: 2026-06-13
last_updated: 2026-06-15
completeness_level: complete
upstream:
  - ../10_features/FEAT-004-catalog-feed-readiness-action.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-004.md
execution_plan:
  - ../21_execution_plans/EP-TASK-004-design-catalog-feed-readiness-action.md
```

## Objective

Design the catalog-facing dry-run/readiness contract that explains why products can or cannot enter the Heureka feed.

## Upstream Links

Roadmap `../08_roadmap/ROADMAP.md`, feature `../10_features/FEAT-004-catalog-feed-readiness-action.md`, system `../04_systems/SYS-001-feed-generation.md`, and invariants `../17_governance/PROJECT_INVARIANTS.md`.

## Goal Impact

See `../22_goal_impact/GOAL-IMPACT-TASK-004.md`. This task supports marketplace growth while preserving Heureka feed invariants.

## Project Invariant Impact

Applies INV-001 through INV-005 unless the execution plan narrows a specific non-runtime documentation-only step.

## Sensitive-Data Classification

Classification: synthetic. Use synthetic product, feed, status, event, submission, and error examples. Do not include secrets, raw production records, customer identifiers, internal cost, margin, supplier private values, JWTs, or logs.

## Contract/Schema Impact

Expected planning impact. Runtime contract or schema changes require a reviewed execution plan, synthetic tests, and validation evidence before implementation.

## Replay/Determinism Impact

High. Feed validation, readiness, lifecycle, event emission, and status updates must be deterministic for a fixed input snapshot; non-deterministic AI output must be persisted only as suggestion evidence.

## Scope

Single-product and bulk readiness, missing fields, category/media/price/stock blockers, owner service, and remediation hints.

## Non-Goals

No direct product editing in catalog, no automatic feed inclusion, no runtime write to external services.

## Acceptance Criteria

- [x] Execution plan is reviewed before coding.
- [x] Invariant impacts are explicit.
- [x] Sensitive-data handling is testable.
- [x] Contract and replay risks are documented.
- [x] Validation evidence is captured under `docs/12_validation/` or `reports/validation/` before closure.

## Required Context

`../08_roadmap/ROADMAP.md`, `../16_operations/INTEGRATIONS.md`, `../17_governance/PROJECT_INVARIANTS.md`, `../10_features/FEAT-004-catalog-feed-readiness-action.md`, `../21_execution_plans/EP-TASK-004-design-catalog-feed-readiness-action.md`, `services/heureka-service/src/heureka/feed/feed.service.ts`, `services/heureka-service/src/heureka/feed/feed.controller.ts`, `prisma/schema.prisma`.

## Validation Task

Validate documentation traceability first; implementation tasks must add targeted tests and gate evidence matching the execution plan.

## Required Gates

Pre-coding gate, strict documentation audit, task-specific contract/replay validation, targeted tests for implementation, and deployment-readiness gate.

## Execution Plan Requirement

This task must not be converted into a coding prompt until an approved execution plan exists.

## Implementation Evidence

Implemented a read-only catalog feed readiness runtime slice after TASK-003 policy vocabulary stabilized. The service now exposes deterministic single-product and bulk readiness dry-runs without catalog, pricing, media, warehouse, feed publication, or database mutation.

Runtime files changed: `services/heureka-service/src/heureka/feed/feed-readiness.ts`, `services/heureka-service/src/heureka/feed/feed-readiness.self-test.ts`, `services/heureka-service/src/heureka/feed/feed.service.ts`, and `services/heureka-service/src/heureka/feed/feed.controller.ts`.

Runtime endpoints:

- `GET /feed/readiness/products/:productId?feedType=heureka_cz`
- `POST /feed/readiness/bulk`

Validation evidence is recorded in `../12_validation/VAL-TASK-004.md`.
