# Heureka Service Integrations

```yaml
id: INTEGRATIONS-HEUREKA-SERVICE
status: draft
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../01_vision/VISION.md
  - ../04_systems/SYS-001-feed-generation.md
  - ../08_roadmap/ROADMAP.md
downstream:
  - ../09_milestones/MS-002-feed-publication-foundation.md
  - ../09_milestones/MS-003-catalog-feed-readiness.md
  - ../09_milestones/MS-005-stock-order-profit-feedback.md
```

## Purpose

Define ecosystem boundaries for Heureka feed work. These notes are planning contracts only until a task adds runtime integration and validation evidence.

## Boundary Rules

Catalog owns product truth. Warehouse owns stock truth. Flipflop owns submission. Orders owns order records. Payments owns settlement state. Suppliers own supplier private data. AI produces suggestions only. Heureka owns feed generation, validation evidence, feed readiness signals, and feed status.


## TASK-006 Required Read-Only Contracts

The following contracts are required before any stock/order/profit feedback runtime work can start. All contracts are read-only from the Heureka boundary and must provide synthetic examples plus owner approval before implementation.

| Owner service | Required contract | Allowed public-safe signal shape | Required determinism evidence | Current status |
|---|---|---|---|---|
| Warehouse | Stock snapshot by catalog product or offer id | `in_stock`, `available_quantity_bucket`, `stock_status_code`, `observed_at`, `snapshot_hash` | Same source snapshot produces same stock eligibility result and same zero-stock exclusion outcome | Blocked: contract unavailable |
| Flipflop | Heureka feed submission observation | `submission_id`, `feed_snapshot_hash`, `status`, `public_status_code`, `submitted_at`, `observed_at`, `idempotency_key` | Same feed snapshot and idempotency key produce one submission observation state | Blocked: contract unavailable |
| Orders | Aggregate order outcome window by product or feed snapshot | `order_count_bucket`, `return_count_bucket`, `cancellation_count_bucket`, `demand_signal_code`, `window_start`, `window_end`, `snapshot_hash` | Same aggregate window produces same demand eligibility signal | Blocked: contract unavailable |
| Payments | Aggregate settlement/risk outcome window | `settlement_signal_code`, `refund_count_bucket`, `chargeback_count_bucket`, `window_start`, `window_end`, `snapshot_hash` | Same aggregate window produces same settlement eligibility signal | Blocked: contract unavailable |
| Suppliers | Public-safe supplier availability and reliability signal | `supplier_availability_code`, `lead_time_bucket`, `reliability_tier`, `supplier_signal_hash`, `observed_at` | Same supplier signal snapshot produces same commercial eligibility result | Blocked: contract unavailable |

## TASK-006 Blockers

- `BLOCKER-TASK-006-WAREHOUSE-CONTRACT`: Warehouse read-only stock snapshot contract is not approved.
- `BLOCKER-TASK-006-FLIPFLOP-CONTRACT`: Flipflop read-only submission observation contract is not approved.
- `BLOCKER-TASK-006-ORDERS-CONTRACT`: Orders aggregate outcome contract is not approved.
- `BLOCKER-TASK-006-PAYMENTS-CONTRACT`: Payments aggregate settlement/risk contract is not approved.
- `BLOCKER-TASK-006-SUPPLIER-CONTRACT`: Supplier public-safe signal contract is not approved.
- `BLOCKER-TASK-006-MARGIN-SAFETY`: Margin eligibility may only be expressed as a redacted eligibility code or review flag; internal cost, margin, supplier terms, and private values are unavailable to Heureka artifacts.

Runtime implementation remains blocked until every required external owner approves a read-only contract and synthetic validation examples are committed.

## TASK-006 Public-Safe Eligibility Rules

- Heureka may consume external feedback only as read-only signals; it must not own orders, payments, warehouse stock truth, supplier truth, or flipflop submission truth.
- Zero-stock exclusion has priority over every growth or commercial signal.
- Public XML may contain only fields already approved for the Heureka feed contract. Feedback signals are internal eligibility inputs and must not be serialized into XML unless a later reviewed public XML contract explicitly permits them.
- Cost, margin, supplier private values, payment details, customer identifiers, raw order ids, raw transaction ids, addresses, account credentials, and production samples are forbidden in XML, prompts, tests, logs, screenshots, and reports.
- Profit feedback must reduce to public-safe outcomes such as `eligible`, `ineligible`, or `review_required`, plus redacted reason codes. Numeric margin, internal cost, negotiated supplier terms, and payment details must stay inside the owning service.
- Order and payment feedback must be aggregate and windowed. Single-customer, single-payment, or raw line-item records are not valid Heureka inputs.
- Every accepted feedback input must include an owner service name, contract version, snapshot hash, observation time, and deterministic replay key.
- When any required signal is missing, stale, unapproved, or non-deterministic, Heureka must fail closed for the feedback-driven optimization path and keep baseline feed invariants intact.

## Event Taxonomy Draft

- `heureka.feed.prepare.v1`
- `heureka.feed.validate.v1`
- `heureka.feed.generated.v1`
- `heureka.feed.invalid.v1`
- `heureka.feed.stale.v1`
- `heureka.feed.submission_status.v1`
- `heureka.product.readiness_blocked.v1`
- `heureka.product.excluded_zero_stock.v1`

All events must use synthetic examples in docs/tests and must exclude secrets, raw customer data, internal cost, margin, and supplier private values.

## TASK-010 Operation Audit Schema Adapter

Heureka defines the local non-emitting operation/audit adapter `heureka.operation.audit.v1` in
`services/heureka-service/src/heureka/operations/operation-event.schema.ts`.

The adapter maps append-only `heureka_operation_events` rows to:

- a Heureka audit envelope with `event_name`, `event_version`, `occurred_at`,
  `source_service`, `source_component`, `correlation_ref`, `idempotency_key`,
  and `schema_ref`;
- the current logging-microservice DTO shape with `level`, `message`, `service`,
  `timestamp`, optional `correlation_id`, and redacted `metadata`.

This contract does not approve runtime emission to logging-microservice. Runtime
emission remains blocked until an ecosystem-wide operation/audit schema package
and fail-soft logging client behavior are approved across channels.

## Operations Evidence

TASK-008 operations trust and scale planning evidence lives in `OPS-TASK-008-operations-trust-and-scale.md`. Alert and dashboard payloads must use aggregate counts, timing, status, age, redacted error classes, and synthetic examples only. Runtime probes remain conditional until TASK-002 publishes the lifecycle/status endpoint shape.
