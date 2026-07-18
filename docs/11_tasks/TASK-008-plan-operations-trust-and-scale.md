# TASK-008: Plan Operations Trust And Scale

```yaml
id: TASK-008
status: draft
owner: Project Owner
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../10_features/FEAT-008-operations-trust-and-scale.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-008.md
execution_plan:
  - ../21_execution_plans/EP-TASK-008-plan-operations-trust-and-scale.md
```

## Objective

Plan operational controls for feed freshness, XML endpoint smoke, generation timing, alerts, dashboards, deployment evidence, and rollback.

## Upstream Links

Roadmap `../08_roadmap/ROADMAP.md`, feature `../10_features/FEAT-008-operations-trust-and-scale.md`, system `../04_systems/SYS-001-feed-generation.md`, and invariants `../17_governance/PROJECT_INVARIANTS.md`.

## Goal Impact

See `../22_goal_impact/GOAL-IMPACT-TASK-008.md`. This task supports marketplace growth while preserving Heureka feed invariants.

## Project Invariant Impact

Applies INV-001 through INV-005 unless the execution plan narrows a specific non-runtime documentation-only step.

## Sensitive-Data Classification

Classification: synthetic. Use synthetic product, feed, status, event, submission, and error examples. Do not include secrets, raw production records, customer identifiers, internal cost, margin, supplier private values, JWTs, or logs.

## Contract/Schema Impact

Expected planning impact. Runtime contract or schema changes require a reviewed execution plan, synthetic tests, and validation evidence before implementation.

## Replay/Determinism Impact

High. Feed validation, readiness, lifecycle, event emission, and status updates must be deterministic for a fixed input snapshot; non-deterministic AI output must be persisted only as suggestion evidence.

## Scope

Production smoke checklist, alert thresholds, stale/invalid/slow feed states, Kubernetes readiness, rollback playbooks, and scale validation.

## Non-Goals

No Kubernetes changes in planning task, no secret exposure, no media dependency until contract is approved.

## Acceptance Criteria

- [ ] Execution plan is reviewed before coding.
- [ ] Invariant impacts are explicit.
- [ ] Sensitive-data handling is testable.
- [ ] Contract and replay risks are documented.
- [ ] Validation evidence is captured under `docs/12_validation/` or `reports/validation/` before closure.

## Required Context

`../08_roadmap/ROADMAP.md`, `../16_operations/INTEGRATIONS.md`, `../17_governance/PROJECT_INVARIANTS.md`, `../10_features/FEAT-008-operations-trust-and-scale.md`, `../21_execution_plans/EP-TASK-008-plan-operations-trust-and-scale.md`, `services/heureka-service/src/heureka/feed/feed.service.ts`, `services/heureka-service/src/heureka/feed/feed.controller.ts`, `prisma/schema.prisma`.

## Validation Task

Validate documentation traceability first; implementation tasks must add targeted tests and gate evidence matching the execution plan.

## Required Gates

Pre-coding gate, strict documentation audit, task-specific contract/replay validation, targeted tests for implementation, and deployment-readiness gate.

## Execution Plan Requirement

This task must not be converted into a coding prompt until an approved execution plan exists.

## Agent G Planning Evidence

`../16_operations/OPS-TASK-008-operations-trust-and-scale.md` now contains the TASK-008 draft smoke checklist, alert thresholds, rollback criteria, scale evidence needs, dashboard redaction rules, and blocker list.

Current task state remains draft/planning because runtime probes depend on `GET /feed/status?type=heureka_cz` returns `{ success, data }` with `feedType`, `status`, `latestFeedId`, `feedUrl`, `productCount`, `generatedAt`, `feedAgeSeconds`, `reason`, and `latestValidation`; XML feed responses expose `X-Heureka-Feed-Status`, `X-Heureka-Feed-Generation-Ms`, and `X-Heureka-Feed-Snapshot-Hash`; statuses are `valid`, `invalid`, `stale`, `generating`, `failed`, and `missing`; policy decisions are `persist_and_expose` and `block_publication`.. No Kubernetes, secret, schema, or runtime changes are approved by this evidence.
