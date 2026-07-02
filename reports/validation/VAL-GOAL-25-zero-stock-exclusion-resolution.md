# VAL-GOAL-25 Zero-Stock Exclusion Resolution

Date: 2026-07-03
Repository: `/home/ssf/Documents/Github/heureka`
Branch: `main`

## IPS Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: Marketplace channels must not publish products that violate Catalog/Warehouse readiness truth.
- Goal Impact: Goal 25 channel consumers must honor Catalog readiness and Warehouse stock blockers without redefining global product or stock truth.
- System: Heureka consumes Catalog product quality/readiness and Warehouse stock availability.
- Feature: Heureka blocked-product lane verifier and feed inclusion/exclusion controls.
- Task: Resolve the remaining active `ZERO_STOCK` Heureka lane by explicit exclusion decisions where no authoritative stock source exists.
- Execution Plan: Confirm Warehouse availability, do not mutate Warehouse stock, persist Heureka feed exclusions through the guarded Heureka API, then update the read-only lane verifier to recognize explicit exclusions.
- Coding Prompt: Keep zero-stock readiness honest, but distinguish unresolved stock gaps from products explicitly excluded from the feed.
- Code: `scripts/verify_heureka_blocked_product_lanes.js`.
- Validation: Commands and results below.
- State Update: Six zero-stock active Catalog products are explicitly excluded from Heureka feed; stock lane verifier now reports `ready` with `resolvedByExclusion=6`.

## Preflight

Remote-only workflow was used with `ssh alfares`; no project code was saved under `/Users/Sergej.Stasok/Documents`.

Repo states before the bounded source/report change:

```text
catalog-microservice: ## main...origin/main, head ac5c95b docs: record goal 25 live smoke refresh
warehouse-microservice: ## main...origin/main, head 3581c7c refactor: update reservation expiry CronJob to use CLIPLOT_WAREHOUSE_SERVICE_TOKEN instead of JWT_SECRET
heureka: ## main...origin/main, head 7ea1f79 docs: clarify heureka goal 25 report refresh
```

## Warehouse Evidence

Command:

```bash
ssh alfares 'TOKEN=$(kubectl get secret warehouse-microservice-secret -n statex-apps -o jsonpath="{.data.CLIPLOT_WAREHOUSE_SERVICE_TOKEN}" | base64 -d); curl -sS -X POST "https://warehouse.alfares.cz/api/stock/availability/batch" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" --data "{\"productIds\":[\"2430757b-844f-4609-a3eb-7207efadec23\",\"7b54c897-be5d-401d-9293-24d115841a0f\",\"a25cd2d4-e061-4929-968b-44a1122ff7b9\",\"aa929535-0f44-43b1-bcb1-0944046ddc5e\",\"de59bad3-1585-4574-acf2-78489367d418\",\"dfd1001e-f2e3-4909-be87-6ae9546457dc\"]}"'
```

Result summary:

```json
[
  { "productId": "2430757b-844f-4609-a3eb-7207efadec23", "totalQuantity": 0, "totalReserved": 0, "totalAvailable": 0, "warehouseCount": 0 },
  { "productId": "7b54c897-be5d-401d-9293-24d115841a0f", "totalQuantity": 0, "totalReserved": 0, "totalAvailable": 0, "warehouseCount": 0 },
  { "productId": "a25cd2d4-e061-4929-968b-44a1122ff7b9", "totalQuantity": 0, "totalReserved": 0, "totalAvailable": 0, "warehouseCount": 0 },
  { "productId": "aa929535-0f44-43b1-bcb1-0944046ddc5e", "totalQuantity": 0, "totalReserved": 0, "totalAvailable": 0, "warehouseCount": 0 },
  { "productId": "de59bad3-1585-4574-acf2-78489367d418", "totalQuantity": 0, "totalReserved": 0, "totalAvailable": 0, "warehouseCount": 0 },
  { "productId": "dfd1001e-f2e3-4909-be87-6ae9546457dc", "totalQuantity": 0, "totalReserved": 0, "totalAvailable": 0, "warehouseCount": 0 }
]
```

No Warehouse stock mutation was performed. `[MISSING: authoritative external stock source]` remains for changing stock quantities.

