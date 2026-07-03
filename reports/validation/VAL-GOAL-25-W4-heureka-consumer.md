# VAL-GOAL-25-W4 Heureka Consumer Validation

```yaml
id: VAL-GOAL-25-W4-HEUREKA-CONSUMER
status: validated-current-main-live-route-proven
created: 2026-07-03
repository: /home/ssf/Documents/Github/heureka
branch: main after merge
heureka_source_commit: 1cf0f32
catalog_origin_main: 7d77fd4
catalog_base_requirement: origin/main contains 877bf98
catalog_policy: catalog.product_quality.v1
```

## Intent Preservation Chain

Vision: Heureka feed/export/publish flows must not expose products that Catalog declares blocked by mandatory product-quality policy.

Goal Impact: Heureka consumes the stable Catalog product-quality blocker contract before feed inclusion or XML exposure while retaining Heureka-specific feed, stock, settings, XML, dashboard, and compliance ownership.

System: Catalog owns product truth and `catalog.product_quality.v1`; Heureka owns channel readiness and feed publication decisions.

Feature: Goal 25 W4 Heureka downstream consumer validation for Catalog product-quality blockers.

Task: validate or bounded-implement Heureka consumption of mandatory Catalog blockers in catalog client, readiness, feed/export, dashboard, and confirmation paths.

Execution Plan: start read-only, confirm Catalog `origin/main` includes the stable Goal 25 base, inspect Heureka catalog client/feed/readiness/dashboard code, verify blocker propagation through focused self-tests/build, and record gaps as `[MISSING: ...]` or `[UNKNOWN: ...]`.

Coding Prompt: Catalog Goal 25 W4E Heureka consumer validation worker; remote-only through `ssh alfares`; no Catalog/Warehouse source edits; commit and push only W4E branch changes after validation.

Code: no source change required in this W4E pass. Existing Heureka implementation was validated in `shared/clients/catalog-client.service.ts`, `services/heureka-service/src/heureka/feed/feed-readiness.ts`, `services/heureka-service/src/heureka/feed/feed.service.ts`, `services/heureka-service/src/heureka/dashboard/dashboard.service.ts`, and dashboard/public readiness views.

Validation: focused self-tests, shared build, Heureka service build, verifier syntax check, `git diff --check`, and live protected Catalog route probes passed on current main.

State Update: W4E report merged into main; source is validated and already deployed in the live Heureka image.

## Catalog Contract Evidence

- Verified `/home/ssf/Documents/Github/catalog-microservice` `origin/main` at `7d77fd4`.
- Verified `877bf98` is an ancestor of Catalog `origin/main`.
- Catalog exposes `GET /api/products/review/quality` and `GET /api/products/review/quality/export` from `src/products/products.controller.ts`.
- Catalog product-quality items expose `policyId`, `canActivate`, `blockingIssues`, `blockingMissingFields`, `nextAction`, and pagination/total data from the review queue contract.
- Heureka does not invent Catalog fields; per-product lookup uses the stable review queue plus SKU/title/id search and bounded page fallback. Missing lookup/access fails closed as `catalog_quality_unavailable` with `[MISSING: ...]` evidence.

## Heureka Consumer Evidence

- `shared/clients/catalog-client.service.ts` consumes `GET /api/products/review/quality` with Catalog internal-service auth or human bearer auth as appropriate.
- `getProductQualityReviewForProduct(...)` resolves by embedded quality data first, then review queue search/fallback; unavailable responses return `[MISSING: Catalog product quality review ...]` instead of assuming readiness.
- `services/heureka-service/src/heureka/feed/feed-readiness.ts` maps Catalog mandatory blockers into `catalog-feed-readiness.v1`, including `missing_sku`, `duplicate_sku`, `missing_title`, `missing_description`, `missing_current_price`, `missing_image`, `placeholder_image_only`, `archived_product`, `invalid_lifecycle_for_quality`, and `catalog_quality_unavailable`.
- `FeedService.includeProductInFeed(...)` blocks feed inclusion confirmation unless readiness is `ready` or `warning`; Catalog blocker/unavailable states are `blocked`.
- `FeedService.renderFeedSnapshot(...)`, used by feed preview, feed download, feed generation, and regenerate paths, excludes products when `hasCatalogQualityBlockers(...)` is true.
- Dashboard product rows and readiness lanes surface readiness/blocker state without moving Heureka feed/compliance ownership into Catalog.

## Validation Evidence

