# TASK-010: Heureka Sales Channel Parity Checklist

Date: 2026-07-01
Repository: `/home/ssf/Documents/Github/heureka-service`
Status: active implementation checklist; safe parity slice deployed as `task-010-channel-parity-route-fix-20260701`; current Heureka category overrides populated through Catalog marketplace profiles

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation

- Vision: Heureka should behave like the other Alfares sales-channel services and reuse their frontend, Auth, Catalog, Orders, Logging, health, deploy, and validation patterns.
- Goal Impact: reduce maintenance variance and make Heureka operationally comparable with Allegro, Bazos, Aukro, and FlipFlop.
- System: `heureka-service` on `alfares`, with Catalog, Orders, Auth, Warehouse, Logging, and Kubernetes runtime contracts.
- Feature: sales-channel parity across public UI, dashboard, product/feed lifecycle, integrations, observability, and deploy validation.
- Task: close ready gaps without overwriting the already merged TASK-009 landing/dashboard work.
- Execution Plan: this checklist extends `docs/orchestrator/TASK-010-channel-parity-gap-plan.md`.
- Coding Prompt: copy proven contract shapes from reference channels; do not invent a Heureka-only architecture.
- Code: see implementation status below.
- Validation: record exact command evidence after every changed slice.

## Current State Summary

Remote repo resolved as `/home/ssf/Documents/Github/heureka-service`; `/home/ssf/Documents/Github/heureka` does not exist.

Reference baseline:

- Allegro is the primary parity target for hosted Auth, landing, dashboard, protected dashboard routes, admin users, product workflow pages, API split, and deploy validation.
- Aukro is the closest feed-oriented dashboard reference for catalog candidate lists, current offers, bulk publish controls, dry-run readiness, and guarded mutation.
- Bazos is the static Nest-rendered fallback reference for compact hosted Auth and client/admin dashboard shell.
- FlipFlop is the storefront/Next.js reference and is not the primary Heureka UI model, but its hosted Auth and `/api` ingress split remain useful.

## Feature Matrix