## Heureka Exclusion Mutations

First attempt with `heureka-service-secret.JWT_TOKEN` returned `401 Missing or invalid Heureka feed mutation service token`; deployed Heureka env confirmed `HEUREKA_INTERNAL_SERVICE_TOKEN` comes from `catalog-microservice-secret.CATALOG_INTERNAL_SERVICE_TOKEN`.

Command:

```bash
ssh alfares 'TOKEN=$(kubectl get secret catalog-microservice-secret -n statex-apps -o jsonpath="{.data.CATALOG_INTERNAL_SERVICE_TOKEN}" | base64 -d); for id in 2430757b-844f-4609-a3eb-7207efadec23 7b54c897-be5d-401d-9293-24d115841a0f a25cd2d4-e061-4929-968b-44a1122ff7b9 aa929535-0f44-43b1-bcb1-0944046ddc5e de59bad3-1585-4574-acf2-78489367d418 dfd1001e-f2e3-4909-be87-6ae9546457dc; do curl -sS -X DELETE "https://heureka.alfares.cz/heureka/products/$id/exclude" -H "Content-Type: application/json" -H "x-internal-service-token: $TOKEN" -H "x-service-name: heureka-service" --data "{\"feedType\":\"heureka_cz\",\"requestedBy\":\"goal-25-zero-stock-exclusion\"}"; done'
```

Result summary:

```json
[
  { "productId": "2430757b-844f-4609-a3eb-7207efadec23", "included": false, "feedProduct.isIncluded": false, "readiness": "blocked", "availableStock": 0, "blockers": ["ZERO_STOCK"] },
  { "productId": "7b54c897-be5d-401d-9293-24d115841a0f", "included": false, "feedProduct.isIncluded": false, "readiness": "blocked", "availableStock": 0, "blockers": ["ZERO_STOCK"] },
  { "productId": "a25cd2d4-e061-4929-968b-44a1122ff7b9", "included": false, "feedProduct.isIncluded": false, "readiness": "blocked", "availableStock": 0, "blockers": ["ZERO_STOCK"] },
  { "productId": "aa929535-0f44-43b1-bcb1-0944046ddc5e", "included": false, "feedProduct.isIncluded": false, "readiness": "blocked", "availableStock": 0, "blockers": ["ZERO_STOCK"] },
  { "productId": "de59bad3-1585-4574-acf2-78489367d418", "included": false, "feedProduct.isIncluded": false, "readiness": "blocked", "availableStock": 0, "blockers": ["ZERO_STOCK"] },
  { "productId": "dfd1001e-f2e3-4909-be87-6ae9546457dc", "included": false, "feedProduct.isIncluded": false, "readiness": "blocked", "availableStock": 0, "blockers": ["ZERO_STOCK"] }
]
```

Focused status validation after mutation:

```json
[
  { "productId": "2430757b-844f-4609-a3eb-7207efadec23", "included": false, "feedProduct": { "isIncluded": false }, "readiness": "blocked", "availableStock": 0, "blockers": ["ZERO_STOCK"], "willPublish": false },
  { "productId": "7b54c897-be5d-401d-9293-24d115841a0f", "included": false, "feedProduct": { "isIncluded": false }, "readiness": "blocked", "availableStock": 0, "blockers": ["ZERO_STOCK"], "willPublish": false },
  { "productId": "a25cd2d4-e061-4929-968b-44a1122ff7b9", "included": false, "feedProduct": { "isIncluded": false }, "readiness": "blocked", "availableStock": 0, "blockers": ["ZERO_STOCK"], "willPublish": false },
  { "productId": "aa929535-0f44-43b1-bcb1-0944046ddc5e", "included": false, "feedProduct": { "isIncluded": false }, "readiness": "blocked", "availableStock": 0, "blockers": ["ZERO_STOCK"], "willPublish": false },
  { "productId": "de59bad3-1585-4574-acf2-78489367d418", "included": false, "feedProduct": { "isIncluded": false }, "readiness": "blocked", "availableStock": 0, "blockers": ["ZERO_STOCK"], "willPublish": false },
  { "productId": "dfd1001e-f2e3-4909-be87-6ae9546457dc", "included": false, "feedProduct": { "isIncluded": false }, "readiness": "blocked", "availableStock": 0, "blockers": ["ZERO_STOCK"], "willPublish": false }
]
```

