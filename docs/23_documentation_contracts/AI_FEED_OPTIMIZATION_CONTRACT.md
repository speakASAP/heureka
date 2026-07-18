# AI Feed Optimization Contract

```yaml
id: AI-FEED-OPTIMIZATION-CONTRACT
status: draft
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../10_features/FEAT-005-ai-assisted-feed-optimization.md
  - ../11_tasks/TASK-005-define-ai-feed-optimization-contract.md
  - ../21_execution_plans/EP-TASK-005-define-ai-feed-optimization-contract.md
  - ../23_documentation_contracts/SENSITIVE_DATA_POLICY.md
```

## Purpose

Define the versioned contract between `heureka-service` and `ai-microservice` for public-safe feed optimization suggestions. The contract permits AI to propose changes for feed titles, descriptions, categories, parameters, and media notes, but it does not grant AI authority to mutate public XML, feed storage, catalog truth, pricing truth, stock truth, or publication state.

## Applicability

This document applies to `TASK-005` and any later implementation that sends feed optimization input to `ai-microservice`, stores AI suggestions, reviews AI suggestions, validates approved suggestions, or applies reviewed suggestions to future Heureka feed generation. Runtime storage or schema changes remain blocked until coordinated with the owner of `prisma/schema.prisma` and the TASK-002 lifecycle lane.

## Data Classification

Classification: synthetic for this contract and all examples in this document.

Allowed example source: hand-written synthetic fixture values using `PRODUCT_SYNTHETIC_*`, `REQUEST_SYNTHETIC_*`, `REVIEW_SYNTHETIC_*`, `sha256:<synthetic-hash>`, and `https://example.invalid/` asset URLs.

Forbidden in requests, responses, prompts, logs, reports, fixtures, screenshots, and validation evidence:

- raw production records or exports;
- secrets, tokens, credentials, session cookies, or authorization headers;
- real customer, supplier, employee, tenant, account, order, payment, or ticket identifiers;
- supplier private values, internal cost, internal margin, settlement state, or profit calculations;
- raw operational logs or unmasked production screenshots;
- any field not explicitly listed under `allowed_public_input_fields`.

## Boundary Rules

| Boundary | Rule | Enforcement |
|---|---|---|
| AI authority | AI may create suggestions only. | Response contract includes `mutation_authority: none` and `public_xml_mutation_allowed: false`. |
| Public XML mutation | Public XML can change only through a separate reviewed and validated feed generation path. | `ai-microservice` has no write contract for XML, feed snapshots, feed publication status, or catalog data. |
| Human review | A human reviewer must approve any AI-influenced public feed change before it is eligible for validation. | AI-settable states exclude all approved, rejected, and validation states. |
| Determinism | For a fixed request, deterministic validators must replay redaction, state-transition, and policy checks. | Request carries `input_snapshot_hash`, `idempotency_key`, and contract version. |
| Sensitive data | Only public-safe feed fields may be sent to AI. | Request carries `redaction_profile` and `allowed_public_input_fields`; validation scans examples and reports. |
| Storage coordination | Persisting suggestions or review state requires schema ownership coordination. | Any schema change is blocked until Agent A or the integration owner approves shared schema edits. |

## Locked Redaction Fields

Every request must include these locked redaction fields. They are set by `heureka-service` before the AI call and must be copied into the response evidence for replay.

| Field | Type | Required | Set by | Mutable by AI | Meaning |
|---|---|---:|---|---:|---|
| `schema_version` | string | yes | heureka-service | no | Must equal `heureka.ai_feed_optimization.request.v1`. |
| `data_classification` | enum | yes | heureka-service | no | Allowed values for AI requests: `synthetic`, `masked_public`. Contract examples use only `synthetic`. |
| `redaction_profile` | string | yes | heureka-service | no | Must equal `public_feed_safe.v1` until changed by reviewed contract. |
| `input_snapshot_hash` | string | yes | heureka-service | no | `sha256:<synthetic-hash>` in docs/tests; production value is hash only, never raw snapshot. |
| `idempotency_key` | string | yes | heureka-service | no | Stable key for replay and duplicate suppression. |
| `allowed_public_input_fields` | string[] | yes | heureka-service | no | Explicit allowlist of public feed fields. |
| `forbidden_input_fields` | string[] | yes | heureka-service | no | Explicit denylist for internal and private fields. |
| `public_xml_mutation_allowed` | boolean | yes | heureka-service | no | Must be `false` for every AI request and response. |
| `requires_human_review` | boolean | yes | heureka-service | no | Must be `true` for every suggestion-bearing response. |

