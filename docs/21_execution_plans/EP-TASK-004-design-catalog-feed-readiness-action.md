# EP-TASK-004: Design Catalog Feed Readiness Action

```yaml
id: EP-TASK-004
status: validated
source_task: ../11_tasks/TASK-004-design-catalog-feed-readiness-action.md
owner: Project Owner
created: 2026-06-13
last_updated: 2026-06-15
completeness_level: complete
vision:
  - ../01_vision/VISION.md
constitution:
  - ../00_constitution/CONSTITUTION.md
feature:
  - ../10_features/FEAT-004-catalog-feed-readiness-action.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-004.md
```

## Metadata

Validated execution plan for `TASK-004`. Runtime work proceeded after TASK-003 published stable policy vocabulary and this thread owned the shared feed controller/service edits.

## Upstream Traceability

Vision `../01_vision/VISION.md`, business case `../02_business_case/BUSINESS_CASE.md`, roadmap `../08_roadmap/ROADMAP.md`, feature `../10_features/FEAT-004-catalog-feed-readiness-action.md`, task `../11_tasks/TASK-004-design-catalog-feed-readiness-action.md`, goal impact `../22_goal_impact/GOAL-IMPACT-TASK-004.md`.

## Goal Impact

Design the catalog-facing dry-run/readiness contract that explains why products can or cannot enter the Heureka feed.

## Project Invariants

Preserve INV-001 valid XML, INV-002 zero-stock exclusion, INV-003 sub-60-second generation, INV-004 public data safety, and INV-005 secret handling.

## Sensitive-Data Handling

Classification: synthetic. Prompts, examples, tests, logs, screenshots, and reports must avoid secrets, raw production data, customer identifiers, internal cost, margin, and supplier private values.

## Contract Validation Plan

Create or update contracts only when explicitly listed in a later coding plan. Contract examples must be synthetic and versioned.

## Replay/Determinism Plan

Deterministic validation and readiness outputs must be reproducible for a fixed input snapshot. Idempotency keys or snapshot hashes are required for lifecycle/status/event implementation.

## Scope

Single-product and bulk readiness, missing fields, category/media/price/stock blockers, owner service, and remediation hints.

## Non-Goals

No direct product editing in catalog, no automatic feed inclusion, no runtime write to external services.

## Parallel Goal Decomposition

This plan started as a contract/readiness lane while TASK-002 and TASK-003 stabilized runtime and policy details. The final runtime slice was integrated serially in this thread to avoid shared controller/service conflicts.

- Contract lane: request/response shape for single-product and bulk readiness.
- Blocker mapping lane: missing field, category, media, price, and stock blockers mapped to owner service and remediation.
- Runtime endpoint lane: waits for policy vocabulary and shared file ownership.

## Parallel Execution Matrix

| Goal | Can start in parallel | Depends on | Blocks | Primary files | Agent handoff |
|---|---|---|---|---|---|
| Readiness contract | Completed | Catalog boundary and invariants | Catalog/client integration | `docs/23_documentation_contracts/CATALOG_FEED_READINESS_CONTRACT.md` | Synthetic examples and no catalog mutation authority are defined. |
| Blocker mapping | Completed | TASK-003 vocabulary | TASK-007 analytics payloads | `feed-readiness.ts`, validation examples | Every blocker maps to owner service, remediation hint, and public-safe reason. |
| Runtime endpoint | Completed | TASK-002/TASK-003 interfaces | Completion | `feed.controller.ts`, `feed.service.ts` | Endpoint added after policy vocabulary stabilized and file ownership stayed in this thread. |

## Blockers And Coordination

- TASK-003 policy result vocabulary is stable enough for TASK-004 readiness.
- Heureka remains a readiness/feed owner only and does not perform product edits.
- Shared controller/service edits were owned by this TASK-004 implementation thread.

## Files to Inspect

- `../08_roadmap/ROADMAP.md`
- `../16_operations/INTEGRATIONS.md`
- `../17_governance/PROJECT_INVARIANTS.md`
- `../services/heureka-service/src/heureka/feed/feed.service.ts`
- `../services/heureka-service/src/heureka/feed/feed.controller.ts`
- `../prisma/schema.prisma`

## Files to Create

- `../services/heureka-service/src/heureka/feed/feed-readiness.ts`
- `../services/heureka-service/src/heureka/feed/feed-readiness.self-test.ts`

## Files to Modify

- `../services/heureka-service/src/heureka/feed/feed.service.ts`
- `../services/heureka-service/src/heureka/feed/feed.controller.ts`
- `../11_tasks/TASK-004-design-catalog-feed-readiness-action.md`
- `../21_execution_plans/EP-TASK-004-design-catalog-feed-readiness-action.md`
- `../23_documentation_contracts/CATALOG_FEED_READINESS_CONTRACT.md`
- `../12_validation/VAL-TASK-004.md`

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
python3 scripts/deployment_readiness_gate.py --root . --target TASK-004
```

## Documentation Updates

Task, execution plan, readiness contract, and validation report were updated. Goal-impact trace already points to this task and validation report.

## Rollback Plan

Revert only files changed by the scoped implementation. Preserve unrelated remote worktree changes.

## Agent Handoff Prompt

`TASK-004` implementation is complete. Preserve Heureka feed invariants, use synthetic evidence, avoid secrets and production raw data, and report validation results.

## Completion Checklist

- [x] Implementation complete
- [x] Tests complete
- [x] Validation evidence collected
- [x] Documentation updated
- [x] Deviations documented

## Deviations

The runtime endpoint is read-only and advisory. It does not persist readiness snapshots, publish feeds, include products, or mutate catalog/price/media/stock data. Bulk readiness preserves the submitted product-id order after trimming empty ids, including repeated ids, so replay output matches the fixed request list.
