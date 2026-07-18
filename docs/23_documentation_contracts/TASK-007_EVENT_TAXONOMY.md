# TASK-007 Event Taxonomy: Growth Analytics And Demand Loops

```yaml
id: TASK-007-EVENT-TAXONOMY
status: reconciled
owner: Project Owner
created: 2026-06-13
last_updated: 2026-06-15
data_classification: synthetic
source_task: ../11_tasks/TASK-007-plan-growth-analytics-and-demand-loops.md
execution_plan: ../21_execution_plans/EP-TASK-007-plan-growth-analytics-and-demand-loops.md
goal_impact: ../22_goal_impact/GOAL-IMPACT-TASK-007.md
sensitive_data_policy: ../23_documentation_contracts/SENSITIVE_DATA_POLICY.md
```

## Purpose

Define the reconciled redacted event taxonomy for TASK-007 so feed lifecycle, readiness, submission, demand segment, lead candidate, and digest events can be reviewed without exposing secrets, raw production records, customer identifiers, internal cost, margin, or supplier private values.

This document is contract-only. It does not approve runtime event emission, marketing writes, lead writes, schema migrations, external service writes, or production data export.

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation is preserved through:

| IPS layer | Artifact |
|---|---|
| Vision | `../01_vision/VISION.md` |
| Goal impact | `../22_goal_impact/GOAL-IMPACT-TASK-007.md` |
| System | `../04_systems/SYS-001-feed-generation.md` |
| Feature | `../10_features/FEAT-007-growth-analytics-and-demand-loops.md` |
| Task | `../11_tasks/TASK-007-plan-growth-analytics-and-demand-loops.md` |
| Execution plan | `../21_execution_plans/EP-TASK-007-plan-growth-analytics-and-demand-loops.md` |
| Coding prompt | [MISSING: reviewed TASK-007 coding prompt is not approved yet] |
| Code | [MISSING: TASK-007 runtime implementation is blocked pending contract validation and data-safety review] |
| Validation | `../12_validation/VAL-TASK-007.md` |

## Vocabulary Readiness

The following names are reconciled against the currently published TASK-002, TASK-003, and TASK-004 contracts where available. Submission and external demand names remain contract-gated.

| Vocabulary area | Current draft values | Status | Dependency |
|---|---|---|---|
| Feed lifecycle stages | `prepare`, `validate`, `persist`, `expose`, `failed` | Published | TASK-002 `FeedLifecycleStage` |
| Feed lifecycle statuses | `valid`, `invalid`, `stale`, `generating`, `failed`, `missing` | Published | TASK-002 `FeedLifecycleStatus` |
| Policy/finding codes | `XML_ENVELOPE_INVALID`, `XML_TEXT_UNESCAPED`, `ZERO_STOCK_INCLUDED`, `PRODUCT_COUNT_MISMATCH`, `GENERATION_SLA_EXCEEDED`, `SENSITIVE_FIELD_EXPOSED`, `CATALOG_FETCH_PARTIAL` | Published | TASK-003 lifecycle/policy implementation |
| Readiness blocker codes | `PRODUCT_NOT_FOUND`, `PRODUCT_INACTIVE`, `MISSING_PRODUCT_NAME`, `MISSING_DESCRIPTION`, `MISSING_CATEGORY`, `MISSING_PRIMARY_IMAGE`, `INVALID_IMAGE_URL`, `PRICE_MISSING`, `PRICE_NOT_POSITIVE`, `ZERO_STOCK`, `STOCK_UNKNOWN`, `SETTINGS_INACTIVE`, `XML_RENDER_INVALID`, `SENSITIVE_FIELD_EXPOSURE`, `GENERATION_SLA_RISK` | Published | TASK-004 readiness implementation |
| Submission outcomes | `accepted`, `rejected`, `delayed`, `unknown` | Provisional | Flipflop submission contract review |
| Demand segment names | `feed_ready_growth_candidate`, `readiness_blocker_cluster`, `stale_feed_risk`, `zero_stock_recovery_opportunity`, `submission_rejection_followup` | Draft | Contract validation and data-safety review |

Lifecycle, policy, and readiness event payload vocabularies are now aligned to TASK-002, TASK-003, and TASK-004. Submission, demand segment, digest sink, marketing, and leads vocabularies remain contract-gated.

## Common Event Envelope

All events use this redacted envelope. Examples must be synthetic or masked.