Allowed public input fields:

- `product_ref` using synthetic or internal opaque product reference only;
- `feed_type` as `heureka.cz` or `heureka.sk`;
- `current_public.title`;
- `current_public.description`;
- `current_public.category_text`;
- `current_public.parameters[].name`;
- `current_public.parameters[].value` when already public-safe;
- `current_public.media[].public_asset_ref` under `https://example.invalid/` in examples;
- `current_public.media[].alt_text` when already public-safe;
- `readiness_context.public_blockers[]` using reviewed blocker vocabulary.

Forbidden input fields:

- `cost`, `purchase_cost`, `margin`, `profit`, `supplier_price`, `supplier_contract`, `settlement_state`;
- `customer_id`, `order_id`, `email`, `phone`, `address`, account identifiers, tenant identifiers;
- raw stock movement logs, raw order records, payment records, private supplier records, credentials, and logs;
- database primary keys when they are not already approved opaque references;
- any production sample text copied from source systems for prompt convenience.

## Locked Review States

The review state is a workflow field. AI may propose only draft suggestions and may not approve, reject, validate, publish, or mutate public XML.

| State | Set by | AI settable | Public XML eligible | Meaning |
|---|---|---:|---:|---|
| `draft_suggested` | ai-microservice | yes | no | AI generated a suggestion under the active contract. |
| `redaction_failed` | heureka-service validator | no | no | Input or output failed public-safe redaction checks. |
| `operator_review_required` | heureka-service | no | no | Suggestion is queued for human review. |
| `operator_changes_requested` | human reviewer | no | no | Reviewer requires changes outside direct AI mutation authority. |
| `operator_rejected` | human reviewer | no | no | Suggestion must not affect public feed output. |
| `operator_approved` | human reviewer | no | no | Human approved suggestion content, but validation has not passed. |
| `validation_pending` | heureka-service validator | no | no | Deterministic XML, safety, and policy validation is pending. |
| `validation_failed` | heureka-service validator | no | no | Approved suggestion failed deterministic validation. |
| `validation_passed` | heureka-service validator | no | conditional | Suggestion passed validation and may be consumed by a separately governed feed generation path. |
| `publication_candidate` | feed lifecycle owner | no | conditional | Feed lifecycle selected the validated suggestion for a future feed snapshot. |
| `published_with_lineage` | feed lifecycle owner | no | yes | Public feed snapshot includes approved/validated lineage. |

Required transition order:

```text
draft_suggested -> operator_review_required -> operator_approved -> validation_pending -> validation_passed -> publication_candidate -> published_with_lineage
```

Any transition to `operator_rejected`, `operator_changes_requested`, `redaction_failed`, or `validation_failed` is terminal for public feed mutation unless a new suggestion id is created.

## Request Contract v1

Schema id: `heureka.ai_feed_optimization.request.v1`.

Required top-level fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `schema_version` | string | yes | Exact schema id. |
| `request_id` | string | yes | Opaque request reference. Synthetic examples use `REQUEST_SYNTHETIC_*`. |
| `idempotency_key` | string | yes | Stable for a fixed request body. |
| `feed_type` | enum | yes | `heureka.cz` or `heureka.sk`. |
| `data_classification` | enum | yes | `synthetic` for examples; `masked_public` only after reviewed runtime implementation. |
| `redaction_profile` | string | yes | `public_feed_safe.v1`. |
| `input_snapshot_hash` | string | yes | Hash of the redacted input snapshot, not raw product data. |
| `allowed_public_input_fields` | string[] | yes | Must match the allowlist in this contract. |
| `forbidden_input_fields` | string[] | yes | Must include cost, margin, customer, supplier private, credentials, and raw records. |
| `public_xml_mutation_allowed` | boolean | yes | Must be `false`. |
| `requires_human_review` | boolean | yes | Must be `true`. |
| `items` | object[] | yes | One or more redacted public-safe product inputs. |

Synthetic request example:

