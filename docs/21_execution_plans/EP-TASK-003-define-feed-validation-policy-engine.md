# EP-TASK-003: Define Feed Validation Policy Engine

```yaml
id: EP-TASK-003
status: validated
source_task: ../11_tasks/TASK-003-define-feed-validation-policy-engine.md
owner: Project Owner
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
vision:
  - ../01_vision/VISION.md
constitution:
  - ../00_constitution/CONSTITUTION.md
feature:
  - ../10_features/FEAT-003-feed-validation-policy-engine.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-003.md
```

## Metadata

Validated execution plan for `TASK-003`. The approved implementation adds a deterministic policy module and integrates it with the existing TASK-002 lifecycle snapshot without changing database schema or public XML fields.

## Upstream Traceability

Vision `../01_vision/VISION.md`, business case `../02_business_case/BUSINESS_CASE.md`, roadmap `../08_roadmap/ROADMAP.md`, feature `../10_features/FEAT-003-feed-validation-policy-engine.md`, task `../11_tasks/TASK-003-define-feed-validation-policy-engine.md`, goal impact `../22_goal_impact/GOAL-IMPACT-TASK-003.md`.

## Goal Impact

Define deterministic policy gates that decide whether a generated Heureka feed may be persisted, served, or handed off.

## Project Invariants

Preserve INV-001 valid XML, INV-002 zero-stock exclusion, INV-003 sub-60-second generation, INV-004 public data safety, and INV-005 secret handling.

## Sensitive-Data Handling

Classification: synthetic. Prompts, examples, tests, logs, screenshots, and reports must avoid secrets, raw production data, customer identifiers, internal cost, margin, and supplier private values.

## Contract Validation Plan

Policy results are versioned as `heureka-feed-validation-policy.v1`. Runtime snapshots expose `status`, `decision`, `snapshotHash`, `findings`, `blockers`, and `warnings` for downstream readiness and analytics contracts.

## Replay/Determinism Plan

Policy output is deterministic for a fixed input snapshot. A stable hash covers feed type, XML, generation timing, product counts, zero-stock evidence, failed fetch count, and SHOPITEM count.

## Scope

Policy result vocabulary, XML validation, product eligibility count checks, zero-stock blockers, sensitive-field scan, timing thresholds, remediation messages, and warning-level partial catalog fetch evidence.

## Non-Goals

No direct catalog mutation, no feed submission implementation, no AI generation, no Prisma migration, and no public XML field expansion.

## Parallel Goal Decomposition

The implementation kept the work in one narrow runtime lane after TASK-002 lifecycle files were available:

- Policy vocabulary lane: completed in `feed-validation-policy.ts`.
- Validator implementation lane: completed as pure deterministic policy evaluation plus lifecycle snapshot mapping.
- Integration lane: completed by enriching the existing lifecycle snapshot without changing controller behavior.

## Parallel Execution Matrix

| Goal | Can start in parallel | Depends on | Blocks | Primary files | Agent handoff |
|---|---|---|---|---|---|
| Policy vocabulary | Completed | Invariants and roadmap | TASK-004 readiness blockers and TASK-007 event payloads | `feed-validation-policy.ts` | Versioned result codes and remediation messages are available. |
| Deterministic validators | Completed | Existing feed builder behavior | TASK-002 validation snapshot integration | `feed-validation-policy.ts`, `feed-lifecycle.self-test.ts` | Pure validators do not mutate catalog or feed output. |
| Lifecycle integration | Completed | TASK-002 lifecycle/status shape | Completion | `feed-lifecycle.ts` | Existing service/controller path receives richer validation snapshots. |

## Blockers And Coordination

No active blocker remains for TASK-003. Downstream TASK-004 and TASK-007 can consume the policy vocabulary. Persistent validation storage remains a future migration-backed enhancement.

## Files to Inspect

- `../08_roadmap/ROADMAP.md`
- `../16_operations/INTEGRATIONS.md`
- `../17_governance/PROJECT_INVARIANTS.md`
- `../services/heureka-service/src/heureka/feed/feed.service.ts`
- `../services/heureka-service/src/heureka/feed/feed.controller.ts`
- `../prisma/schema.prisma`

## Files to Create

- `../services/heureka-service/src/heureka/feed/feed-validation-policy.ts`

## Files to Modify

- `../services/heureka-service/src/heureka/feed/feed-lifecycle.ts`
- `../services/heureka-service/src/heureka/feed/feed-lifecycle.self-test.ts`
- `../11_tasks/TASK-003-define-feed-validation-policy-engine.md`
- `../21_execution_plans/EP-TASK-003-define-feed-validation-policy-engine.md`
- `../22_goal_impact/GOAL-IMPACT-TASK-003.md`
- `../12_validation/VAL-TASK-003.md`
- `../TASKS.md`
- `../PLAN.md`

## Files That Must Not Be Modified

Secret files, `.env`, Kubernetes manifests, protected constitution/vision documents, and unrelated service code.

## Implementation Steps

1. Re-read required context and confirm git status.
2. Define exact contract/schema/runtime change set.
3. Add synthetic tests before or alongside implementation.
4. Implement the minimal scoped change.
5. Run gates and targeted tests.
6. Update validation evidence and task status.

## Test Plan

Strict documentation audit and pre-coding gate for planning. Runtime implementation uses a synthetic lifecycle self-test and service build to validate policy vocabulary, blocking behavior, warning behavior, and replay hash determinism.

## Validation Plan

Capture command output summaries in `docs/12_validation/VAL-TASK-003.md` and generated gate reports under `reports/validation/`.

## Gate Commands

```bash
python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
python3 scripts/deployment_readiness_gate.py --root . --target TASK-003
```

## Documentation Updates

Task, execution plan, goal impact, validation report, task tracker, and active plan were updated after implementation.

## Rollback Plan

Revert only files changed by the scoped implementation. Preserve unrelated remote worktree changes from TASK-002 and roadmap planning.

## Agent Handoff Prompt

Implement `TASK-003` only after reviewing this plan. Preserve Heureka feed invariants, use synthetic evidence, avoid secrets and production raw data, and report validation results.

## Completion Checklist

- [x] Implementation complete
- [x] Tests complete
- [x] Validation evidence collected
- [x] Documentation updated
- [x] Deviations documented

## Deviations

The execution plan started as `draft`; the user explicitly requested proceeding with TASK-003 on 2026-06-13. No schema migration was added because TASK-003 can publish its policy vocabulary and deterministic result contract through the existing in-process lifecycle snapshot.