| Field | Type | Required | Redaction rule |
|---|---|---|---|
| `event_name` | string | yes | One of the versioned event names below. |
| `event_version` | string | yes | Semantic event version, initially `1.0.0`. |
| `occurred_at` | ISO-8601 string | yes | Event time; do not use raw log lines as payload. |
| `source_service` | string | yes | Constant `heureka-service`. |
| `source_component` | string | yes | Public-safe component label such as `feed_lifecycle`, `readiness`, or `analytics_digest`. |
| `environment` | string | yes | Public-safe environment label; no hostnames or cluster secrets. |
| `correlation_ref` | string | yes | Synthetic or hashed correlation reference; no request headers or session cookies. |
| `idempotency_key` | string | yes | Deterministic key derived from event name, feed type, snapshot hash, and period where applicable. |
| `snapshot_hash` | string | yes | `sha256:<hash>` over a canonical redacted snapshot. Never include raw XML, raw orders, or raw records. |
| `schema_ref` | string | yes | Contract reference, for example `TASK-007-EVENT-TAXONOMY@1.0.0`. |

## Forbidden Payload Fields

The following content is forbidden in event payloads, examples, logs, tests, reports, prompts, and screenshots:

- real customer, supplier, employee, tenant, account, order, payment, or ticket identifiers;
- real email addresses, phone numbers, addresses, session cookies, authorization headers, tokens, keys, or passwords;
- raw order exports, raw production records, raw XML feed bodies, raw operational logs, or screenshots of production systems;
- internal cost, margin, profit, wholesale, supplier private values, payment details, settlement data, or private operational notes;
- database primary keys or object IDs unless they are hashed with a documented salt policy and approved for the target sink.

Allowed examples use placeholders such as `FEED_RUN_SYNTHETIC_001`, `PRODUCT_REF_SYNTHETIC_001`, `sha256:<synthetic-hash>`, `TENANT_SYNTHETIC_001`, and URLs under `https://example.invalid/`.

## TASK-010 Operation Audit Adapter

`heureka.operation.audit.v1` is the Heureka-local operation/audit schema adapter
for durable operations history. It is non-emitting by default and exists to make
the dashboard operation evidence contract explicit while the ecosystem-wide
shared operation/audit package remains unavailable.

Required envelope fields:

| Field | Type | Required | Redaction rule |
|---|---|---|---|
| `event_name` | string | yes | Operation action name only; no raw payload data. |
| `event_version` | string | yes | `1.0.0`. |
| `occurred_at` | ISO-8601 string | yes | Durable event completion or creation time. |
| `source_service` | string | yes | Constant `heureka-service`. |
| `source_component` | string | yes | Sanitized component label. |
| `environment` | string | yes | Constant `runtime`; no hostnames. |
| `correlation_ref` | string | yes | Correlation/idempotency reference only; no headers or tokens. |
| `idempotency_key` | string | yes | Durable idempotency key or deterministic fallback. |
| `schema_ref` | string | yes | `heureka.operation.audit.v1`. |

Logging DTO projection fields:

| Field | Type | Required | Redaction rule |
|---|---|---|---|
| `level` | string | yes | Derived from status: failures -> `error`, blockers/skips -> `warn`, otherwise `info`. |
| `message` | string | yes | Redacted summary, maximum 500 characters. |
| `service` | string | yes | Constant `heureka-service`. |
| `timestamp` | ISO-8601 string | yes | Same as `occurred_at`. |
| `correlation_id` | string | no | Sanitized correlation id when present. |
| `metadata` | object | yes | Schema/action/status/durability plus redacted context only. |

Runtime emission status: `[MISSING: ecosystem-wide shared operation/audit schema package]`.

## Event Catalog

| Event name | Purpose | Producer | Consumer class | Status |
|---|---|---|---|---|
| `heureka.feed.prepare.v1` | Feed generation preparation started or completed. | Feed lifecycle | Logging/notifications | Aligned to TASK-002 lifecycle vocabulary. |
| `heureka.feed.validate.v1` | Validation snapshot produced for a generated feed. | Feed lifecycle / policy | Logging/notifications, analytics | Aligned to TASK-002/TASK-003 lifecycle and policy vocabulary. |
| `heureka.feed.generated.v1` | Public-safe feed artifact generated and ready for exposure. | Feed lifecycle | Logging/notifications, analytics | Aligned to TASK-002 lifecycle vocabulary. |
| `heureka.feed.invalid.v1` | Feed failed validation and must not be served or submitted. | Feed lifecycle / policy | Logging/notifications, analytics | Aligned to TASK-002/TASK-003 lifecycle and policy vocabulary. |
| `heureka.feed.stale.v1` | Latest feed exceeded freshness threshold. | Feed lifecycle | Logging/notifications, analytics | Aligned to TASK-002 status vocabulary. |
| `heureka.feed.submission_status.v1` | Flipflop submission result or handoff status recorded. | Submission integration | Logging/notifications, analytics | Contract-gated. |
| `heureka.product.readiness_blocked.v1` | Product or aggregate product set has readiness blockers. | Readiness | Catalog, analytics | Aligned to TASK-004 readiness vocabulary. |
| `heureka.product.excluded_zero_stock.v1` | Zero-stock exclusion counted for feed safety. | Feed lifecycle/readiness | Analytics | Aligned to TASK-003/TASK-004 zero-stock vocabulary. |
| `heureka.demand.segment_candidate.v1` | Public-safe aggregate demand segment candidate produced. | Analytics | Leads/marketing after review | Blocked from writes. |
| `heureka.digest.marketplace_daily.v1` | Daily public-safe digest of feed health and demand signals. | Analytics digest | Operators, dashboards | Blocked until validation. |

