# TASK-003: Define Feed Validation Policy Engine

```yaml
id: TASK-003
status: completed
owner: Project Owner
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../10_features/FEAT-003-feed-validation-policy-engine.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-003.md
execution_plan:
  - ../21_execution_plans/EP-TASK-003-define-feed-validation-policy-engine.md
```

## Objective

Define deterministic policy gates that decide whether a generated Heureka feed may be persisted, served, or handed off.

## Upstream Links

Roadmap `../08_roadmap/ROADMAP.md`, feature `../10_features/FEAT-003-feed-validation-policy-engine.md`, system `../04_systems/SYS-001-feed-generation.md`, and invariants `../17_governance/PROJECT_INVARIANTS.md`.

## Goal Impact

See `../22_goal_impact/GOAL-IMPACT-TASK-003.md`. This task supports marketplace growth while preserving Heureka feed invariants.

## Project Invariant Impact

Applies INV-001 through INV-005. The policy engine blocks invalid XML, unsupported feed types, product-count mismatch, zero-stock inclusion evidence, SLA violations, and internal commercial or secret field exposure.

## Sensitive-Data Classification

Classification: synthetic. Synthetic XML fixtures are used in tests and validation evidence. No secrets, raw production records, customer identifiers, internal cost, margin, supplier private values, JWTs, or logs are included.

## Contract/Schema Impact

Runtime contract impact only. No database schema changes were made. Validation snapshots now include a versioned `policy` result with `policyVersion`, `status`, `decision`, deterministic `snapshotHash`, `findings`, `blockers`, and `warnings`.

## Replay/Determinism Impact

High. Policy output is deterministic for a fixed input snapshot and includes a stable replay hash over feed type, XML, generation timing, product counts, stock evidence, failed-fetch count, and SHOPITEM count.

## Scope

Policy result vocabulary, XML validation, product eligibility count checks, zero-stock blockers, sensitive-field scan, timing thresholds, remediation messages, and warning-level partial catalog fetch evidence.

## Non-Goals

No direct catalog mutation, no feed submission implementation, no AI generation, no Prisma migration, and no changes to public feed XML fields beyond validation gating.

## Acceptance Criteria

- [x] Execution plan is reviewed before coding.
- [x] Invariant impacts are explicit.
- [x] Sensitive-data handling is testable.
- [x] Contract and replay risks are documented.
- [x] Validation evidence is captured under `docs/12_validation/` or `reports/validation/` before closure.

## Required Context

`../08_roadmap/ROADMAP.md`, `../16_operations/INTEGRATIONS.md`, `../17_governance/PROJECT_INVARIANTS.md`, `../10_features/FEAT-003-feed-validation-policy-engine.md`, `../21_execution_plans/EP-TASK-003-define-feed-validation-policy-engine.md`, `services/heureka-service/src/heureka/feed/feed.service.ts`, `services/heureka-service/src/heureka/feed/feed.controller.ts`, `prisma/schema.prisma`.

## Validation Task

Validate documentation traceability first; implementation tasks must add targeted tests and gate evidence matching the execution plan.

## Required Gates

Pre-coding gate, strict documentation audit, task-specific contract/replay validation, targeted tests for implementation, and deployment-readiness gate.

## Execution Plan Requirement

This task must not be converted into a coding prompt until an approved execution plan exists.

## Implementation Evidence

Implemented a pure policy module in `services/heureka-service/src/heureka/feed/feed-validation-policy.ts` and integrated it into `services/heureka-service/src/heureka/feed/feed-lifecycle.ts`. The existing service/controller lifecycle path consumes the richer snapshot without adding schema changes.

Policy vocabulary:

- `FEED_TYPE_UNSUPPORTED`
- `XML_ENVELOPE_INVALID`
- `XML_TEXT_UNESCAPED`
- `PRODUCT_COUNT_MISMATCH`
- `ZERO_STOCK_INCLUDED`
- `ZERO_STOCK_EVIDENCE_INVALID`
- `GENERATION_SLA_EXCEEDED`
- `SENSITIVE_FIELD_EXPOSED`
- `CATALOG_FETCH_PARTIAL`
