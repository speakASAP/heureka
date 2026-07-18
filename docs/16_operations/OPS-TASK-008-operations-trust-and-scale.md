# OPS-TASK-008: Operations Trust And Scale Evidence

```yaml
id: OPS-TASK-008
status: draft
owner: Agent G
created: 2026-06-13
last_updated: 2026-06-13
classification: synthetic
upstream:
  - ../01_vision/VISION.md
  - ../22_goal_impact/GOAL-IMPACT-TASK-008.md
  - ../04_systems/SYS-001-feed-generation.md
  - ../10_features/FEAT-008-operations-trust-and-scale.md
  - ../11_tasks/TASK-008-plan-operations-trust-and-scale.md
  - ../21_execution_plans/EP-TASK-008-plan-operations-trust-and-scale.md
downstream:
  - ../12_validation/VAL-TASK-008.md
```

## Purpose

Define the operations evidence needed for TASK-008 before runtime implementation. This artifact is documentation-only and does not approve Kubernetes, schema, or service changes.

## Intent Preservation Chain

| Chain step | TASK-008 evidence |
|---|---|
| Vision | Preserve valid, public-safe Heureka feed generation while enabling marketplace growth. |
| Goal Impact | `../22_goal_impact/GOAL-IMPACT-TASK-008.md` requires reviewed execution evidence before closure. |
| System | `../04_systems/SYS-001-feed-generation.md` owns public XML feed generation and status output only. |
| Feature | `../10_features/FEAT-008-operations-trust-and-scale.md` plans observable, alertable, recoverable operations. |
| Task | `../11_tasks/TASK-008-plan-operations-trust-and-scale.md` scopes smoke checks, alerts, dashboards, rollback, and scale validation. |
| Execution Plan | `../21_execution_plans/EP-TASK-008-plan-operations-trust-and-scale.md` keeps runtime probes conditional on TASK-002. |
| Coding Prompt | [MISSING: approved TASK-008 implementation prompt after TASK-002 lifecycle/status shape is published]. |
| Code | [MISSING: approved runtime, probe, dashboard, or alert implementation]. |
| Validation | `../12_validation/VAL-TASK-008.md` records current documentation validation and blockers. |

## Boundaries

- Runtime probes are conditional until Agent A publishes the TASK-002 lifecycle/status endpoint shape.
- No Kubernetes manifests, secrets, `.env` files, runtime services, schemas, or deployment scripts are changed by this planning task.
- Smoke, alert, dashboard, and validation examples must be synthetic or placeholder-only.
- Dashboard and alert payloads must not contain secrets, raw production records, customer identifiers, internal cost, margin, supplier private values, JWTs, cookies, or authorization headers.
- Feed invariants remain mandatory: valid XML, zero-stock exclusion, sub-60-second generation, public-data safety, and secret handling.

## Known Signals

| Signal | Source | Status | Notes |
|---|---|---|---|
| Public feed XML | `GET /feed?type=heureka_cz` and `GET /feed/download?type=heureka_cz` observed in controller context | Candidate | Existing route context only; production target URL is [UNKNOWN: approved public feed URL]. |
| Validation status header | `X-Heureka-Feed-Status` observed in controller context | Candidate | Do not automate alert dependency until TASK-002 output contract is accepted. |
| Generation timing header | `X-Heureka-Feed-Generation-Ms` observed in controller context | Candidate | Threshold can be drafted now because INV-003 is fixed at 60 seconds. |
| Lifecycle/status endpoint | `GET /feed/status?type=heureka_cz` status endpoint shape is published by TASK-002. | Blocked | Probe path, payload fields, status vocabulary, and freshness fields must be confirmed before runtime checks. |
| Feed generation history | `heureka_feeds` model | Candidate | Use aggregate counts/status only; do not expose raw IDs in dashboard payloads. |
| Event taxonomy | `../16_operations/INTEGRATIONS.md` | Draft | Event names are draft and must remain redacted. |

## Smoke Checklist Draft

