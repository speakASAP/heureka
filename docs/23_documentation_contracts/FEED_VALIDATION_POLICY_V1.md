# Feed Validation Policy Contract v1

```yaml
id: FEED-VALIDATION-POLICY-V1
status: draft-work-implemented
owner: Agent B
created: 2026-06-13
last_updated: 2026-06-13
source_task: ../11_tasks/TASK-003-define-feed-validation-policy-engine.md
execution_plan: ../21_execution_plans/EP-TASK-003-define-feed-validation-policy-engine.md
policy_version: heureka.feed.validation.policy.v1
classification: synthetic
```

## Purpose

Publish the deterministic feed validation policy vocabulary for TASK-003 consumers. Agents C and F can consume this contract for readiness blockers and redacted analytics events without depending on TASK-002 runtime ownership.

## Result Codes

| Result code | Status | Severity ceiling | Serve/persist/handoff | Meaning |
|---|---|---|---|---|
| HEUREKA_FEED_VALID | valid | info | allowed | No policy findings. |
| HEUREKA_FEED_VALID_WITH_WARNINGS | warning | warning | allowed | Non-blocking validation findings exist and should be reported. |
| HEUREKA_FEED_BLOCKED | blocked | error or critical | blocked | At least one blocking policy finding exists. |

## Blocking Codes

| Code | Severity | Owner | Blocks | Remediation |
|---|---|---|---|---|
| FEED_TYPE_UNSUPPORTED | error | configuration | yes | Use an approved Heureka feed type and settings record before publication. |
| XML_ENVELOPE_INVALID | critical | heureka-service | yes | Regenerate XML with the XML declaration, SHOP root element, and closing SHOP element before publication. |
| XML_TEXT_UNESCAPED | critical | heureka-service | yes | Escape feed text fields before serialization and rerun XML validation before publication. |
| PRODUCT_COUNT_MISMATCH | error | heureka-service | yes | Reconcile included product count evidence with generated SHOPITEM elements. |
| ZERO_STOCK_INCLUDED | critical | warehouse-service | yes | Remove zero-stock products from feed output and regenerate from the current stock snapshot. |
| ZERO_STOCK_EVIDENCE_INVALID | error | warehouse-service | yes | Regenerate validation from a catalog and stock snapshot that reports included and excluded product counts. |
| GENERATION_SLA_EXCEEDED | error | heureka-service | yes | Reduce generation latency or split publication work so the feed completes within 60000 ms. |
| SENSITIVE_FIELD_EXPOSED | critical | heureka-service | yes | Remove forbidden private field tags from public XML serialization and rerun the sensitive-field scan. |
| PRODUCT_ELIGIBILITY_EVIDENCE_INVALID | error | catalog-service | yes | Regenerate product eligibility evidence from the same deterministic snapshot used to build the feed. |

## Warning Codes

| Code | Severity | Owner | Blocks | Remediation |
|---|---|---|---|---|
| CATALOG_FETCH_PARTIAL | warning | catalog-service | no | Review upstream fetch failures and rerun validation when source availability is restored. |

## Determinism Contract

For identical input XML, feed type, generated-at timestamp, generation duration, product counts, failed-fetch count, zero-stock evidence, optional eligibility count, and optional source snapshot hash, the policy result must be byte-for-byte stable after JSON serialization.

The policy module does not read clocks, databases, network clients, environment variables, or secrets. Runtime lifecycle integration must pass an explicit source snapshot hash or idempotency key when TASK-002 ownership is resolved.

## Sensitive-Data Handling

Examples and tests are synthetic. The contract intentionally publishes only field categories, result codes, blocker codes, severities, owner services, and remediation text. It must not include raw production data, customer identifiers, private supplier values, internal cost values, margin values, payment values, tokens, or secrets.

## Consumer Guidance

- TASK-004 readiness should map `blockerCodes` directly to product/feed readiness blockers and show the matching remediation.
- TASK-007 analytics should emit `policyVersion`, `resultCode`, `status`, `maxSeverity`, and `blockerCodes` only; do not emit XML content or product/customer identifiers.
- TASK-002 lifecycle integration should treat `canPersist`, `canServe`, and `canHandoff` as the publication gate output after shared runtime ownership is known.

## Validation Evidence

- Code: `../services/heureka-service/src/heureka/feed/feed-validation-policy.ts`
- Isolated test: `../services/heureka-service/src/heureka/feed/feed-validation-policy.self-test.ts`
- Validation report: `../12_validation/VAL-TASK-003.md`
