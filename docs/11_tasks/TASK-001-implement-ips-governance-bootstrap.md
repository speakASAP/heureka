# TASK-001: Implement IPS governance bootstrap

```yaml
id: TASK-001
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../10_features/FEAT-001-feed-generation-governance.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-001.md
execution_plan:
  - ../21_execution_plans/EP-TASK-001.md
```

## Objective

Add the company IPS baseline without changing runtime feed behavior.

## Upstream Links

Feature `../10_features/FEAT-001-feed-generation-governance.md`, system `../04_systems/SYS-001-feed-generation.md`, vision `../01_vision/VISION.md`, and business constraints `../BUSINESS.md`.

## Goal Impact

Creates governance controls for future code work; see `../22_goal_impact/GOAL-IMPACT-TASK-001.md`.

## Project Invariant Impact

Applies all invariants in `../17_governance/PROJECT_INVARIANTS.md` without changing runtime behavior.

## Sensitive-Data Classification

Classification: none. No production data, credentials, customer identifiers, raw logs, or secret values are required.

## Contract/Schema Impact

No runtime API, database, XML, event, or Kubernetes contract changes.

## Replay/Determinism Impact

Gate scripts are deterministic for a fixed repo state except timestamps.

## Scope

Create IPS docs, copy scripts/templates/contracts, add graph, add npm scripts, and run gates.

## Non-Goals

No TypeScript changes, Kubernetes manifest changes, runtime deployment, or invented goals.

## Acceptance Criteria

- [x] Required IPS documents exist.
- [x] Gate scripts exist.
- [x] Graph links core artifacts.
- [x] Package scripts expose IPS checks.
- [ ] Human reviews initial immutable IPS documents.

## Required Context

`../BUSINESS.md`, `../SYSTEM.md`, `../README.md`, `../23_documentation_contracts/DOCUMENTATION_COMPLETENESS_STANDARD.md`, `../17_governance/PROJECT_INVARIANTS.md`.

## Validation Task

Run strict audit and pre-coding gate; run deployment-readiness after protected docs are reviewed or committed.

## Required Gates

`python3 scripts/pre_coding_gate.py --root .`; `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`; `python3 scripts/deployment_readiness_gate.py --root . --target TASK-001`.

## Execution Plan Requirement

This task must not expand beyond `../21_execution_plans/EP-TASK-001.md`.