| Check | Trigger | Evidence to capture | Pass condition | Blocker |
|---|---|---|---|---|
| Feed endpoint availability | Post-deploy and scheduled smoke | HTTP status, content type, elapsed milliseconds, redacted target label | `GET /feed?type=heureka_cz` returns 200 and XML content type | [UNKNOWN: approved public target URL]. |
| XML parse validity | Same run as feed availability | Parser status and sanitized error class only | XML parses and root is `SHOP` | None. |
| Required public fields | Same parsed XML sample | Counts only: `SHOPITEM`, `ITEM_ID`, `PRODUCTNAME`, `URL`, `PRICE_VAT`, `DELIVERY_DATE` | Every sampled `SHOPITEM` contains required public fields | Heureka field contract may need final review. |
| Generation timing | Same run as feed availability | `X-Heureka-Feed-Generation-Ms` or measured elapsed time | Warning below 45 seconds; critical at 60 seconds or more | Header contract finalization depends on TASK-002. |
| Validation status | Same run as feed availability | `X-Heureka-Feed-Status` value only | Status is `valid` after TASK-002 vocabulary is final | `valid`, `invalid`, `stale`, `generating`, `failed`, and `missing`.. |
| Zero-stock exclusion | Scheduled validation smoke | Aggregated exclusion count and policy status only | No zero-stock product appears in public feed; zero-stock exclusions are explained by validation/status evidence | `latestValidation.zeroStockExcludedCount`, `latestValidation.checks.zeroStockExcluded`, `latestValidation.policy.blockers`, and `latestValidation.policy.warnings` expose exclusion evidence.. |
| Sensitive field scan | Every smoke and dashboard export | Scan result summary only | Public XML and alert payload contain no forbidden fields or secret-like values | None. |
| Status endpoint smoke | After TASK-002 publication | HTTP status, status enum, generated-at age, product counts, redacted feed type | Endpoint returns accepted schema and deterministic summary for fixed snapshot | Blocked until TASK-002. |
| Download endpoint parity | Post-deploy smoke | Hash of normalized XML from feed and download responses | Download XML matches public feed XML for same type and snapshot | Snapshot/hash strategy depends on TASK-002. |

## Alert Threshold Draft

| Alert | Severity | Draft threshold | Required payload fields | Redaction rule |
|---|---|---|---|---|
| Feed unavailable | Critical | Any scheduled smoke gets non-2xx, timeout, or non-XML response twice within 10 minutes | `service`, `feed_type`, `check_id`, `status_class`, `elapsed_ms` | No URL query secrets, headers, body, product IDs, or raw errors. |
| Invalid XML | Critical | Any parser failure or lifecycle validation status not `valid` | `feed_type`, `check_id`, `validation_status`, `error_class` | No raw XML body in alert. |
| Slow generation | Warning | Generation time >= 45 seconds and < 60 seconds | `feed_type`, `check_id`, `generation_ms` | Numeric timing only. |
| Generation SLA breach | Critical | Generation time >= 60 seconds once in production or twice in staging | `feed_type`, `check_id`, `generation_ms`, `snapshot_hash` if approved | Snapshot hash only; no raw product data. |
| Stale feed | Warning | Age exceeds [UNKNOWN: approved cadence] by 30 minutes, or default candidate age > 6 hours until cadence is approved | `feed_type`, `check_id`, `age_minutes`, `cadence_minutes` | No raw feed URL or IDs. |
| Severely stale feed | Critical | Age exceeds [UNKNOWN: approved cadence] by 2 hours, or default candidate age > 12 hours until cadence is approved | Same as stale feed | Same as stale feed. |
| Product count collapse | Warning | Successful feed item count drops by more than 20% versus previous accepted baseline without planned campaign marker | `feed_type`, `check_id`, `count_delta_percent` | Counts only. |
| Product count collapse | Critical | Successful feed item count drops by more than 50% versus previous accepted baseline without planned campaign marker | Same as warning | Counts only. |
| Zero-stock leak | Critical | Any validation evidence confirms zero-stock product included in public feed | `feed_type`, `check_id`, `validation_status`, `zero_stock_leak_count` | Count only; no product identifiers. |
| Sensitive data leak | Critical | Any forbidden token, secret-like value, internal cost, margin, supplier private value, customer data, or auth header appears in XML, logs, alert payload, or dashboard payload | `feed_type`, `check_id`, `finding_class` | No matching value is copied into alert. |
| Status probe schema drift | Warning | Lifecycle/status response misses required field after TASK-002 contract is approved | `feed_type`, `check_id`, `schema_version`, `missing_field_count` | Field names allowed; no payload body. |

## Rollback Criteria

Rollback or stop rollout when any of these conditions occurs:

- Public feed XML is invalid, unparseable, or served with the wrong content type.
- Public feed includes zero-stock products or cannot prove zero-stock exclusion after the TASK-002 lifecycle/status contract is available.
- Generation time reaches or exceeds 60 seconds in production.
- Public XML, logs, dashboard payloads, or alerts expose secrets, raw production records, customer identifiers, internal cost, margin, or supplier private values.
- Product count drops by more than 50% from the accepted baseline without an approved business reason.
- Lifecycle/status endpoint schema drift prevents operators from determining feed freshness, validity, timing, or safety after the contract is approved.
- Deployment readiness gate fails or produces unresolved missing markers for TASK-008.

