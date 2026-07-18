# TASK-005: Define AI Feed Optimization Contract

```yaml
id: TASK-005
status: draft
owner: Project Owner
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../10_features/FEAT-005-ai-assisted-feed-optimization.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-005.md
execution_plan:
  - ../21_execution_plans/EP-TASK-005-define-ai-feed-optimization-contract.md
```

## Objective

Define ai-microservice suggestion contracts for feed titles, descriptions, categories, parameters, and media notes without granting AI mutation authority.

## Upstream Links

Roadmap `../08_roadmap/ROADMAP.md`, feature `../10_features/FEAT-005-ai-assisted-feed-optimization.md`, system `../04_systems/SYS-001-feed-generation.md`, and invariants `../17_governance/PROJECT_INVARIANTS.md`.

## Goal Impact

See `../22_goal_impact/GOAL-IMPACT-TASK-005.md`. This task supports marketplace growth while preserving Heureka feed invariants.

## Project Invariant Impact

Applies INV-001 through INV-005 unless the execution plan narrows a specific non-runtime documentation-only step.

## Sensitive-Data Classification

Classification: synthetic. Use synthetic product, feed, status, event, submission, and error examples. Do not include secrets, raw production records, customer identifiers, internal cost, margin, supplier private values, JWTs, or logs.

## Contract/Schema Impact

Planning contract artifact created at `../23_documentation_contracts/AI_FEED_OPTIMIZATION_CONTRACT.md`. Runtime contract, persistence, or schema changes remain blocked until the execution plan is reviewed, synthetic tests are added, and Agent A or the schema integration owner coordinates shared storage changes.

## Replay/Determinism Impact

High. Feed validation, readiness, lifecycle, event emission, status updates, redaction, request hashing, idempotency keys, and review-state transitions must be deterministic for a fixed input snapshot. Non-deterministic AI output must be persisted only as immutable suggestion evidence if storage is later approved; it must not directly mutate public XML.

## Scope

Suggestion request/response contract, redaction rules, review states, input snapshot hash, confidence/evidence fields, and approval path.

## Non-Goals

No autonomous public feed mutation, no raw production prompts, no unreviewed price or text changes.

## Acceptance Criteria

- [ ] Execution plan is reviewed before coding.
- [x] Invariant impacts are explicit.
- [x] Sensitive-data handling is testable through locked redaction fields and synthetic examples.
- [x] Contract and replay risks are documented in `../23_documentation_contracts/AI_FEED_OPTIMIZATION_CONTRACT.md`.
- [x] Validation evidence is captured under `docs/12_validation/` or `reports/validation/` before closure.

Coding remains blocked because the execution plan is still `draft` and runtime storage/schema changes require Agent A coordination.

## Required Context

`../08_roadmap/ROADMAP.md`, `../16_operations/INTEGRATIONS.md`, `../17_governance/PROJECT_INVARIANTS.md`, `../10_features/FEAT-005-ai-assisted-feed-optimization.md`, `../21_execution_plans/EP-TASK-005-define-ai-feed-optimization-contract.md`, `services/heureka-service/src/heureka/feed/feed.service.ts`, `services/heureka-service/src/heureka/feed/feed.controller.ts`, `prisma/schema.prisma`.

## Validation Task

Validate documentation traceability first; implementation tasks must add targeted tests and gate evidence matching the execution plan. Contract-only validation must prove AI cannot directly mutate public XML, examples are synthetic, review states are locked, and public feed changes require human review plus deterministic validation.

## Required Gates

Pre-coding gate, strict documentation audit, task-specific contract/replay validation, targeted tests for implementation, and deployment-readiness gate.

## Execution Plan Requirement

This task must not be converted into a coding prompt until an approved execution plan exists.
