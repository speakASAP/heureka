# Catalog Feed Readiness Contract

```yaml
id: CATALOG-FEED-READINESS-CONTRACT
status: implemented
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-15
source_task: ../11_tasks/TASK-004-design-catalog-feed-readiness-action.md
execution_plan: ../21_execution_plans/EP-TASK-004-design-catalog-feed-readiness-action.md
feature: ../10_features/FEAT-004-catalog-feed-readiness-action.md
validation: ../12_validation/VAL-TASK-004.md
classification: synthetic
```

## Purpose

Define the catalog-facing dry-run/readiness contract that explains whether product snapshots are eligible for a future Heureka feed generation run. Runtime endpoint work is implemented as a read-only advisory dry-run after TASK-003 published stable policy vocabulary and shared feed runtime file ownership was coordinated in one thread.

## Boundary Rules

- Catalog owns product truth and product remediation.
- Catalog/pricing owns price truth and price remediation.
- Catalog/media owns image truth and image remediation.
- Warehouse owns stock truth and stock remediation.
- Heureka owns feed generation, XML validation, readiness explanation, status evidence, and public feed safety gates.
- Heureka must not edit products, prices, media, categories, or stock.
- Readiness is advisory and deterministic for a fixed input snapshot; it does not automatically include a product in the public feed.

## Proposed Runtime Surface

Runtime surface is implemented as read-only advisory endpoints.

| Operation | Draft route | Purpose | Mutation allowed |
|---|---|---|---|
| Single product readiness | `GET /feed/readiness/products/:productId?feedType=heureka_cz` | Explain one product readiness state. | No |
| Bulk readiness | `POST /feed/readiness/bulk` | Explain readiness for a caller-provided product id list. | No |

## Request Shape

```json
{
  "feedType": "heureka_cz",
  "productIds": ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"],
  "snapshotId": "synthetic-snapshot-2026-06-13T20-00-00Z",
  "requestedBy": "catalog-readiness-dry-run"
}
```

Rules:

- `feedType` defaults to `heureka_cz` only after runtime settings validation.
- `productIds` are catalog identifiers; Heureka does not create or update catalog rows.
- `snapshotId` or a deterministic `snapshotHash` is required before persisted lifecycle/status/event integration.
- `requestedBy` must be non-sensitive and must not include a user token, email, IP address, or customer identifier.

## Response Shape

```json
{
  "contractVersion": "catalog-feed-readiness.v1",
  "feedType": "heureka_cz",
  "snapshotHash": "sha256:synthetic-readiness-001",
  "generatedAt": "2026-06-13T20:00:00.000Z",
  "summary": {
    "total": 4,
    "ready": 1,
    "blocked": 3,
    "warning": 0
  },
  "items": [
    {
      "productId": "11111111-1111-4111-8111-111111111111",
      "readiness": "ready",
      "blockers": [],
      "feedEligibility": {
        "includedInDryRun": true,
        "willMutateCatalog": false,
        "willPublishFeed": false
      }
    },
    {
      "productId": "22222222-2222-4222-8222-222222222222",
      "readiness": "blocked",
      "blockers": [
        {
          "code": "MISSING_CATEGORY",
          "severity": "blocker",
          "ownerService": "catalog-service",
          "publicReason": "Product has no Heureka category text.",
          "remediationHint": "Set a public category path on the product in catalog before requesting feed inclusion."
        }
      ],
      "feedEligibility": {
        "includedInDryRun": false,
        "willMutateCatalog": false,
        "willPublishFeed": false
      }
    }
  ]
}
```

## Readiness States

| State | Meaning | Public feed impact |
|---|---|---|
| `ready` | No blocking issue was found for the fixed snapshot. | Product may be included by a later governed generation run if feed settings and lifecycle gates pass. |
| `warning` | Non-blocking issue exists, but current policy permits feed inclusion. | Product may be included; warning remains visible to operators. |
| `blocked` | One or more blocker severity results prevent feed inclusion. | Product must be excluded from the public feed. |
| `unknown` | Required upstream data could not be fetched deterministically. | Product must be excluded until the owner service is reachable or the snapshot is replayed successfully. |

## Blocker Mapping

This vocabulary is the TASK-004 readiness vocabulary. TASK-003 owns feed-level policy vocabulary; TASK-004 maps product-level readiness blockers to owner services and remediation hints.

