# EP-TASK-005: Define AI Feed Optimization Contract

```yaml
id: EP-TASK-005
status: draft
source_task: ../11_tasks/TASK-005-define-ai-feed-optimization-contract.md
owner: Project Owner
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
vision:
  - ../01_vision/VISION.md
constitution:
  - ../00_constitution/CONSTITUTION.md
feature:
  - ../10_features/FEAT-005-ai-assisted-feed-optimization.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-005.md
```

## Metadata

Draft execution plan for `TASK-005`. This plan is not approval to change runtime behavior until reviewed.

## Upstream Traceability

Vision `../01_vision/VISION.md`, business case `../02_business_case/BUSINESS_CASE.md`, roadmap `../08_roadmap/ROADMAP.md`, feature `../10_features/FEAT-005-ai-assisted-feed-optimization.md`, task `../11_tasks/TASK-005-define-ai-feed-optimization-contract.md`, goal impact `../22_goal_impact/GOAL-IMPACT-TASK-005.md`.

## Goal Impact

Define ai-microservice suggestion contracts for feed titles, descriptions, categories, parameters, and media notes without granting AI mutation authority.

## Project Invariants

Preserve INV-001 valid XML, INV-002 zero-stock exclusion, INV-003 sub-60-second generation, INV-004 public data safety, and INV-005 secret handling.

## Sensitive-Data Handling

Classification: synthetic. Prompts, examples, tests, logs, screenshots, and reports must avoid secrets, raw production data, customer identifiers, internal cost, margin, and supplier private values.

## Contract Validation Plan

Create `../23_documentation_contracts/AI_FEED_OPTIMIZATION_CONTRACT.md` as the TASK-005 contract artifact. Validate that request/response/review examples are versioned, synthetic, redacted, and explicitly prevent direct AI mutation of public XML. Runtime implementation remains blocked until a reviewed coding plan coordinates storage/schema ownership with Agent A.

## Replay/Determinism Plan

Redaction, request hashing, idempotency keys, review-state transitions, and deterministic validation must be reproducible for a fixed input snapshot. AI-generated wording may be non-deterministic, so it must be persisted only as immutable suggestion evidence if storage is later approved. Public XML eligibility requires human approval plus deterministic validation outside AI authority.

## Scope

Suggestion request/response contract, redaction rules, review states, input snapshot hash, confidence/evidence fields, and approval path.

## Non-Goals

No autonomous public feed mutation, no raw production prompts, no unreviewed price or text changes.

## Parallel Goal Decomposition

This plan is a mostly independent contract lane and can start immediately because AI suggestions have no direct mutation authority over public XML.

- Suggestion contract lane: request/response shape, confidence, evidence, review states, and input snapshot hash.
- Redaction lane: prompt/input/output safety rules using synthetic examples only.
- Approval integration lane: waits for lifecycle/readiness review-state ownership if runtime storage is added.

## Parallel Execution Matrix

| Goal | Can start in parallel | Depends on | Blocks | Primary files | Agent handoff |
|---|---|---|---|---|---|
| Suggestion contract | Yes | AI boundary and invariants | Future AI implementation | Contract docs/tests | Define versioned synthetic request/response examples and review states. |
| Redaction and safety | Yes | Sensitive-data policy | Prompt/test approval | Safety docs/tests | Prove no raw production prompt, no secrets, and no internal commercial data. |
| Review-state integration | Conditional | TASK-002 lifecycle and TASK-004 readiness contracts | Completion | Schema/service files if approved | Do not add mutation path; suggestions require review before public feed changes. |

## Blockers And Coordination

- Human review is required before any AI-influenced public feed mutation path.
- No raw production data, secrets, supplier private values, internal margins, or customer identifiers may appear in prompts or examples.
- Runtime storage changes must coordinate with TASK-002 schema ownership.

## Files to Inspect

- `../08_roadmap/ROADMAP.md`
- `../16_operations/INTEGRATIONS.md`
- `../17_governance/PROJECT_INVARIANTS.md`
- `../services/heureka-service/src/heureka/feed/feed.service.ts`
- `../services/heureka-service/src/heureka/feed/feed.controller.ts`
- `../prisma/schema.prisma`

## Files to Create

- `../23_documentation_contracts/AI_FEED_OPTIMIZATION_CONTRACT.md`

No runtime tests or fixtures are created in this contract-only step because implementation remains blocked pending plan review and schema coordination.

## Files to Modify

- `../21_execution_plans/EP-TASK-005-define-ai-feed-optimization-contract.md`
- `../11_tasks/TASK-005-define-ai-feed-optimization-contract.md`
- `../12_validation/VAL-TASK-005.md`

Runtime files, schema files, deployment files, and secret-bearing files remain out of scope.

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

Capture command output summaries in `../12_validation/VAL-TASK-005.md` and gate JSON under `../reports/validation/` without secrets or production raw data. Contract-specific validation must check versioned schemas, locked redaction fields, AI-settable review-state limits, synthetic-only examples, no direct XML mutation authority, and storage/schema coordination blockers.

## Gate Commands

```bash
python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
python3 scripts/deployment_readiness_gate.py --root . --target TASK-005
```

## Documentation Updates

Update task, execution plan, validation report, and contract artifact for this contract-only step. Goal impact remains valid. Graph/task tracker updates should be performed by the coordinator to avoid conflicts with other parallel lanes unless explicitly assigned.

## Rollback Plan

Revert only files changed by the scoped implementation. Preserve unrelated remote worktree changes.

## Agent Handoff Prompt

Implement `TASK-005` only after reviewing this plan. Preserve Heureka feed invariants, use synthetic evidence, avoid secrets and production raw data, and report validation results.

## Completion Checklist

- [x] Contract artifact complete
- [x] Documentation-only validation complete
- [x] Validation evidence collected
- [x] Documentation updated
- [x] Deviations documented: runtime implementation, storage, schema, and public XML mutation remain blocked pending human review and Agent A coordination