| Feature | Heureka status | Reference parity | Gap | Implementation owner | Validation |
| --- | --- | --- | --- | --- | --- |
| Public landing `/` | implemented | Allegro/Bazos/Aukro/FlipFlop all expose a public entry | No code gap; verify live after deploy | Frontend/public | `curl -I https://heureka.alfares.cz/` |
| Hosted Auth `/login`, `/register` | implemented with registration caveat | Allegro/Bazos/FlipFlop redirect to hosted Auth without local credential forms | Live pages include hosted Auth URL and return/callback token handling; approved Auth client registration evidence remains external | Frontend/Auth | `/login` and `/register` include `auth.alfares.cz` |
| Auth callback `/auth/callback` | partial | Allegro parses hash tokens, validates generated state, strips fragment, stores token | Heureka parses hash tokens; code/state fallback is not implemented and may not be required for hosted Auth | Frontend/Auth | browser or scripted hash callback smoke |
| Protected dashboard shell | implemented | Allegro has nested `/dashboard/products`, orders, operations, admin users; Aukro has feed/bulk dashboard | Heureka now has server-rendered shells for products, feed, orders, operations, settings, and admin; live route split is validated | Frontend/dashboard | protected API returns `401` without token; shell returns `200` |
| Dashboard product list | partial | Allegro/Aukro show catalog candidates with status, preview, and guarded action | Heureka has `catalog-products`; UI/API route naming must stay aligned | Dashboard API | `/heureka/dashboard/catalog-products` protected route smoke |
| Product detail/listing edit | implemented | Allegro/Aukro expose draft/detail before confirm | Heureka local listing edit writes Heureka `productName`/`categoryText` overrides to Catalog marketplace fields | Dashboard API | product detail includes `catalogMarketplaceProfile` |
| Dashboard orders | implemented | Allegro exposes protected order list/detail views backed by central Orders lifecycle | Heureka now exposes protected order list/detail APIs and a public dashboard shell route | Dashboard/orders | `/heureka/dashboard/orders` protected route smoke |
| Dashboard feed status/history/settings | implemented | Aukro exposes feed-oriented operational state and guarded settings/actions | Heureka now exposes feed status, feed history, settings read/update, and a `/dashboard/feed` shell route | Dashboard/feed | `/heureka/dashboard/feed/status` protected route smoke |
| Dashboard operations | implemented with blocker marker | Allegro/Aukro expose operations-oriented monitoring/action views | Heureka now exposes operations summary/history and marks `[MISSING: operation/audit log contract]` until a durable operation log contract exists | Dashboard/ops | `/dashboard/operations` shell and protected operation APIs |
| Catalog feed readiness | implemented | Catalog owns product truth; channel owns readiness/publication | Heureka readiness/include/exclude exists | Feed/Catalog | `verify:heureka-stock-readiness-live` |
| Catalog Heureka marketplace connector | implemented | Catalog has content previews and marketplace fields for channels | Heureka dashboard now consumes protected Catalog content/profile routes and can update marketplace overrides | Dashboard API + Catalog client | service build and protected product detail smoke |
| Orders communication | implemented | Orders owns central order lifecycle | Heureka order ingestion contract matches `orders.create.v1`; runtime token source still needs confirmation | Orders integration | `npm run verify:heureka-order-ingestion` |
| Logging microservice | implemented for config parity | services send logs to `LOGGING_SERVICE_URL` and keep local fallback | Repo configmap now includes live `LOGGING_SERVICE_URL`; full structured dashboard operation log remains a separate contract gap | Ops/logging | build plus config diff review |
| Health | implemented | all services expose `/health` and k8s probes | Basic health only; deep dependency health is future work | Ops/observability | `curl -I https://heureka.alfares.cz/health` |
| Kubernetes config | implemented | deploy manifests should match live runtime | repo configmap name/env aligned with live `heureka-config`; deployed in TASK-010 route-fix rollout | Ops/deploy | `npm run ips:deployment-readiness` |
| Docker runtime port | implemented | service listens on `3800` | Dockerfile now exposes `3800` | Build/deploy | service build |
| Gateway/nginx | partial | reference channels route `/api/*` to API gateway and `/` to frontend/service | legacy `nginx/gateway-proxy.conf` rewrites non-feed `/heureka/*` to Aukro; direct ingress is correct | Nginx/platform | route smoke through production host |
| External Heureka shop/import | unknown | channel-specific external onboarding is owner/data-dependent | `[UNKNOWN: shop approval and legal/company fields]`; category mapping no longer blocks current active Catalog products, but description/image/stock quality still blocks some products | Owner + Catalog | external Heureka UI/API check |

## Implementation Order

1. Safe now: docs checklist, repo configmap parity, Docker `EXPOSE 3800`, production-safe JWT guard logging.
2. Safe now: backend Catalog content/profile consumption in Heureka dashboard detail.
3. Safe now: dashboard parity expansion for orders, feed status/history/settings, operations/history, and public shell routes.
4. Dependency-gated: deploy/restart and route smoke, because current live image is owned by the latest TASK-009 deployment until TASK-010 rollout.
5. Blocked: external Heureka registration/import completion until owner-supplied business/legal facts exist.

## Ready Implementation Tasks