```bash
ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && git rev-parse --short origin/main && git merge-base --is-ancestor 877bf98 origin/main && echo CATALOG_BASE_OK'
# 7d77fd4
# CATALOG_BASE_OK

ssh alfares 'cd /home/ssf/Documents/Github/heureka && git status --short --branch'
# ## main...origin/main after merge refresh

ssh alfares 'cd /home/ssf/Documents/Github/heureka && git diff --check'
# PASS

ssh alfares 'cd /home/ssf/Documents/Github/heureka && LOGGING_SERVICE_URL=http://logging-microservice:3367 services/heureka-service/node_modules/.bin/ts-node --skip-ignore --compiler-options "{\"experimentalDecorators\":true,\"emitDecoratorMetadata\":true,\"types\":[\"node\"]}" shared/clients/catalog-client.service.self-test.ts'
# PASS catalog-client auth self-test

ssh alfares 'cd /home/ssf/Documents/Github/heureka && services/heureka-service/node_modules/.bin/ts-node --skip-ignore --compiler-options "{\"experimentalDecorators\":true,\"emitDecoratorMetadata\":true,\"types\":[\"node\"]}" services/heureka-service/src/heureka/feed/feed-readiness.self-test.ts'
# PASS feed-readiness self-test

ssh alfares 'cd /home/ssf/Documents/Github/heureka && services/heureka-service/node_modules/.bin/ts-node --skip-ignore --compiler-options "{\"experimentalDecorators\":true,\"emitDecoratorMetadata\":true,\"types\":[\"node\"]}" services/heureka-service/src/heureka/feed/feed-preview-readonly.self-test.ts'
# PASS feed-preview-readonly self-test

ssh alfares 'cd /home/ssf/Documents/Github/heureka && LOGGING_SERVICE_URL=http://logging-microservice:3367 services/heureka-service/node_modules/.bin/ts-node --skip-ignore --compiler-options "{\"experimentalDecorators\":true,\"emitDecoratorMetadata\":true,\"types\":[\"node\"]}" services/heureka-service/src/heureka/dashboard/dashboard-list-products.self-test.ts'
# PASS dashboard-list-products self-test

ssh alfares 'cd /home/ssf/Documents/Github/heureka && node --check scripts/verify_heureka_blocked_product_lanes.js'
# PASS

ssh alfares 'cd /home/ssf/Documents/Github/heureka && npm --prefix shared run build'
# PASS tsc

ssh alfares 'cd /home/ssf/Documents/Github/heureka && LOGGING_SERVICE_URL=http://logging-microservice:3367 npm --prefix services/heureka-service run build'
# PASS tsc && tsc-alias
```

## Blockers And Caveats

- Live Catalog product-quality routes are deployed and protected: unauthenticated probes to `https://catalog.alfares.cz/api/products/review/quality` and `/export` returned HTTP `401`, not `404`.
- Live Heureka deployment is `localhost:5000/heureka-service:1cf0f32`, matching the validated current source commit; no new deploy was required for this docs-only merge.
- `[MISSING: per-product Catalog quality endpoint]`; Heureka correctly uses the stable review queue contract and bounded lookup fallback instead of inventing a per-product Catalog field/route.

## Result

Heureka is already source-implemented and validated for Goal 25 W4E consumer behavior. Mandatory Catalog product-quality blockers are surfaced and fail closed before Heureka feed inclusion confirmation and before XML feed/preview/download exposure. Heureka-specific stock, settings, feed XML, readiness lanes, dashboard, and compliance decisions remain owned by Heureka.

## Commit And Push Status

Merged into `main` and refreshed after current-main validation. This report is docs-only; no runtime mutation or deploy was required because the validated Heureka source is already live at `1cf0f32`.


## 2026-07-03 Current Main Refresh

Refresh evidence after merging the validation branch into current `main`:

- Heureka `main` before docs merge was `1cf0f32`; `824465e` is an ancestor of current `main`.
- Catalog `origin/main` was `7d77fd4`; `877bf98` remains an ancestor of Catalog `origin/main`.
- Current Heureka source still contains `getProductQualityReviewForProduct`, `catalog_quality_unavailable`, `hasCatalogQualityBlockers`, and `verify:heureka-blocked-product-lanes`.
- Live deployments: `catalog-microservice:e62bc63` ready `1/1`; `heureka-service:1cf0f32` ready `1/1`.
- Live protected route probes: `/api/products/review/quality` returned HTTP `401`; `/api/products/review/quality/export` returned HTTP `401`. This proves route presence and auth protection without reading product data.
- Current-main validation rerun passed: `git diff --check`, Catalog client self-test, feed-readiness self-test, feed-preview-readonly self-test, dashboard-list-products self-test, verifier syntax check, shared build, and Heureka service build.