## Payload Schemas

### `heureka.feed.prepare.v1`

```yaml
data:
  feed_type: heureka_cz | heureka_sk
  lifecycle_stage: prepare
  lifecycle_status: generating
  feed_run_ref: FEED_RUN_SYNTHETIC_001
  requested_by: system
  input_snapshot_hash: sha256:<synthetic-hash>
  planned_checks:
    - xml_envelope
    - zero_stock_exclusion
    - sensitive_field_scan
    - generation_timing
```

Redaction: no request headers, raw catalog rows, raw product records, tenant IDs, or operator identifiers.

### `heureka.feed.validate.v1`

```yaml
data:
  feed_type: heureka_cz | heureka_sk
  lifecycle_stage: validate
  lifecycle_status: valid | invalid
  feed_run_ref: FEED_RUN_SYNTHETIC_001
  validation_snapshot_hash: sha256:<synthetic-hash>
  generation_ms: 250
  included_product_count: 120
  zero_stock_excluded_count: 8
  failed_fetch_count: 0
  checks:
    valid_xml_envelope: true
    escaped_xml_text: true
    zero_stock_excluded: true
    generation_within_sla: true
    sensitive_fields_excluded: true
  policy_result_codes: []
```

Redaction: counts and booleans only; do not include raw XML, item names, supplier names, internal prices, cost, margin, or raw validation logs.

### `heureka.feed.generated.v1`

```yaml
data:
  feed_type: heureka_cz | heureka_sk
  lifecycle_stage: expose
  lifecycle_status: valid
  feed_run_ref: FEED_RUN_SYNTHETIC_001
  feed_snapshot_hash: sha256:<synthetic-hash>
  feed_url_ref: https://example.invalid/heureka/feed.xml
  product_count: 120
  generated_at: 2026-06-13T10:00:00Z
```

Redaction: feed URL examples must use `example.invalid`; production URLs require sink approval and must not include secret query strings.

### `heureka.feed.invalid.v1`

```yaml
data:
  feed_type: heureka_cz | heureka_sk
  lifecycle_stage: failed
  lifecycle_status: invalid
  feed_run_ref: FEED_RUN_SYNTHETIC_001
  validation_snapshot_hash: sha256:<synthetic-hash>
  policy_result_codes:
    - XML_ENVELOPE_INVALID
  severity: error
  remediation_keys:
    - feed.xml.envelope.fix
```

Redaction: use policy codes and remediation keys, not raw exception stack traces or raw XML snippets.

### `heureka.feed.stale.v1`

```yaml
data:
  feed_type: heureka_cz | heureka_sk
  lifecycle_status: stale
  latest_feed_snapshot_hash: sha256:<synthetic-hash>
  feed_age_seconds: 3900
  freshness_threshold_seconds: 3600
  product_count: 120
```

Redaction: aggregate status only; no server hostnames, pod names, raw logs, or operational secrets.

### `heureka.feed.submission_status.v1`

```yaml
data:
  feed_type: heureka_cz | heureka_sk
  submission_ref_hash: sha256:<synthetic-hash>
  submission_target: flipflop-service
  submission_outcome: accepted | rejected | delayed | unknown
  submitted_snapshot_hash: sha256:<synthetic-hash>
  submitted_product_count: 120
  rejection_code: feed_xml_invalid
  retryable: false
```

Redaction: no raw response payloads, partner credentials, URLs with credentials, or account identifiers. Runtime use is blocked until the flipflop contract is reviewed.

### `heureka.product.readiness_blocked.v1`

