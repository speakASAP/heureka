# Plan: heureka-service
> Coordinator-managed. Reflects current execution cycle. Planning must maximize safe parallel execution across separate sessions and agents while preserving IPS traceability.

## Active plan

Coordinator integration on 2026-06-15 accepted `TASK-004` as a read-only catalog feed readiness runtime slice and recorded `TASK-005`/`TASK-006` review outcomes. The next available work is taxonomy and operations preparation that does not mutate public XML or external systems.


## Published Runtime Contracts

| Source task | Contract | Published shape | Downstream consumers |
|---|---|---|---|
| TASK-002 | Governed feed lifecycle/status | `GET /feed/status?type=heureka_cz` returns `{ success, data }` with `feedType`, `status`, `latestFeedId`, `feedUrl`, `productCount`, `generatedAt`, `feedAgeSeconds`, `reason`, and `latestValidation`. XML feed responses expose `X-Heureka-Feed-Status`, `X-Heureka-Feed-Generation-Ms`, and `X-Heureka-Feed-Snapshot-Hash`. Statuses are `valid`, `invalid`, `stale`, `generating`, `failed`, and `missing`. Policy decisions are `persist_and_expose` and `block_publication`. | TASK-004, TASK-007, TASK-008 |

## Processed Planning Lanes

| Task | Current state | Evidence | Remaining gate |
|---|---|---|---|
| TASK-004 catalog feed readiness action | Implemented and validated | `23_documentation_contracts/CATALOG_FEED_READINESS_CONTRACT.md`, `12_validation/VAL-TASK-004.md`, `services/heureka-service/src/heureka/feed/feed-readiness.ts` | Read-only single-product and bulk readiness endpoints are available; future persistence/events require new approval. |
| TASK-005 AI feed optimization contract | Contract-defined, runtime-blocked | `23_documentation_contracts/AI_FEED_OPTIMIZATION_CONTRACT.md`, `12_validation/VAL-TASK-005.md` | Human review must approve any AI-influenced mutation path; schema/storage ownership must be assigned before coding. |
| TASK-006 stock/order/profit feedback loop | Boundary-prepared, external-contract-blocked | `16_operations/INTEGRATIONS.md`, `12_validation/VAL-TASK-006.md` | Warehouse, flipflop, orders, payments, and supplier owners must approve read-only contracts with redaction/replay rules. |
| TASK-007 growth analytics and demand loops | Event-taxonomy reconciled, runtime-blocked | `23_documentation_contracts/TASK-007_EVENT_TAXONOMY.md`, `12_validation/VAL-TASK-007.md` | Add contract tests and reviewed coding prompt before runtime emission or marketing/leads writes. |
| TASK-008 operations trust and scale | Operations evidence drafted, runtime-blocked | `16_operations/OPS-TASK-008-operations-trust-and-scale.md`, `12_validation/VAL-TASK-008.md` | Approve probe cadence, rollback procedure, synthetic scale dataset sizes, and implementation prompt before runtime probes. |

## Next Goal Queue

| Order | Goal | Owner role | Parallel status | Allowed files | Forbidden files | Validation evidence | Handoff notes |
|---|---|---|---|---|---|---|---|
| 2 | Review `TASK-005` AI suggestion contract for human-review and storage boundaries. | AI/data-safety reviewer | Ready now and independent of TASK-004 runtime coding | `23_documentation_contracts/AI_FEED_OPTIMIZATION_CONTRACT.md`, `21_execution_plans/EP-TASK-005-define-ai-feed-optimization-contract.md`, `12_validation/VAL-TASK-005.md` | Public XML mutation paths, schemas, runtime services, production prompts | Contract marker checks plus gate rerun for TASK-005 | Keep AI output advisory only unless a later owner-approved prompt names schema and review-state files. |
| 3 | Resolve `TASK-006` external read-only contract blockers. | External service owners | Ready for review, dependency-gated for implementation | `16_operations/INTEGRATIONS.md`, `21_execution_plans/EP-TASK-006-plan-stock-order-profit-feedback-loop.md`, `12_validation/VAL-TASK-006.md` | Public XML, order/payment/supplier raw data, secrets, runtime code | Owner-approved synthetic examples, replay keys, redaction checks | No runtime implementation until every required source contract is approved or explicitly deferred. |
| 5 | Convert `TASK-008` operations evidence into an implementation prompt. | Operations/integration owner | Dependency-gated on approved cadence and rollback procedure | `16_operations/OPS-TASK-008-operations-trust-and-scale.md`, `21_execution_plans/EP-TASK-008-plan-operations-trust-and-scale.md`, `12_validation/VAL-TASK-008.md` | Kubernetes, deployment scripts, secrets, runtime probes until prompt approval | Smoke checklist, alert payload fixture scan, scale timing evidence | Exact rollback command, public target URL, cadence, and synthetic dataset sizes are still missing. |

## Parallel Execution Section

- Completed: `TASK-004` readiness implementation is integrated; `TASK-005` and `TASK-006` review outcomes are recorded as runtime-blocked for implementation.
- Completed: `TASK-007` taxonomy reconciliation is documented against TASK-002/TASK-003/TASK-004 vocabularies; runtime event emission remains blocked.
- Dependency-gated: `TASK-008` runtime probe implementation waits for approved public target URL, cadence, rollback procedure, and synthetic scale dataset sizes.
- Final integration: one integration owner must serialize edits to `services/heureka-service/src/heureka/feed/feed.controller.ts`, `services/heureka-service/src/heureka/feed/feed.service.ts`, `prisma/schema.prisma`, and shared status/validation report files.
- Merge order: TASK-004 readiness implementation first, TASK-007 taxonomy reconciliation next, TASK-005 storage/review-state only after human approval, TASK-008 probes after cadence/rollback approval, TASK-006 feedback loop last unless external contracts arrive earlier.

## Current Blockers

- No active human-managed goal is listed in `GOALS.md`; agents must not edit that file.
- Execution plans for `TASK-005` through `TASK-008` remain draft or review-only; draft plans are not approval to code runtime behavior.
- Shared runtime files remain conflict points for future endpoint work: `services/heureka-service/src/heureka/feed/feed.service.ts`, `services/heureka-service/src/heureka/feed/feed.controller.ts`, and `prisma/schema.prisma`.
- External-service integrations are blocked until read-only ownership boundaries and data-safety rules are explicit.
- TASK-008 still has `[MISSING: ...]` and `[UNKNOWN: ...]` markers for rollback command, public target URL, cadence, synthetic dataset sizes, and submission evidence contract.

## Scope

The next cycle is review and integration preparation. Runtime changes must wait for approved execution plans, named file ownership, synthetic tests, and validation evidence that preserves TASK-002 lifecycle behavior and TASK-003 policy vocabulary.

## Last completed

TASK-007 event taxonomy reconciliation.