## Rollback Playbook Draft

1. Stop the rollout and preserve current evidence summaries under `reports/validation/` without raw XML, secrets, or production records.
2. Revert only the scoped TASK-008 implementation files named by the approved implementation plan.
3. Restore the previously accepted deployment artifact or image using the approved deployment workflow: [MISSING: exact rollback command or platform procedure].
4. Run feed availability, XML parse, sensitive-field scan, and timing smoke checks against the restored version.
5. Keep lifecycle/status probes disabled or informational until TASK-002 publishes the final schema.
6. Record rollback cause, invariant affected, validation command summaries, and next action in `../12_validation/VAL-TASK-008.md` or `reports/validation/`.

## Scale Evidence Needs

| Evidence | Minimum requirement | Validation method | Status |
|---|---|---|---|
| Generation timing | Full feed generation remains below 60 seconds for approved synthetic dataset sizes | Capture `generation_ms`, dataset label, feed type, and environment class | [MISSING: approved synthetic dataset sizes]. |
| Timing distribution | Report p50, p95, p99, and max generation time for repeated runs | Run repeated synthetic feed generations after implementation | Blocked until implementation plan. |
| Deterministic validation | Same fixed synthetic snapshot produces same validation status, included count, exclusion count, and normalized XML hash | Snapshot hash and normalized output hash comparison | Blocked until TASK-002 status/hash shape. |
| Zero-stock exclusion | Synthetic zero-stock products are excluded and counted | Fixture-based validation or status evidence | Blocked until lifecycle/status shape. |
| Sensitive-data scan | XML, alerts, dashboards, and reports exclude forbidden values | Text scan and field allowlist review | Ready for documentation; runtime scan blocked until implementation. |
| Dashboard safety | Dashboard uses aggregate counts, age, timing, status, and redacted error classes only | Payload schema review and screenshot/text scan | Blocked until dashboard payload plan. |
| Alert payload safety | Alerts contain only approved fields in the threshold table | Payload fixture scan | Blocked until alert implementation. |
| Replay evidence | Fixed input snapshot can be replayed without contract drift | Contract/replay test report | Blocked until TASK-002 and later TASK-008 implementation. |

## Dashboard Requirements Draft

Dashboard panels should show only aggregate, public-safe operations data:

- Feed type, validation status, generated-at age, and freshness state.
- Generation time latest, p95, max, and SLA breach count.
- Product counts: included count, zero-stock exclusion count, failed fetch count, and count delta percentage.
- XML validity and sensitive-field scan status.
- Last smoke result, last deployment-readiness gate result, and rollback state.
- Submission status only after flipflop contract approval: [MISSING: reviewed submission evidence contract].

Forbidden dashboard fields: raw XML, product IDs, customer identifiers, emails, phone numbers, order IDs, supplier private values, internal cost, margin, credentials, tokens, cookies, request headers, and raw logs.

## Conditional Runtime Probe Contract

Runtime probes must not be finalized until TASK-002 publishes:

- endpoint method and path;
- response schema version;
- status vocabulary;
- freshness field and timezone rules;
- generation timing field;
- validation snapshot/hash field;
- zero-stock exclusion evidence field;
- redacted error class field;
- deterministic replay expectations.

## Validation Evidence Captured

- Reviewed `PLAN.md`, TASK-008 task, TASK-008 execution plan, `../16_operations/INTEGRATIONS.md`, `../17_governance/PROJECT_INVARIANTS.md`, feature, goal impact, milestone, roadmap, system doc, controller context, service context, and Prisma context on 2026-06-13.
- Confirmed the remote worktree already contained unrelated uncommitted roadmap and Agent A runtime changes before this Agent G documentation update.
- Confirmed this artifact is synthetic documentation-only and does not change runtime code, Kubernetes manifests, secrets, schemas, or deployment scripts.

## Current Blocker

TASK-008 can keep planning, but runtime probes, final alert labels, dashboard payloads, replay checks, and deployment readiness closure are blocked by `GET /feed/status?type=heureka_cz` returns `{ success, data }` with `feedType`, `status`, `latestFeedId`, `feedUrl`, `productCount`, `generatedAt`, `feedAgeSeconds`, `reason`, and `latestValidation`; XML feed responses expose `X-Heureka-Feed-Status`, `X-Heureka-Feed-Generation-Ms`, and `X-Heureka-Feed-Snapshot-Hash`; statuses are `valid`, `invalid`, `stale`, `generating`, `failed`, and `missing`; policy decisions are `persist_and_expose` and `block_publication`..
