# EP-TASK-002: Design Governed Feed Publication Lifecycle

```yaml
id: EP-TASK-002
status: validated
source_task: ../11_tasks/TASK-002-design-governed-feed-publication-lifecycle.md
owner: Project Owner
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
vision:
  - ../01_vision/VISION.md
constitution:
  - ../00_constitution/CONSTITUTION.md
feature:
  - ../10_features/FEAT-002-governed-feed-publication-lifecycle.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-002.md
```

## Metadata

Validated execution plan for `TASK-002`. The approved first slice avoids database schema changes and adds runtime lifecycle validation/status controls.

## Upstream Traceability

Vision `../01_vision/VISION.md`, business case `../02_business_case/BUSINESS_CASE.md`, roadmap `../08_roadmap/ROADMAP.md`, feature `../10_features/FEAT-002-governed-feed-publication-lifecycle.md`, task `../11_tasks/TASK-002-design-governed-feed-publication-lifecycle.md`, goal impact `../22_goal_impact/GOAL-IMPACT-TASK-002.md`.

## Goal Impact

Design and implement the first durable Heureka feed lifecycle with validation snapshots, idempotency, status, monitoring, and controlled public exposure.

## Project Invariants

Preserve INV-001 valid XML, INV-002 zero-stock exclusion, INV-003 sub-60-second generation, INV-004 public data safety, and INV-005 secret handling.

## Sensitive-Data Handling

Classification: synthetic. Prompts, examples, tests, logs, screenshots, and reports must avoid secrets, raw production data, customer identifiers, internal cost, margin, and supplier private values.

## Contract Validation Plan

Create or update contracts only when explicitly listed in a later coding plan. Contract examples must be synthetic and versioned.

## Replay/Determinism Plan

Deterministic validation and readiness outputs must be reproducible for a fixed input snapshot. Idempotency keys or snapshot hashes are required for lifecycle/status/event implementation.

## Scope

XML validity, zero-stock exclusion, sensitive-field exclusion, timing evidence, feed freshness, validation snapshots, and stale/failed status endpoints.

## Non-Goals

No AI optimization, no marketing/leads integration, no payment/supplier writes, no submission ownership transfer from flipflop-service.

## Parallel Goal Decomposition

This plan has one primary runtime goal, but it can be split into parallel lanes if each agent claims a narrow file boundary:

- Lifecycle/status lane: validation snapshots, lifecycle state, freshness, and stale/failed status semantics.
- XML validation lane: deterministic XML validity, zero-stock exclusion, sensitive-field scan, and timing evidence tests.
- Operations evidence lane: validation report updates, gate output capture, and replay/determinism evidence.

## Parallel Execution Matrix

| Goal | Can start in parallel | Depends on | Blocks | Primary files | Agent handoff |
|---|---|---|---|---|---|
| Lifecycle/status model | Yes | Pre-coding gate and schema ownership decision | TASK-007 event taxonomy and TASK-008 probes | `prisma/schema.prisma`, feed lifecycle module | Define lifecycle states and persistence without changing public XML fields beyond approved scope. |
| XML validation and exclusion tests | Yes | Current feed builder behavior | TASK-003 policy integration | Feed tests and validation helpers | Prove valid XML, zero-stock exclusion, sensitive-field exclusion, and timing with synthetic data. |
| Validation evidence and docs | Yes | Gate commands available | Completion checklist | `docs/12_validation/`, `reports/validation/`, task trackers | Capture non-secret validation evidence and document deviations. |

## Blockers And Coordination

- Runtime edits require plan review/approval or a documented draft-work exception.
- `feed.service.ts`, `feed.controller.ts`, and `prisma/schema.prisma` are shared conflict points; only one agent should own each file at a time.
- TASK-003, TASK-007, and TASK-008 depend on lifecycle/status names from this plan. Publish names before downstream agents integrate.

## Files to Inspect

- `../08_roadmap/ROADMAP.md`
- `../16_operations/INTEGRATIONS.md`
- `../17_governance/PROJECT_INVARIANTS.md`
- `../services/heureka-service/src/heureka/feed/feed.service.ts`
- `../services/heureka-service/src/heureka/feed/feed.controller.ts`
- `../prisma/schema.prisma`

## Files to Create

Task-specific tests, validation reports, and contract artifacts listed by the implementation plan.

## Files to Modify

Only files named by the reviewed implementation plan.

## Files That Must Not Be Modified

Secret files, `.env`, Kubernetes manifests, protected constitution/vision documents, and unrelated service code unless the plan explicitly approves them.

## Implementation Steps

1. Re-read required context and confirm git status.
2. Define exact contract/schema/runtime change set.
3. Add synthetic tests before or alongside implementation.
4. Implement the minimal scoped change.
5. Run gates and targeted tests.
6. Update validation evidence and task status.

## Test Plan

Strict documentation audit and pre-coding gate for planning. Runtime implementation requires targeted unit/contract/replay tests and deployment-readiness evidence.

## Validation Plan

Capture command output summaries in `docs/12_validation/` or `reports/validation/` without secrets or production raw data.

## Gate Commands

```bash
python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
python3 scripts/deployment_readiness_gate.py --root . --target TASK-002
```

## Documentation Updates

Update task, execution plan, goal impact, validation report, graph, and task tracker when the implementation proceeds.

## Rollback Plan

Revert only files changed by the scoped implementation. Preserve unrelated remote worktree changes.

## Agent Handoff Prompt

Implement `TASK-002` only after reviewing this plan. Preserve Heureka feed invariants, use synthetic evidence, avoid secrets and production raw data, and report validation results.

## Completion Checklist

- [x] Implementation complete
- [x] Tests complete
- [x] Validation evidence collected
- [x] Documentation updated
- [x] Deviations documented

## Deviations

No Prisma schema migration was added in this first slice because the deployment script does not apply migrations. Validation evidence is exposed through response headers, controlled errors, latest in-process snapshots, and existing `HeurekaFeed` history rows. A future task can add persisted JSON snapshots with an explicit migration and deployment plan.
