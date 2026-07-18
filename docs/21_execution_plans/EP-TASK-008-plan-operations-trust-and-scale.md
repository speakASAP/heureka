# EP-TASK-008: Plan Operations Trust And Scale

```yaml
id: EP-TASK-008
status: draft
source_task: ../11_tasks/TASK-008-plan-operations-trust-and-scale.md
owner: Project Owner
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
vision:
  - ../01_vision/VISION.md
constitution:
  - ../00_constitution/CONSTITUTION.md
feature:
  - ../10_features/FEAT-008-operations-trust-and-scale.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-008.md
```

## Metadata

Draft execution plan for `TASK-008`. This plan is not approval to change runtime behavior until reviewed.

## Upstream Traceability

Vision `../01_vision/VISION.md`, business case `../02_business_case/BUSINESS_CASE.md`, roadmap `../08_roadmap/ROADMAP.md`, feature `../10_features/FEAT-008-operations-trust-and-scale.md`, task `../11_tasks/TASK-008-plan-operations-trust-and-scale.md`, goal impact `../22_goal_impact/GOAL-IMPACT-TASK-008.md`.

## Goal Impact

Plan operational controls for feed freshness, XML endpoint smoke, generation timing, alerts, dashboards, deployment evidence, and rollback.

## Project Invariants

Preserve INV-001 valid XML, INV-002 zero-stock exclusion, INV-003 sub-60-second generation, INV-004 public data safety, and INV-005 secret handling.

## Sensitive-Data Handling

Classification: synthetic. Prompts, examples, tests, logs, screenshots, and reports must avoid secrets, raw production data, customer identifiers, internal cost, margin, and supplier private values.

## Contract Validation Plan

Create or update contracts only when explicitly listed in a later coding plan. Contract examples must be synthetic and versioned.

## Replay/Determinism Plan

Deterministic validation and readiness outputs must be reproducible for a fixed input snapshot. Idempotency keys or snapshot hashes are required for lifecycle/status/event implementation.

## Scope

Production smoke checklist, alert thresholds, stale/invalid/slow feed states, Kubernetes readiness, rollback playbooks, and scale validation.

## Non-Goals

No Kubernetes changes in planning task, no secret exposure, no media dependency until contract is approved.

## Parallel Goal Decomposition

This plan can start as an operations evidence lane while runtime probes wait for TASK-002 endpoint/status shape.

- Smoke checklist lane: feed URL, XML validity, freshness, zero-stock exclusion, and sensitive-field smoke checks.
- Alert/runbook lane: stale, invalid, slow, failed, and rollback thresholds.
- Scale evidence lane: 60-second generation evidence and dashboard requirements.

## Parallel Execution Matrix

| Goal | Can start in parallel | Depends on | Blocks | Primary files | Agent handoff |
|---|---|---|---|---|---|
| Smoke checklist | Yes | Current public feed endpoint and invariants | Deployment readiness | Operations docs/tests | Draft synthetic-safe smoke commands and expected evidence. |
| Alert and rollback runbook | Yes | Lifecycle/status vocabulary from TASK-002 for final labels | Production readiness | Operations docs | Define thresholds and rollback criteria without changing Kubernetes yet. |
| Scale evidence and dashboards | Conditional | Generation timing instrumentation | Completion | Validation reports/dashboard docs | Specify evidence needed to preserve sub-60-second generation. |

## Blockers And Coordination

- Runtime probes depend on TASK-002 lifecycle/status endpoint shape.
- No Kubernetes changes are allowed in this planning task unless a later approved implementation plan names them.
- Dashboard and alert payloads must stay redacted and secret-free.

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
python3 scripts/deployment_readiness_gate.py --root . --target TASK-008
```

## Documentation Updates

Update task, execution plan, goal impact, validation report, graph, and task tracker when the implementation proceeds.

## Rollback Plan

Revert only files changed by the scoped implementation. Preserve unrelated remote worktree changes.

## Agent Handoff Prompt

Implement `TASK-008` only after reviewing this plan. Preserve Heureka feed invariants, use synthetic evidence, avoid secrets and production raw data, and report validation results.

## Completion Checklist

- [ ] Implementation complete
- [ ] Tests complete
- [ ] Validation evidence collected
- [ ] Documentation updated
- [ ] Deviations documented

## Operations Evidence Prepared

Agent G prepared `../16_operations/OPS-TASK-008-operations-trust-and-scale.md` as documentation-only evidence for smoke checks, alert thresholds, rollback criteria, scale evidence needs, dashboard redaction rules, and conditional runtime probe blockers.

### TASK-008 Draft Outputs

| Output | Status | Evidence |
|---|---|---|
| Smoke checks | Drafted | `../16_operations/OPS-TASK-008-operations-trust-and-scale.md#smoke-checklist-draft` |
| Alert thresholds | Drafted with missing cadence marker | `../16_operations/OPS-TASK-008-operations-trust-and-scale.md#alert-threshold-draft` |
| Rollback criteria | Drafted | `../16_operations/OPS-TASK-008-operations-trust-and-scale.md#rollback-criteria` |
| Scale evidence needs | Drafted with implementation blockers | `../16_operations/OPS-TASK-008-operations-trust-and-scale.md#scale-evidence-needs` |
| Runtime probes | Blocked | `GET /feed/status?type=heureka_cz` returns `{ success, data }` with `feedType`, `status`, `latestFeedId`, `feedUrl`, `productCount`, `generatedAt`, `feedAgeSeconds`, `reason`, and `latestValidation`; XML feed responses expose `X-Heureka-Feed-Status`, `X-Heureka-Feed-Generation-Ms`, and `X-Heureka-Feed-Snapshot-Hash`; statuses are `valid`, `invalid`, `stale`, `generating`, `failed`, and `missing`; policy decisions are `persist_and_expose` and `block_publication`. |
| Kubernetes changes | Not started | Explicitly out of scope for this planning task. |

### Gate Position

This evidence does not approve runtime changes. Implementation, runtime probes, dashboard payloads, alert routing, and deployment readiness closure remain blocked until the TASK-002 lifecycle/status contract is reviewed and an approved TASK-008 implementation plan or coding prompt names exact files.