```json
{
  "schema_version": "heureka.ai_feed_optimization.request.v1",
  "request_id": "REQUEST_SYNTHETIC_001",
  "idempotency_key": "TASK-005-SYNTHETIC-001",
  "feed_type": "heureka.cz",
  "data_classification": "synthetic",
  "redaction_profile": "public_feed_safe.v1",
  "input_snapshot_hash": "sha256:synthetic-feed-input-001",
  "allowed_public_input_fields": [
    "product_ref",
    "feed_type",
    "current_public.title",
    "current_public.description",
    "current_public.category_text",
    "current_public.parameters.name",
    "current_public.parameters.value",
    "current_public.media.public_asset_ref",
    "current_public.media.alt_text",
    "readiness_context.public_blockers"
  ],
  "forbidden_input_fields": [
    "cost",
    "purchase_cost",
    "margin",
    "profit",
    "supplier_price",
    "supplier_contract",
    "customer_id",
    "order_id",
    "email",
    "phone",
    "address",
    "credentials",
    "raw_records",
    "logs"
  ],
  "public_xml_mutation_allowed": false,
  "requires_human_review": true,
  "items": [
    {
      "product_ref": "PRODUCT_SYNTHETIC_001",
      "current_public": {
        "title": "Synthetic Desk Lamp Model A",
        "description": "Adjustable desk lamp for home office use.",
        "category_text": "Home | Lighting | Desk Lamps",
        "parameters": [
          { "name": "Color", "value": "White" },
          { "name": "Power", "value": "8 W" }
        ],
        "media": [
          {
            "public_asset_ref": "https://example.invalid/media/product-synthetic-001.jpg",
            "alt_text": "White adjustable desk lamp"
          }
        ]
      },
      "readiness_context": {
        "public_blockers": ["missing_parameter_detail"],
        "owner_service": "catalog-microservice"
      }
    }
  ]
}
```

## Response Contract v1

Schema id: `heureka.ai_feed_optimization.response.v1`.

Required top-level fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `schema_version` | string | yes | Exact schema id. |
| `request_id` | string | yes | Echoes request id. |
| `idempotency_key` | string | yes | Echoes request idempotency key. |
| `input_snapshot_hash` | string | yes | Echoes request hash. |
| `redaction_profile` | string | yes | Echoes request redaction profile. |
| `public_xml_mutation_allowed` | boolean | yes | Must be `false`. |
| `requires_human_review` | boolean | yes | Must be `true`. |
| `ai_run_ref` | string | yes | Opaque run reference, not a log dump. |
| `suggestions` | object[] | yes | Zero or more suggestions. |
| `safety` | object | yes | Output safety summary. |

Suggestion fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `suggestion_id` | string | yes | Opaque suggestion id. |
| `product_ref` | string | yes | Echoes product reference. |
| `target_field` | enum | yes | `title`, `description`, `category_text`, `parameter`, or `media_note`. |
| `proposed_value` | string/object | yes | Public-safe proposed value only. |
| `confidence` | number | yes | Decimal `0.0` through `1.0`. Not approval. |
| `evidence` | object[] | yes | Public-safe evidence and rationale only. |
| `review_state` | enum | yes | AI may set only `draft_suggested`. |
| `mutation_authority` | enum | yes | Must be `none`. |
| `public_xml_mutation_allowed` | boolean | yes | Must be `false`. |
| `requires_human_review` | boolean | yes | Must be `true`. |

Synthetic response example:

```json
{
  "schema_version": "heureka.ai_feed_optimization.response.v1",
  "request_id": "REQUEST_SYNTHETIC_001",
  "idempotency_key": "TASK-005-SYNTHETIC-001",
  "input_snapshot_hash": "sha256:synthetic-feed-input-001",
  "redaction_profile": "public_feed_safe.v1",
  "public_xml_mutation_allowed": false,
  "requires_human_review": true,
  "ai_run_ref": "AI_RUN_SYNTHETIC_001",
  "suggestions": [
    {
      "suggestion_id": "SUGGESTION_SYNTHETIC_001",
      "product_ref": "PRODUCT_SYNTHETIC_001",
      "target_field": "title",
      "proposed_value": "Adjustable White LED Desk Lamp, 8 W",
      "confidence": 0.74,
      "evidence": [
        {
          "type": "public_feed_text_rule",
          "detail": "Adds public color and power attributes already present in redacted input."
        }
      ],
      "review_state": "draft_suggested",
      "mutation_authority": "none",
      "public_xml_mutation_allowed": false,
      "requires_human_review": true
    }
  ],
  "safety": {
    "data_classification": "synthetic",
    "forbidden_content_detected": false,
    "redaction_profile": "public_feed_safe.v1",
    "review_required": true
  }
}
```

## Review API Contract