| Task | Status | Allowed files | Forbidden files | Notes |
| --- | --- | --- | --- | --- |
| Repo runtime config parity | implemented | `k8s/configmap.yaml`, `Dockerfile` | service source files | Source manifests now match live config naming and service port expectations. |
| Auth guard logging hygiene | implemented | `shared/auth/jwt-auth.guard.ts` | public UI files | Production token-structure console logging is gated behind explicit debug mode. |
| Catalog profile dashboard integration | implemented | `shared/clients/catalog-client.service.ts`, `services/heureka-service/src/heureka/dashboard/dashboard.service.ts` | k8s, Dockerfile | Reads Catalog protected content/profile endpoints with service headers and writes Heureka marketplace overrides. |
| Dashboard UI parity expansion | implemented | `services/heureka-service/src/public/public.controller.ts`, `services/heureka-service/src/main.ts` | k8s | Product/detail, feed, orders, operations, settings, and admin shells are route-aware. |
| Dashboard orders API parity | implemented | `services/heureka-service/src/heureka/dashboard/dashboard.controller.ts`, `services/heureka-service/src/heureka/dashboard/dashboard.service.ts` | k8s, Dockerfile | Adds protected orders list/detail routes using existing Heureka order repository state. |
| Dashboard feed/settings API parity | implemented | `services/heureka-service/src/heureka/dashboard/dashboard.controller.ts`, `services/heureka-service/src/heureka/dashboard/dashboard.service.ts` | k8s, Dockerfile | Adds protected feed status/history/settings routes; settings update remains admin-gated. |
| Dashboard operations API parity | implemented with blocker marker | `services/heureka-service/src/heureka/dashboard/dashboard.controller.ts`, `services/heureka-service/src/heureka/dashboard/dashboard.service.ts` | k8s, Dockerfile | Adds operations/history summary and returns `[MISSING: operation/audit log contract]` until the shared operation-log contract exists. |
| Orders/logging runtime smoke | implemented | scripts/reports only | source code unless smoke exposes a defect | Protected dashboard API routes and live health/readiness smokes passed after route-fix deployment. |

## Implementation Evidence

- `Dockerfile`: changed exposed runtime port from `3000` to `3800`.
- `k8s/configmap.yaml`: aligned source config name/env keys with live `heureka-config`, including `LOGGING_SERVICE_URL`, Auth/Warehouse/Notification/RabbitMQ URLs, gateway timeout keys, and `DB_HOST=db-server-postgres`.
- `shared/auth/jwt-auth.guard.ts`: removed production token-structure console logging; detailed guard logs now require `NODE_ENV=development` or `AUTH_GUARD_DEBUG=true`.
- `shared/clients/catalog-client.service.ts`: added protected Catalog read/write helpers for Heureka content preview and marketplace fields using internal service headers.
- `services/heureka-service/src/heureka/dashboard/dashboard.service.ts`: product detail now includes Catalog content/profile data, uses Heureka `categoryText` in listing/gap calculation, and saves dashboard marketplace overrides to Catalog.
- `services/heureka-service/src/heureka/dashboard/dashboard.service.ts`: added dashboard parity APIs for orders list/detail, feed status/history/settings, operations summary/history, runtime status, and operation action metadata.
- `services/heureka-service/src/heureka/dashboard/dashboard.controller.ts`: added protected routes for `/heureka/dashboard/orders`, `/heureka/dashboard/feed/*`, `/heureka/dashboard/operations`, and `/heureka/dashboard/settings`.
- `services/heureka-service/src/main.ts`: keeps conflicting protected API routes under `/heureka/dashboard/*` and rewrites exact public shell paths `/dashboard/orders`, `/dashboard/operations`, and `/dashboard/settings` to the dashboard shell before global-prefix routing.
- `services/heureka-service/src/public/public.controller.ts`: dashboard listing form now exposes editable `Heureka category`; shell navigation now includes Feed, Orders, Operations, Settings, Admin Users and loads the matching protected APIs per route.
- Catalog marketplace profiles: populated 32 Heureka `overrides.categoryText` values through protected `PUT /api/products/:productId/marketplace-fields/heureka`, matching the shared Catalog-owned marketplace override pattern used by reference channels. No Heureka-local category fallback was added.

## Open Blockers

