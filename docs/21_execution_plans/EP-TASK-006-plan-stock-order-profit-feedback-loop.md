# EP-TASK-006: Plan Stock Order Profit Feedback Loop

```yaml
id: EP-TASK-006
status: draft
source_task: ../11_tasks/TASK-006-plan-stock-order-profit-feedback-loop.md
owner: Project Owner
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
vision:
  - ../01_vision/VISION.md
constitution:
  - ../00_constitution/CONSTITUTION.md
feature:
  - ../10_features/FEAT-006-stock-order-profit-feedback-loop.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-006.md
```

## Metadata

Draft execution plan for `TASK-006`. This plan is not approval to change runtime behavior until reviewed.

## Upstream Traceability

Vision `../01_vision/VISION.md`, business case `../02_business_case/BUSINESS_CASE.md`, roadmap `../08_roadmap/ROADMAP.md`, feature `../10_features/FEAT-006-stock-order-profit-feedback-loop.md`, task `../11_tasks/TASK-006-plan-stock-order-profit-feedback-loop.md`, goal impact `../22_goal_impact/GOAL-IMPACT-TASK-006.md`.

## Goal Impact

Plan stock, flipflop submission, order, payment, supplier, and margin feedback so feed inclusion stays fresh and commercially safe.

## Project Invariants

Preserve INV-001 valid XML, INV-002 zero-stock exclusion, INV-003 sub-60-second generation, INV-004 public data safety, and INV-005 secret handling.

## Sensitive-Data Handling

Classification: synthetic. Prompts, examples, tests, logs, screenshots, and reports must avoid secrets, raw production data, customer identifiers, internal cost, margin, and supplier private values.

## Contract Validation Plan

Create or update runtime contracts only when explicitly listed in a later reviewed coding plan. For TASK-006 boundary preparation, the required read-only contracts are documented in `../16_operations/INTEGRATIONS.md` and must be approved by external owners before implementation.

| Contract | Owner | Required before runtime | Current result |
|---|---|---|---|
| Warehouse stock snapshot | Warehouse | Public-safe stock status, freshness timestamp, snapshot hash, deterministic replay key | Blocked: unavailable |
| Flipflop submission observation | Flipflop | Submission status, feed snapshot hash, public status code, idempotency key | Blocked: unavailable |
| Order aggregate outcome window | Orders | Windowed demand/cancellation/return buckets without customer or raw order identifiers | Blocked: unavailable |
| Payment aggregate settlement window | Payments | Settlement/refund/risk code buckets without payment details or transaction identifiers | Blocked: unavailable |
| Supplier public-safe signal | Suppliers | Availability, lead-time bucket, reliability tier, and redacted eligibility signal | Blocked: unavailable |

Synthetic contract examples and owner approval are required before any schema, API, event, prompt, or feed behavior change.

## Replay/Determinism Plan

Deterministic validation and readiness outputs must be reproducible for a fixed input snapshot. TASK-006 feedback inputs must include contract version, owner service, observation timestamp, snapshot hash, and replay/idempotency key. For a fixed set of warehouse, flipflop, order, payment, and supplier snapshots, Heureka must produce the same eligibility result, blocker code, and redacted status event. Missing, stale, unapproved, or non-deterministic signals must fail closed for feedback optimization while preserving baseline feed generation invariants.

## Scope

Stock drift, submission status, order outcome aggregates, read-only payment/supplier contracts, margin eligibility signals, and idempotency plan.

## Non-Goals

No local order/payment/supplier ownership, no internal values in public XML, no production writes before contracts are approved.

## Parallel Goal Decomposition

This plan can start as integration discovery in parallel, while runtime implementation waits for approved external read-only contracts.

- Stock/submission lane: stock freshness and flipflop submission outcome boundaries.
- Order/payment/supplier lane: read-only eligibility and aggregate outcome boundary discovery.
- Margin-safety lane: public-safe eligibility signals without exposing private commercial data.

## Parallel Execution Matrix

| Goal | Can start in parallel | Depends on | Blocks | Primary files | Agent handoff |
|---|---|---|---|---|---|
| Stock and submission boundaries | Yes | Warehouse and flipflop contracts | Runtime feedback loop | Integration docs/contracts | List read-only inputs, freshness evidence, idempotency keys, and unavailable contracts. |
| Order/payment/supplier boundaries | Yes for discovery | External service contract approval | Profit feedback implementation | Integration docs/contracts | Keep signals aggregate/read-only and mark unavailable contracts as blockers. |
| Margin-safety rules | Yes | Sensitive-data policy | Feed eligibility rules | Validation docs/tests | Define public-safe eligibility without internal cost, margin, supplier private values, or customer data. |

## Blockers And Coordination

- Runtime implementation is blocked until read-only external contracts are approved.
- Required unavailable contracts: warehouse stock snapshot, flipflop submission observation, order aggregate outcome window, payment aggregate settlement window, and supplier public-safe signal.
- Internal cost, margin, supplier private values, payment details, transaction identifiers, raw order identifiers, and customer identifiers must not enter public XML, prompts, tests, logs, screenshots, or reports.
- Margin/profit feedback may only leave the owning service as `eligible`, `ineligible`, or `review_required` plus redacted reason codes.
- Downstream analytics should consume redacted aggregate outcomes only after payload contracts are versioned.

## Files to Inspect

- `../08_roadmap/ROADMAP.md`
- `../16_operations/INTEGRATIONS.md`
- `../17_governance/PROJECT_INVARIANTS.md`
- `../services/heureka-service/src/heureka/feed/feed.service.ts`
- `../services/heureka-service/src/heureka/feed/feed.controller.ts`
- `../prisma/schema.prisma`

## Files to Create

Task-specific tests, validation reports, and contract artifacts listed by the implementation plan. Boundary preparation updates `../12_validation/VAL-TASK-006.md` with blocked validation evidence; no runtime contract artifact is created until external contracts are approved.

## Files to Modify

Only files named by the reviewed implementation plan.

## Files That Must Not Be Modified

Secret files, `.env`, Kubernetes manifests, protected constitution/vision documents, and unrelated service code unless the plan explicitly approves them.

## Implementation Steps

1. Re-read required context and confirm git status.
2. Define exact contract/schema/runtime change set.
3. For boundary preparation, document required read-only contracts, blockers, public-safe eligibility rules, and validation evidence without runtime edits.
4. Add synthetic tests before or alongside implementation after external contracts are approved.
5. Implement the minimal scoped change only after plan review and contract approval.
6. Run gates and targeted tests.
7. Update validation evidence and task status.

## Test Plan

Strict documentation audit and pre-coding gate for planning. Runtime implementation requires targeted unit/contract/replay tests and deployment-readiness evidence.

## Validation Plan

Capture command output summaries in `docs/12_validation/` or `reports/validation/` without secrets or production raw data.

## Gate Commands

```bash
python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
python3 scripts/deployment_readiness_gate.py --root . --target TASK-006
```

## Documentation Updates

Update task, execution plan, goal impact, validation report, graph, and task tracker when the implementation proceeds.

## Rollback Plan

Revert only files changed by the scoped implementation. Preserve unrelated remote worktree changes.

## Agent Handoff Prompt

Implement `TASK-006` only after reviewing this plan. Preserve Heureka feed invariants, use synthetic evidence, avoid secrets and production raw data, and report validation results.

## Completion Checklist

- [ ] Implementation complete
- [ ] Tests complete
- [ ] Validation evidence collected
- [ ] Documentation updated
- [ ] Deviations documented