The review API is owned by `heureka-service` or the future approved operations surface, not by `ai-microservice`. AI responses must be treated as immutable suggestion evidence. Human review creates a separate decision record.

Required review decision fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `schema_version` | string | yes | `heureka.ai_feed_optimization.review_decision.v1`. |
| `review_id` | string | yes | Synthetic examples use `REVIEW_SYNTHETIC_*`. |
| `suggestion_id` | string | yes | References immutable suggestion. |
| `decision` | enum | yes | `approve`, `reject`, or `request_changes`. |
| `review_state` | enum | yes | One of the human-settable review states. |
| `reviewed_by_ref` | string | yes | Opaque reviewer reference; no real email in docs/tests. |
| `reviewed_at` | string | yes | ISO timestamp. |
| `notes_public_safe` | string | no | No production data, secrets, internal commercial data, or identifiers. |

Synthetic review decision example:

```json
{
  "schema_version": "heureka.ai_feed_optimization.review_decision.v1",
  "review_id": "REVIEW_SYNTHETIC_001",
  "suggestion_id": "SUGGESTION_SYNTHETIC_001",
  "decision": "approve",
  "review_state": "operator_approved",
  "reviewed_by_ref": "REVIEWER_SYNTHETIC_001",
  "reviewed_at": "2026-06-13T00:00:00Z",
  "notes_public_safe": "Approved because the suggested title only uses public-safe attributes from the redacted input."
}
```

## Validation Requirements

Before runtime implementation or publication use, validation must prove:

- request examples include `public_xml_mutation_allowed: false` and `requires_human_review: true`;
- response examples include `mutation_authority: none`, `public_xml_mutation_allowed: false`, and `review_state: draft_suggested`;
- AI-settable state list excludes `operator_approved`, `validation_passed`, `publication_candidate`, and `published_with_lineage`;
- synthetic examples contain no forbidden fields outside explicit denylist documentation;
- the input snapshot hash is present and no raw input snapshot is persisted in validation reports;
- runtime storage/schema changes are not made without coordination with the TASK-002 schema owner.

## Replay And Determinism

AI text generation may be non-deterministic, but the service behavior around it must be replayable:

1. Redaction from source input to request body must be deterministic for a fixed input snapshot.
2. The request body hash and `idempotency_key` must be stable for the same redacted input.
3. AI response evidence must be persisted as immutable suggestion evidence if storage is later approved.
4. Review decisions must be separate records with reviewer lineage.
5. Validation of an approved suggestion must be deterministic and must include XML validity, zero-stock exclusion preservation, public-field safety, and timing-risk assessment before publication eligibility.

## No-Mutation Proof

AI cannot directly mutate public XML under this contract because:

- the request contract has no public feed write target, feed snapshot id, XML body, publication endpoint, or catalog mutation field;
- the response contract can return only suggestions and safety evidence;
- every response and suggestion must carry `mutation_authority: none` and `public_xml_mutation_allowed: false`;
- AI may set only `draft_suggested`, which is not public XML eligible;
- human approval is necessary but not sufficient for publication; deterministic validation and lifecycle selection are separate non-AI steps;
- runtime feed generation remains owned by `heureka-service` and shared schema changes remain blocked pending coordination with the TASK-002 owner.

## Parallel Execution Notes

| Workstream | Status | Owner role | Allowed files | Forbidden files | Handoff |
|---|---|---|---|---|---|
| Contract definition | ready now | Agent D | `docs/23_documentation_contracts/AI_FEED_OPTIMIZATION_CONTRACT.md`, TASK-005 docs, validation report | feed service runtime, schema, secrets | Deliver versioned contract and validation evidence. |
| Runtime suggestion storage | dependency-gated | Integration owner with Agent A coordination | To be defined by reviewed plan | `prisma/schema.prisma` until coordinated | Requires schema ownership and migration plan. |
| Review UI/API | dependency-gated | Future operator tooling owner | To be defined by reviewed plan | Direct AI-to-public-feed mutation path | Requires approved review API and auth model. |
| Feed application | final integration | TASK-002/feed lifecycle owner | Feed lifecycle files after approval | Autonomous AI publication | Consume only reviewed and validation-passed suggestions. |

## Open Blockers

- Human review and deterministic validation are required before any AI-influenced public feed mutation path.
- Runtime storage/schema changes are blocked until coordinated with Agent A or the schema integration owner.
- Production prompts, raw production examples, supplier private values, internal margin data, and customer identifiers are forbidden in IPS artifacts and AI prompts.
