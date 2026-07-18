# EP-TASK-007: Plan Growth Analytics And Demand Loops

```yaml
id: EP-TASK-007
status: draft
source_task: ../11_tasks/TASK-007-plan-growth-analytics-and-demand-loops.md
owner: Project Owner
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
vision:
  - ../01_vision/VISION.md
constitution:
  - ../00_constitution/CONSTITUTION.md
feature:
  - ../10_features/FEAT-007-growth-analytics-and-demand-loops.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-007.md
```

## Metadata

Draft execution plan for `TASK-007`. This plan is not approval to change runtime behavior until reviewed.

## Upstream Traceability

Vision `../01_vision/VISION.md`, business case `../02_business_case/BUSINESS_CASE.md`, roadmap `../08_roadmap/ROADMAP.md`, feature `../10_features/FEAT-007-growth-analytics-and-demand-loops.md`, task `../11_tasks/TASK-007-plan-growth-analytics-and-demand-loops.md`, goal impact `../22_goal_impact/GOAL-IMPACT-TASK-007.md`.

## Goal Impact

Define redacted feed lifecycle, readiness, submission, leads, marketing, and digest events that turn Heureka operations into demand intelligence.

## Project Invariants

Preserve INV-001 valid XML, INV-002 zero-stock exclusion, INV-003 sub-60-second generation, INV-004 public data safety, and INV-005 secret handling.

## Sensitive-Data Handling

Classification: synthetic. Prompts, examples, tests, logs, screenshots, and reports must avoid secrets, raw production data, customer identifiers, internal cost, margin, and supplier private values.

## Contract Validation Plan

Create or update contracts only when explicitly listed in a later coding plan. Contract examples must be synthetic and versioned.

## Replay/Determinism Plan

Deterministic validation and readiness outputs must be reproducible for a fixed input snapshot. Idempotency keys or snapshot hashes are required for lifecycle/status/event implementation.

## Scope

Versioned event taxonomy, redaction rules, demand segments, digest metrics, and replay/idempotency expectations.

## Non-Goals

No raw PII, no raw order exports, no production marketing writes until contracts are validated.

## Parallel Goal Decomposition

This plan can start as a redacted event-taxonomy lane while lifecycle, policy, and readiness names stabilize.

- Event taxonomy lane: feed lifecycle, validation, readiness, submission, and stale/failed event names.
- Payload safety lane: redaction, versioning, and forbidden data checks.
- Digest/segment lane: aggregate metrics and demand segments after upstream vocabulary alignment.

## Parallel Execution Matrix

| Goal | Can start in parallel | Depends on | Blocks | Primary files | Agent handoff |
|---|---|---|---|---|---|
| Event taxonomy draft | Yes | Roadmap and invariants | Logging/marketing integration | Event docs/contracts | Draft names and versions; mark lifecycle/policy names provisional until TASK-002/TASK-003 align. |
| Payload safety | Yes | Sensitive-data policy | Validation approval | Contract tests/examples | Define redacted payload schemas with no PII, raw orders, secrets, or internal commercial data. |
| Demand segments and digest metrics | Conditional | TASK-004 readiness blockers and TASK-006 aggregate outcomes | Completion | Analytics docs/tests | Use only aggregate public-safe signals and document blocked fields. |

## Blockers And Coordination

- Final event names depend on TASK-002 lifecycle/status and TASK-003/TASK-004 blocker vocabulary.
- No raw PII, raw order exports, secrets, or customer identifiers may be used.
- Marketing/leads writes are blocked until contract validation and data-safety review pass.

## Files to Inspect

- `../08_roadmap/ROADMAP.md`
- `../16_operations/INTEGRATIONS.md`
- `../17_governance/PROJECT_INVARIANTS.md`
- `../services/heureka-service/src/heureka/feed/feed.service.ts`
- `../services/heureka-service/src/heureka/feed/feed.controller.ts`
- `../prisma/schema.prisma`

## Files to Create

Task-specific tests, validation reports, and contract artifacts listed by the implementation plan.

Planning-scope contract artifact created by Agent F:

- `../23_documentation_contracts/TASK-007_EVENT_TAXONOMY.md`

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

Capture command output summaries in `docs/12_validation/` or `reports/validation/` without secrets or production raw data. Event taxonomy validation must prove synthetic examples, forbidden-field exclusion, deterministic idempotency keys, snapshot-hash replay stability, and blocked marketing/leads writes before runtime implementation.

## Gate Commands

```bash
python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
python3 scripts/deployment_readiness_gate.py --root . --target TASK-007
```

## Documentation Updates

Update task, execution plan, goal impact, validation report, graph, and task tracker when the implementation proceeds.

## Rollback Plan

Revert only files changed by the scoped implementation. Preserve unrelated remote worktree changes.

## Agent Handoff Prompt

Implement `TASK-007` only after reviewing this plan. Preserve Heureka feed invariants, use synthetic evidence, avoid secrets and production raw data, and report validation results.

## Completion Checklist

- [ ] Implementation complete
- [ ] Tests complete
- [ ] Validation evidence collected
- [ ] Documentation updated
- [ ] Deviations documented