| Code | Severity | Owner service | Invariant link | Public-safe reason | Remediation hint |
|---|---|---|---|---|---|
| `PRODUCT_NOT_FOUND` | blocker | catalog-service | INV-001 | Catalog product was not found for the requested id. | Confirm the product exists and retry readiness with the catalog id. |
| `PRODUCT_INACTIVE` | blocker | catalog-service | INV-001 | Product is not active for marketplace publication. | Activate the product in catalog when it is approved for public sale. |
| `MISSING_PRODUCT_NAME` | blocker | catalog-service | INV-001 | Product has no public name for XML output. | Add a public product name in catalog. |
| `MISSING_DESCRIPTION` | warning | catalog-service | INV-001 | Product has no public description. | Add a public-safe product description in catalog. |
| `MISSING_CATEGORY` | blocker | catalog-service | INV-001 | Product has no public Heureka category text. | Map the product to a public category path in catalog. |
| `MISSING_PRIMARY_IMAGE` | blocker | catalog-media-service | INV-001 | Product has no public primary image URL. | Attach a public primary image in catalog media. |
| `INVALID_IMAGE_URL` | blocker | catalog-media-service | INV-001 | Product image URL is not usable in public XML. | Replace the image URL with a public HTTPS URL. |
| `PRICE_MISSING` | blocker | catalog-pricing-service | INV-001 | Product has no public price. | Publish a current public VAT-inclusive price. |
| `PRICE_NOT_POSITIVE` | blocker | catalog-pricing-service | INV-001 | Product price is zero or negative. | Correct the public selling price before feed inclusion. |
| `ZERO_STOCK` | blocker | warehouse-service | INV-002 | Product has no available stock. | Replenish stock or keep the product excluded from the feed. |
| `STOCK_UNKNOWN` | blocker | warehouse-service | INV-002 | Available stock could not be determined. | Restore warehouse stock lookup or replay readiness with a complete snapshot. |
| `SETTINGS_INACTIVE` | blocker | heureka-service | INV-001 | Feed settings are missing or inactive. | Activate the feed settings before running readiness. |
| `XML_RENDER_INVALID` | blocker | heureka-service | INV-001 | Product data would render invalid feed XML. | Fix the source public fields identified by validation and replay readiness. |
| `SENSITIVE_FIELD_EXPOSURE` | blocker | source owner plus heureka-service policy gate | INV-004, INV-005 | Candidate feed data includes a non-public field. | Remove internal cost, margin, supplier-private, customer, or secret values from the source contract before feed use. |
| `GENERATION_SLA_RISK` | warning | heureka-service | INV-003 | Synthetic dry-run indicates feed generation may exceed the 60 second SLA. | Reduce batch size, improve upstream latency, or run performance validation before release. |

## Synthetic Readiness Examples

### Ready product

Input snapshot:

```json
{
  "productId": "11111111-1111-4111-8111-111111111111",
  "name": "Synthetic Trail Shoe",
  "description": "Synthetic public description.",
  "category": "Sport | Running shoes",
  "primaryImageUrl": "https://example.test/images/synthetic-trail-shoe.jpg",
  "priceVat": "1299.00",
  "availableStock": 12
}
```

Expected readiness: `ready`; no blockers; no catalog mutation.

### Catalog-owned remediation

Input snapshot:

```json
{
  "productId": "22222222-2222-4222-8222-222222222222",
  "name": "Synthetic Lamp",
  "description": "Synthetic public description.",
  "category": null,
  "primaryImageUrl": "https://example.test/images/synthetic-lamp.jpg",
  "priceVat": "899.00",
  "availableStock": 4
}
```

Expected readiness: `blocked`; blocker `MISSING_CATEGORY`; owner `catalog-service`; remediation: map the product to a public category path in catalog.

### Warehouse-owned remediation

Input snapshot:

```json
{
  "productId": "33333333-3333-4333-8333-333333333333",
  "name": "Synthetic Kettle",
  "description": "Synthetic public description.",
  "category": "Home | Kitchen appliances",
  "primaryImageUrl": "https://example.test/images/synthetic-kettle.jpg",
  "priceVat": "599.00",
  "availableStock": 0
}
```

Expected readiness: `blocked`; blocker `ZERO_STOCK`; owner `warehouse-service`; remediation: replenish stock or keep the product excluded.

### Sensitive-field remediation

Input snapshot:

```json
{
  "productId": "44444444-4444-4444-8444-444444444444",
  "name": "Synthetic Backpack",
  "description": "Synthetic public description.",
  "category": "Sport | Backpacks",
  "primaryImageUrl": "https://example.test/images/synthetic-backpack.jpg",
  "priceVat": "749.00",
  "availableStock": 8,
  "candidateFeedFields": ["ITEM_ID", "PRODUCTNAME", "PRICE_VAT", "INTERNAL_MARGIN"]
}
```

Expected readiness: `blocked`; blocker `SENSITIVE_FIELD_EXPOSURE`; owner `source owner plus heureka-service policy gate`; remediation: remove non-public fields from the source contract before feed use.

## Replay And Determinism Requirements

- Same `feedType`, product ids, settings snapshot, catalog snapshot, media snapshot, price snapshot, and warehouse snapshot must produce byte-equivalent readiness JSON after stable key ordering.
- `generatedAt` may vary unless persistence requires replay equality; persisted validation should compare `snapshotHash` and result payload excluding wall-clock fields.
- Readiness must not depend on live random values, AI output, mutable process globals, or unordered map iteration.
- Bulk readiness must preserve request order in `items` and may include a separate sorted aggregate only if documented.

## Validation Requirements

- TASK-003 publishes stable policy codes, severities, and remediation message rules.
- Shared ownership for `services/heureka-service/src/heureka/feed/feed.controller.ts` and `services/heureka-service/src/heureka/feed/feed.service.ts` is coordinated before runtime edits.
- Contract tests cover single product, bulk product, zero stock exclusion, missing category/media/price blockers, sensitive-field blocking, and deterministic replay.
- Validation evidence is captured in `../12_validation/VAL-TASK-004.md` and `../reports/validation/` using synthetic data only.

## Runtime Implementation

Runtime implementation files:

- `../services/heureka-service/src/heureka/feed/feed-readiness.ts`
- `../services/heureka-service/src/heureka/feed/feed-readiness.self-test.ts`
- `../services/heureka-service/src/heureka/feed/feed.service.ts`
- `../services/heureka-service/src/heureka/feed/feed.controller.ts`

The runtime slice fetches product, media, price, stock, and settings evidence, then returns deterministic readiness output. It does not persist readiness snapshots, publish feeds, include products, or mutate upstream services.
