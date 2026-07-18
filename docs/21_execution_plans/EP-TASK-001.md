# EP-TASK-001: IPS Governance Bootstrap

```yaml
id: EP-TASK-001
status: draft
source_task: ../11_tasks/TASK-001-implement-ips-governance-bootstrap.md
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
vision:
  - ../01_vision/VISION.md
constitution:
  - ../00_constitution/CONSTITUTION.md
feature:
  - ../10_features/FEAT-001-feed-generation-governance.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-001.md
```

## Metadata

Bootstrap plan for IPS governance artifacts and gate commands.

## Upstream Traceability

Constitution `../00_constitution/CONSTITUTION.md`, vision `../01_vision/VISION.md`, feature `../10_features/FEAT-001-feed-generation-governance.md`, task `../11_tasks/TASK-001-implement-ips-governance-bootstrap.md`, goal impact `../22_goal_impact/GOAL-IMPACT-TASK-001.md`.

## Goal Impact

Makes future changes auditable against feed XML validity, zero-stock exclusion, timing, and public data-safety constraints.

## Project Invariants

Preserve `../17_governance/PROJECT_INVARIANTS.md`; no runtime behavior changes.

## Sensitive-Data Handling

Classification: none. Do not include secret values or production records.

## Contract Validation Plan

No runtime contract change; validate IPS contract with strict audit and pre-coding gate.

## Replay/Determinism Plan

Gate output is deterministic for fixed checkout except timestamps.

## Scope

Create baseline docs, copy reusable IPS assets, add graph edges, and wire npm scripts.

## Non-Goals

No runtime code, database, API, Kubernetes, or secret changes.

## Files to Inspect

`../README.md`, `../BUSINESS.md`, `../SYSTEM.md`, `../TASKS.md`, `../services/heureka-service/src/heureka/feed/feed.service.ts`, `../services/heureka-service/src/heureka/feed/feed.controller.ts`, `../prisma/schema.prisma`.

## Files to Create

IPS directories, `../graph/project_graph.example.yaml`, and gate scripts under `../scripts/`.

## Files to Modify

`../package.json`.

## Files That Must Not Be Modified

`../k8s/deployment.yaml`, `../services/heureka-service/src/**`, `../services/api-gateway/src/**`, secret files, and runtime env files.

## Implementation Steps

1. Read IPS and service docs. 2. Copy assets. 3. Create artifacts. 4. Add scripts. 5. Run gates. 6. Record evidence.

## Test Plan

Run IPS audit and pre-coding gate; runtime tests are not required for docs-only changes.

## Validation Plan

Audit passes, pre-coding gate passes, and validation report records evidence and limitations.

## Gate Commands

```bash
python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
python3 scripts/deployment_readiness_gate.py --root . --target TASK-001
```

## Documentation Updates

Update validation evidence after command runs.

## Rollback Plan

Remove bootstrap files and revert package script additions without touching unrelated worktree changes.

## Agent Handoff Prompt

Implement only the IPS bootstrap, preserve runtime code/manifests, run gates, and report evidence.

## Completion Checklist

- [x] Implementation complete
- [x] Tests complete
- [x] Validation evidence collected
- [x] Documentation updated
- [x] Deviations documented
