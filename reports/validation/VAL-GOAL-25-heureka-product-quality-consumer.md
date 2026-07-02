# VAL-GOAL-25 Heureka Product Quality Consumer

```yaml
id: VAL-GOAL-25-HEUREKA-PRODUCT-QUALITY-CONSUMER
status: source-implemented-not-deployed
created: 2026-07-02
last_updated: 2026-07-03
repository: /home/ssf/Documents/Github/heureka
branch: main
catalog_policy: catalog.product_quality.v1
```

## Intent Preservation Chain

Vision: Heureka feed workflows must exclude products that Catalog declares globally non-publishable while Heureka keeps channel/feed ownership.

Goal Impact: mandatory Catalog Goal 25 product-quality blockers now fail closed before Heureka feed inclusion or generated XML exposure.

System: Catalog owns product truth and `catalog.product_quality.v1`; Heureka consumes the review queue and keeps Heureka readiness, feed settings, stock, XML, dashboard, and reporting policy local.

Feature: Heureka channel consumer integration for Catalog Product Quality Review blockers.

Task: consume Catalog quality blockers in readiness/feed/dashboard paths without redefining Catalog truth.

Execution Plan: resolve product quality via `GET /api/products/review/quality`, map mandatory blocker codes into `catalog-feed-readiness.v1`, block inclusion/generation when blockers or unavailable quality evidence remain, and expose the blockers in dashboard/readiness reports.

Coding Prompt: remote-only Heureka Goal 25 worker; no deploy; preserve Catalog/Heureka ownership boundary.

Code: `shared/clients/catalog-client.service.ts`, `services/heureka-service/src/heureka/feed/feed-readiness.ts`, `services/heureka-service/src/heureka/feed/feed.service.ts`, `services/heureka-service/src/heureka/dashboard/dashboard.service.ts`, `services/heureka-service/src/public/public.controller.ts`, `scripts/verify_heureka_blocked_product_lanes.js`, focused self-tests.

Validation: focused self-tests, shared build, Heureka service build, verifier syntax, and diff check passed.

## Validation Evidence

```bash
git diff --check
# PASS

LOGGING_SERVICE_URL=http://logging-microservice:3367 services/heureka-service/node_modules/.bin/ts-node --skip-ignore --compiler-options '{"experimentalDecorators":true,"emitDecoratorMetadata":true,"types":["node"]}' shared/clients/catalog-client.service.self-test.ts
# PASS catalog-client auth self-test

services/heureka-service/node_modules/.bin/ts-node --skip-ignore --compiler-options '{"experimentalDecorators":true,"emitDecoratorMetadata":true,"types":["node"]}' services/heureka-service/src/heureka/feed/feed-readiness.self-test.ts
# PASS feed-readiness self-test

services/heureka-service/node_modules/.bin/ts-node --skip-ignore --compiler-options '{"experimentalDecorators":true,"emitDecoratorMetadata":true,"types":["node"]}' services/heureka-service/src/heureka/feed/feed-preview-readonly.self-test.ts
# PASS feed-preview-readonly self-test

LOGGING_SERVICE_URL=http://logging-microservice:3367 services/heureka-service/node_modules/.bin/ts-node --skip-ignore --compiler-options '{"experimentalDecorators":true,"emitDecoratorMetadata":true,"types":["node"]}' services/heureka-service/src/heureka/dashboard/dashboard-list-products.self-test.ts
# PASS dashboard-list-products self-test

node --check scripts/verify_heureka_blocked_product_lanes.js
# PASS

npm --prefix shared run build
# PASS

LOGGING_SERVICE_URL=http://logging-microservice:3367 npm --prefix services/heureka-service run build
# PASS
```

## Result

- Heureka reads Catalog product-quality review queue evidence and indexes results by Catalog `productId`.
- `catalog-feed-readiness.v1` now carries `catalogQuality` and exact mandatory blocker codes such as `missing_sku`, `duplicate_sku`, `missing_title`, `missing_description`, `missing_current_price`, `missing_image`, `placeholder_image_only`, `archived_product`, and `catalog_quality_unavailable`.
- Feed inclusion and feed XML generation fail closed when Catalog quality blockers or unavailable quality evidence remain.
- Dashboard product rows, details, bulk readiness preview, readiness lanes, and blocked-lane verifier expose Catalog quality blockers without making Heureka the product-truth owner.
- EAN remains optional/non-blocking in Heureka dashboard gap logic.

## Refreshed Validation 2026-07-03

Validated remote source commit: `da07f7a fix: include inactive products in catalog quality lookup`.

```bash
git status --short --branch
# PASS clean: ## main...origin/main

git diff --check
# PASS

LOGGING_SERVICE_URL=http://logging-microservice:3367 services/heureka-service/node_modules/.bin/ts-node --skip-ignore --compiler-options '{"experimentalDecorators":true,"emitDecoratorMetadata":true,"types":["node"]}' shared/clients/catalog-client.service.self-test.ts
# PASS catalog-client auth self-test

services/heureka-service/node_modules/.bin/ts-node --skip-ignore --compiler-options '{"experimentalDecorators":true,"emitDecoratorMetadata":true,"types":["node"]}' services/heureka-service/src/heureka/feed/feed-readiness.self-test.ts
# PASS feed-readiness self-test

services/heureka-service/node_modules/.bin/ts-node --skip-ignore --compiler-options '{"experimentalDecorators":true,"emitDecoratorMetadata":true,"types":["node"]}' services/heureka-service/src/heureka/feed/feed-preview-readonly.self-test.ts
# PASS feed-preview-readonly self-test

LOGGING_SERVICE_URL=http://logging-microservice:3367 services/heureka-service/node_modules/.bin/ts-node --skip-ignore --compiler-options '{"experimentalDecorators":true,"emitDecoratorMetadata":true,"types":["node"]}' services/heureka-service/src/heureka/dashboard/dashboard-list-products.self-test.ts
# PASS dashboard-list-products self-test

node --check scripts/verify_heureka_blocked_product_lanes.js
# PASS

npm --prefix shared run build
# PASS tsc

LOGGING_SERVICE_URL=http://logging-microservice:3367 npm --prefix services/heureka-service run build
# PASS tsc && tsc-alias
```

Result remains source-implemented and validated, with no deployment run in this worker. The current implementation fails closed when Catalog quality blockers are present or when quality readiness is unavailable before Heureka feed inclusion, feed preview XML exposure, lifecycle feed generation, dashboard product action state, and readiness lane reporting.

## Blockers And Caveats

- `[UNKNOWN: live deployed Catalog product-quality review route status]`; this source change was not deployed or runtime-smoked against live Catalog/Heureka pods.
- `[MISSING: deploy approval]`; no deployment was run in this worker thread.
- Catalog queue lookup uses the stable `GET /api/products/review/quality` route plus SKU/title search and bounded page fallback because the contract does not define a per-product quality endpoint.

## Commit And Deploy Status

- Source commits: `761c9a3 feat: consume catalog quality blockers`; `da07f7a fix: include inactive products in catalog quality lookup`.
- Report refresh: pending this documentation-only commit.
- Deploy: not run; deploy was explicitly not approved in this worker thread.
