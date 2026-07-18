# PROMPT-TASK-003: Feed Validation Policy Engine

```yaml
id: PROMPT-TASK-003
status: executed
owner: AI agent
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../21_execution_plans/EP-TASK-003-define-feed-validation-policy-engine.md
context_package:
  - ../13_context_packages/CTX-TASK-003.md
```

## Role

Act as the TASK-003 implementation agent for Heureka feed validation policy work.

## Task

Implement a deterministic feed validation policy engine that decides whether generated Heureka XML may be persisted, served, or handed off.

## Context

Use `../17_governance/PROJECT_INVARIANTS.md`, `../16_operations/INTEGRATIONS.md`, `../10_features/FEAT-003-feed-validation-policy-engine.md`, `../21_execution_plans/EP-TASK-003-define-feed-validation-policy-engine.md`, and the existing feed lifecycle implementation.

## Constraints

Preserve valid XML, zero-stock exclusion, sub-60-second timing evidence, public data safety, and secret handling. Use synthetic examples only. Do not mutate catalog data, implement feed submission, add AI generation, expose internal commercial fields, or add database schema changes.

## Acceptance criteria

- Versioned policy result vocabulary is available to downstream readiness work.
- Policy results include blockers, warnings, remediation messages, owner hints, and deterministic replay hash.
- Lifecycle validation uses the policy result before public exposure.
- Synthetic tests cover valid feed, invalid XML text, product count mismatch, zero-stock inclusion, SLA violation, sensitive-field exposure, warning-only partial catalog fetch, and replay hash stability.

## Validation

Run the synthetic lifecycle self-test, service build, strict documentation audit, pre-coding gate, and deployment-readiness gate for `TASK-003`.

## Execution Evidence

Implemented `feed-validation-policy.ts`, integrated it into `feed-lifecycle.ts`, expanded synthetic self-tests, and captured validation evidence in `../12_validation/VAL-TASK-003.md`.