```yaml
data:
  feed_type: heureka_cz | heureka_sk
  readiness_scope: single_product | aggregate
  product_ref_hash: sha256:<synthetic-hash>
  blocked_count: 1
  blocker_codes:
    - MISSING_CATEGORY
  owner_service: catalog-service
  remediation_keys:
    - catalog.category.map_for_heureka
  readiness_snapshot_hash: sha256:<synthetic-hash>
```

Redaction: use hashed product references or aggregate counts; no raw SKU, product database ID, supplier name, customer data, cost, margin, or private notes. `product_ref_hash` is omitted for aggregate events.

### `heureka.product.excluded_zero_stock.v1`

```yaml
data:
  feed_type: heureka_cz | heureka_sk
  exclusion_reason: zero_stock
  excluded_count: 8
  stock_snapshot_hash: sha256:<synthetic-hash>
  owner_service: warehouse-microservice
  readiness_snapshot_hash: sha256:<synthetic-hash>
```

Redaction: aggregate counts only; no warehouse private records, reservation data, supplier records, or product-level stock traces.

### `heureka.demand.segment_candidate.v1`

```yaml
data:
  segment_name: feed_ready_growth_candidate | readiness_blocker_cluster | stale_feed_risk | zero_stock_recovery_opportunity | submission_rejection_followup
  segment_version: 1.0.0
  aggregation_window: P1D
  feed_type: heureka_cz | heureka_sk
  aggregate_count: 42
  confidence_level: low | medium | high
  evidence_snapshot_hashes:
    - sha256:<synthetic-hash>
  write_allowed: false
```

Redaction: aggregate only. No lead/customer identifiers, order exports, raw conversion events, internal margin, supplier private values, or marketing platform IDs. `write_allowed` remains `false` until contract validation and data-safety review pass.

### `heureka.digest.marketplace_daily.v1`

```yaml
data:
  digest_date: 2026-06-13
  feed_type: heureka_cz | heureka_sk
  generated_feed_count: 2
  invalid_feed_count: 0
  stale_feed_count: 1
  readiness_blocked_count: 12
  zero_stock_excluded_count: 8
  submission_rejected_count: 0
  segment_candidate_count: 3
  digest_snapshot_hash: sha256:<synthetic-hash>
```

Redaction: daily aggregate only; no raw orders, customer records, raw feed XML, private business values, or per-user identifiers.

## Idempotency And Replay

- Each event idempotency key must be deterministic for a fixed redacted input snapshot.
- Replaying the same snapshot and event version must produce the same event name, event payload, idempotency key, and snapshot hash.
- Analytics segments and digests must declare aggregation windows and derive only from redacted event streams or approved aggregate contracts.
- Non-deterministic AI suggestions must not be used as event source truth unless persisted as reviewed suggestion evidence under TASK-005 controls.

## Contract Validation Requirements

Before runtime implementation, TASK-007 must add or update validation that proves:

- event schemas reject forbidden field names and raw payload content;
- examples are synthetic and contain no secrets, raw production records, customer identifiers, internal cost, margin, or supplier private values;
- idempotency keys and snapshot hashes are stable for fixed synthetic input;
- marketing and leads writes remain disabled until contract validation and data-safety review pass;
- lifecycle/status names remain aligned with TASK-002 and blocker vocabulary remains aligned with TASK-003/TASK-004 before any runtime emission.

## Parallel Execution

| Workstream | Status | Scope | Shared contract |
|---|---|---|---|
| Event taxonomy draft | Ready now | This document and validation report only. | Common event envelope and event catalog. |
| Payload safety | Ready now | Redaction rules, forbidden fields, synthetic examples. | Sensitive-data policy. |
| Lifecycle alignment | Completed for documentation | Uses TASK-002 lifecycle/status names. | TASK-002 lifecycle/status names. |
| Policy/readiness alignment | Completed for documentation | Uses TASK-003 policy/finding codes and TASK-004 readiness blocker codes. | TASK-003/TASK-004 blocker vocabulary. |
| Demand segment writes | Blocked | Leads/marketing writes and external sink integration. | Contract validation plus data-safety review. |
| Final integration | Final integration | Runtime emission, sink routing, replay tests, deployment readiness. | Integration owner must reconcile all above contracts. |

Integration owner: [MISSING: TASK-007 runtime integration owner not assigned].  
Validation owner: [MISSING: TASK-007 validation owner not assigned].  
Merge order: lifecycle/status contract, policy/readiness vocabulary, payload validation, event emission, analytics digest, external sink writes.

## Blocked Items

- Marketing and leads writes are blocked until contract validation and data-safety review pass.
- Submission status payloads are blocked until the flipflop submission contract is reviewed.
- Runtime event emission is blocked until a reviewed TASK-007 coding prompt exists and gates pass.