- `[UNKNOWN: dedicated production secret source for HEUREKA_INTERNAL_SERVICE_TOKEN]`; live currently sources `HEUREKA_INTERNAL_SERVICE_TOKEN` from `catalog-microservice-secret/CATALOG_INTERNAL_SERVICE_TOKEN` so Catalog can call Heureka feed mutation routes.
- `[UNKNOWN: whether external Heureka shop approval must complete before feed validity details update]`.
- `[RESOLVED: Heureka category mapping for current Catalog products]`; current active Catalog products no longer report `MISSING_CATEGORY` after Heureka `categoryText` overrides were populated in Catalog marketplace profiles.
- `[MISSING: product public description for 23 current active products]`; bulk readiness still reports `MISSING_DESCRIPTION`.
- `[MISSING: stock for 24 current active products]`; bulk readiness still reports `ZERO_STOCK`.
- `[MISSING: primary image for 11 current active products]`; bulk readiness still reports `MISSING_PRIMARY_IMAGE`.
- `[MISSING: owner-supplied e-shop registration legal/company fields for external Heureka completion]`.
- `[MISSING: operation/audit log contract]`; Heureka now surfaces feed/order history, but there is no durable shared operation-log API contract to mirror Allegro/Aukro style operations timelines exactly.
- `[RESOLVED: TASK-010 production rollout]`; initial rollout was deferred during unrelated FlipFlop/Leads activity, then deployed successfully as `localhost:5000/heureka-service:task-010-channel-parity-route-fix-20260701`.
- `[UNKNOWN: owner of k8s/external-secret.yaml runtime change]`; during TASK-010 validation, a parallel process changed `JWT_SECRET` remoteRef from `secret/prod/heureka-service` to `secret/prod/auth-microservice`, applied the ExternalSecret, and restarted Heureka on the previous TASK-009 image. The new pod became healthy; this was not a TASK-010 image deployment.

## Validation Bundle

Run after code edits:

```bash
git diff --check
npm --prefix shared run build
LOGGING_SERVICE_URL=http://logging-microservice:3367 npm --prefix services/heureka-service run build
npm run verify:heureka-order-ingestion
npm run verify:heureka-stock-readiness-live
```

Pre-deploy validation evidence captured on 2026-07-01:

- `git diff --check` -> PASS.
- `npm run ips:audit` -> PASS, documentation audit score 100/100.
- `npm run ips:pre-coding` -> PASS, report `reports/validation/ips-pre-coding-gate.json`.
- `npm run ips:deployment-readiness` -> PASS, report `reports/validation/ips-deployment-readiness-gate.json`.
- `npm --prefix shared run build` -> PASS.
- `LOGGING_SERVICE_URL=http://logging-microservice:3367 npm --prefix services/heureka-service run build` -> PASS.
- `npm run verify:heureka-order-ingestion` -> PASS.
- In-pod `npm run verify:heureka-stock-readiness-live` from `heureka-service-64dd4994fd-w6qhd` -> PASS for stock contract; product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee` has Warehouse/readiness stock `60/60`, readiness `blocked`, blocker `MISSING_CATEGORY`.
- Production route smoke on current TASK-009 image -> `/`, `/health`, `/dashboard` return `200`; `/heureka/dashboard/me` returns expected unauthenticated `401`.
- After parallel ExternalSecret restart, Heureka remained on image `localhost:5000/heureka-service:task-009-dashboard-visual-fidelity-20260701d`; new pod returned `/health` 200 and `/heureka/dashboard/me` 401 without token.
- First TASK-010 deploy by a parallel process produced image `localhost:5000/heureka-service:task-010-admin-users-20260701a`; live smoke exposed a route bug where `/heureka/dashboard/orders` and `/heureka/dashboard/settings` returned `404` because exact public dashboard exclusions stripped the API prefix.
- Route-fix build `LOGGING_SERVICE_URL=http://logging-microservice:3367 npm --prefix services/heureka-service run build` -> PASS.
- Route-fix deploy `./scripts/deploy.sh task-010-channel-parity-route-fix-20260701` -> PASS; image digest `sha256:5cdd2aa32a5c397849dc694b5700c539d1738697361c23594d7272908e637145`; deployment image `localhost:5000/heureka-service:task-010-channel-parity-route-fix-20260701`; pod `heureka-service-bb56946f4-ghq9q` `1/1 Running`.
- Post-deploy public route smoke -> `/`, `/health`, `/dashboard`, `/dashboard/feed`, `/dashboard/orders`, `/dashboard/operations`, `/dashboard/settings`, `/dashboard/admin/users` all returned `200`.
- Post-deploy hosted Auth smoke -> `/login`, `/register`, and `/auth/callback` returned `200` and included `auth.alfares.cz`, `return_to`, and access-token callback markers.
- Post-deploy protected route smoke without token -> `/heureka/dashboard/me`, `/heureka/dashboard/orders`, `/heureka/dashboard/orders/test`, `/heureka/dashboard/feed/status`, `/heureka/dashboard/feed/history`, `/heureka/dashboard/feed/settings`, `/heureka/dashboard/operations`, `/heureka/dashboard/operations/history`, `/heureka/dashboard/settings` all returned `401`.
- Post-deploy Nest route log confirms protected mappings for `/heureka/dashboard/orders`, `/heureka/dashboard/orders/:id`, `/heureka/dashboard/operations`, `/heureka/dashboard/operations/history`, and `/heureka/dashboard/settings`.
- Post-deploy in-pod `npm run verify:heureka-stock-readiness-live` from `heureka-service-bb56946f4-ghq9q` -> PASS for stock contract; product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee` has Warehouse/readiness stock `60/60`, readiness `blocked`, blocker `MISSING_CATEGORY`.
- Category population dry-run through Catalog marketplace-fields contract -> 32 proposed, 8 skipped with no matching rule; proposed groups: 13 memory cards, 4 USB flash drives, 14 snowtubing sleds, 1 party balloon.
- Category population apply through Catalog marketplace-fields contract -> 32 Heureka `overrides.categoryText` values written; post-apply dry-run -> `existing_categoryText=32`, `no_rule=8`, `proposedCount=0`.
- Post-category live default verifier `npm run verify:heureka-stock-readiness-live` from `heureka-service-bb56946f4-ghq9q` -> PASS; product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee` has Warehouse/readiness stock `60/60`, readiness `ready`, blockerCodes `[]`.
- Post-category bulk readiness for 40 active products -> `ready=16`, `blocked=24`, `missingCategoryCount=0`; remaining blocker counts: `MISSING_DESCRIPTION=23`, `ZERO_STOCK=24`, `MISSING_PRIMARY_IMAGE=11`.
- Post-category Catalog snapshot for `884c1c5e-fe94-46c7-aab1-78bcc424e7ee` -> `CATEGORYTEXT="Sport | Zimní sporty | Sáně a boby"`, `overridesApplied=["categoryText"]`.
- Post-category public feed smoke -> `https://heureka.alfares.cz/heureka/feed?type=heureka_cz` returned `200` and rendered `CATEGORYTEXT` tags.

Deploy gate, only after successful build/tests:

```bash
./scripts/deploy.sh
curl -I https://heureka.alfares.cz/
curl -I https://heureka.alfares.cz/health
curl -I https://heureka.alfares.cz/dashboard
curl -I https://heureka.alfares.cz/heureka/dashboard/me
curl -I https://heureka.alfares.cz/dashboard/orders
curl -I https://heureka.alfares.cz/dashboard/feed
curl -I https://heureka.alfares.cz/dashboard/operations
curl -I https://heureka.alfares.cz/dashboard/settings
curl -I https://heureka.alfares.cz/heureka/dashboard/orders
curl -I https://heureka.alfares.cz/heureka/dashboard/feed/status
curl -I https://heureka.alfares.cz/heureka/dashboard/operations/history
```