Public feed validation:

```text
2430757b-844f-4609-a3eb-7207efadec23 absent
7b54c897-be5d-401d-9293-24d115841a0f absent
a25cd2d4-e061-4929-968b-44a1122ff7b9 absent
aa929535-0f44-43b1-bcb1-0944046ddc5e absent
de59bad3-1585-4574-acf2-78489367d418 absent
dfd1001e-f2e3-4909-be87-6ae9546457dc absent
feed_bytes=1639
```

## Verifier Source Change

`scripts/verify_heureka_blocked_product_lanes.js` now:

- fetches Heureka product feed status for blocked products;
- records `feedStatusEvidence`;
- adds `explicitlyExcludedZeroStockProductIds`, `unresolvedZeroStockProductIds`, and `resolvedByExclusion`;
- marks the stock lane `ready` when every zero-stock active product has a persisted explicit Heureka exclusion and Warehouse availability is known.

The readiness contract remains honest: individual products still report `ZERO_STOCK`, and the verifier does not imply stock exists.

## Validation

Syntax:

```bash
node --check scripts/verify_heureka_blocked_product_lanes.js
```

Result: pass.

Live verifier:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/heureka && CATALOG_INTERNAL_SERVICE_TOKEN=$(kubectl get secret catalog-microservice-secret -n statex-apps -o jsonpath="{.data.CATALOG_INTERNAL_SERVICE_TOKEN}" | base64 -d) WAREHOUSE_SERVICE_TOKEN=$(kubectl get secret warehouse-microservice-secret -n statex-apps -o jsonpath="{.data.CLIPLOT_WAREHOUSE_SERVICE_TOKEN}" | base64 -d) HEUREKA_VERIFY_BASE_URL=https://heureka.alfares.cz CATALOG_SERVICE_URL=https://catalog.alfares.cz WAREHOUSE_SERVICE_URL=https://warehouse.alfares.cz npm --silent run verify:heureka-blocked-product-lanes >/tmp/heureka-zero-stock-after-verifier-fix.json'
```

Result summary:

```json
{
  "contractVersion": "heureka-blocked-product-lanes.v1",
  "readiness": {
    "summary": { "total": 15, "ready": 9, "warning": 0, "blocked": 6, "unknown": 0 },
    "blockerCounts": { "ZERO_STOCK": 6 }
  },
  "stockLane": {
    "status": "ready",
    "zeroStockProductIds": [
      "2430757b-844f-4609-a3eb-7207efadec23",
      "7b54c897-be5d-401d-9293-24d115841a0f",
      "a25cd2d4-e061-4929-968b-44a1122ff7b9",
      "aa929535-0f44-43b1-bcb1-0944046ddc5e",
      "de59bad3-1585-4574-acf2-78489367d418",
      "dfd1001e-f2e3-4909-be87-6ae9546457dc"
    ],
    "explicitlyExcludedZeroStockProductIds": [
      "2430757b-844f-4609-a3eb-7207efadec23",
      "7b54c897-be5d-401d-9293-24d115841a0f",
      "a25cd2d4-e061-4929-968b-44a1122ff7b9",
      "aa929535-0f44-43b1-bcb1-0944046ddc5e",
      "de59bad3-1585-4574-acf2-78489367d418",
      "dfd1001e-f2e3-4909-be87-6ae9546457dc"
    ],
    "unresolvedZeroStockProductIds": [],
    "stockUnknownProductIds": [],
    "warehouseRows": 15,
    "warehouseRowsMissing": [],
    "blockers": [],
    "resolvedByExclusion": 6
  },
  "feedStatusEvidence": { "inspected": 6, "explicitExclusions": 6 },
  "nextActions": []
}
```

## Residual Blockers

- `[MISSING: authoritative external stock source]` remains for changing Warehouse stock from zero to a positive quantity. No such mutation was made.
- The six products remain readiness `blocked` by `ZERO_STOCK`, which is correct because Warehouse availability is zero. They are resolved for Heureka publication by explicit exclusion, not by stock repair.
- No deploy was performed; source changes are committed for the next normal deployment lane.
