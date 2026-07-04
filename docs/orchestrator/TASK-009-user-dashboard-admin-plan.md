# TASK-009 User Dashboard And Admin Section

Date: 2026-07-01
Repository: `heureka-service`
Status: completed

## Vision

Give registered Heureka service users a protected dashboard where they can select Catalog products, include them in the Heureka feed, edit Heureka listing fields, regenerate the feed, and let administrators inspect registered users and service-wide statistics.

## Goal Impact

This turns Heureka from a backend-only XML feed worker into an operator-facing marketplace channel like Allegro, Bazos, and FlipFlop, while preserving Catalog as product truth and Auth as identity truth.

## System

- Runtime system: `heureka-service` on `https://heureka.alfares.cz`.
- Identity system: `auth-microservice` hosted Auth, token handoff through `/auth/callback`.
- Product system: `catalog-microservice` read APIs for product, pricing, and media.
- Inventory system: `warehouse-microservice` stock read APIs.
- Feed system: existing Heureka XML generation and `heureka_products` inclusion table.

## Feature

1. Hosted Auth entry points:
   - `/login`
   - `/register`
   - `/auth/callback`
2. User dashboard:
   - `/dashboard`
   - `/dashboard/products`
   - product search, readiness, include/exclude, listing editor, feed regeneration.
3. Admin section:
   - `/dashboard/admin/users`
   - accessible only to admin role holders or configured admin emails.
   - default admin email allowlist includes `ssfskype@gmail.com` and `test@example.com`.
4. Dashboard API:
   - `/heureka/dashboard/me`
   - `/heureka/dashboard/summary`
   - `/heureka/dashboard/products`
   - `/heureka/dashboard/products/:productId`
   - `/heureka/dashboard/products/:productId/listing`
   - `/heureka/dashboard/products/:productId/include`
   - `/heureka/dashboard/feed/regenerate`
   - `/heureka/dashboard/admin/users`
   - `/heureka/dashboard/admin/stats`

## Task

Implement a first production-safe dashboard inside `heureka-service` without changing live database schema. Reuse existing Prisma models:

- `HeurekaProduct` for feed inclusion.
- `HeurekaOffer` for local listing overrides.
- `HeurekaFeed` for feed status/history.
- `HeurekaOrder` for service statistics.
- `HeurekaSettings` for feed configuration status.

## Execution Plan

1. Inspect existing Heureka, Allegro, Bazos, FlipFlop, Auth, and Catalog patterns.
2. Save this TASK-009 plan before coding.
3. Add dashboard backend module guarded by Auth JWT.
4. Preserve Auth role strings in the shared JWT guard so admin authorization can work.
5. Add admin-only server checks with role and email allowlist:
   - `global:superadmin`
   - `global:platform_admin`
   - `app:heureka-service:admin`
   - `app:heureka:admin`
   - `heureka:admin`
   - `ssfskype@gmail.com`
   - `test@example.com`
6. Add static dashboard shell served by the Heureka backend:
   - hosted Auth redirects with `client_id=heureka-service`
   - fragment callback parsing and state validation
   - local transitional token storage
   - authenticated API calls
7. Validate with:
   - `git diff --check`
   - `npm --prefix shared run build`
   - `LOGGING_SERVICE_URL=http://logging-microservice:3367 npm --prefix services/heureka-service run build`
   - `npm run ips:audit`
   - `npm run ips:pre-coding`
8. Deploy with `./scripts/deploy.sh` after validation unless blocked by live preflight.
9. Smoke:
   - `https://heureka.alfares.cz/`
   - `https://heureka.alfares.cz/login`
   - `https://heureka.alfares.cz/heureka/dashboard/me` returns `401` without token.
   - `https://heureka.alfares.cz/health` returns ok.

## Coding Prompt

Implement TASK-009 in the remote `heureka-service` repository only. Do not edit local MacBook project code. Keep existing feed and order contracts stable. Add the smallest dashboard API and static UI needed to satisfy the user dashboard/admin requirement. Do not invent a Catalog `heureka` marketplace connector until the Catalog contract is explicitly added.

## Code Ownership

Allowed files:

- `docs/orchestrator/TASK-009-user-dashboard-admin-plan.md`
- `STATE.json`
- `TASKS.md`
- `shared/auth/auth.interface.ts`
- `shared/auth/jwt-auth.guard.ts`
- `services/heureka-service/src/app.module.ts`
- `services/heureka-service/src/main.ts`
- `services/heureka-service/src/heureka/dashboard/*`
- `services/heureka-service/web/public/*`
- `Dockerfile`
- `services/heureka-service/Dockerfile`

Forbidden files:

- `scripts/smoke_heureka_order_ingestion_live.js` because it contains pre-existing unrelated changes.
- `prisma/schema.prisma` until a reviewed migration plan exists.
- `catalog-microservice` files in this TASK-009 implementation pass.
- Auth database, roles, secrets, or live token values.

## Parallel Execution

| Workstream | Status | Owner role | Scope | Dependencies | Validation owner | Merge order |
| --- | --- | --- | --- | --- | --- | --- |
| A. Allegro/Bazos pattern inspection | complete | Explorer | Read-only comparison of hosted Auth, dashboard, admin, catalog-sell routes | None | Orchestrator | 1 |
| B. FlipFlop/Catalog inspection | complete | Explorer | Read-only comparison of Catalog marketplace profiles, content previews, publish status | None | Orchestrator | 1 |
| C. Heureka dashboard backend | ready now | Orchestrator | `services/heureka-service/src/heureka/dashboard/*`, shared Auth role preservation | A, B | Orchestrator | 2 |
| D. Heureka static UI | ready now | Orchestrator | `services/heureka-service/web/public/*`, static serving in `main.ts` | C route contract | Orchestrator | 3 |
| E. Catalog Heureka connector | dependency-gated | Future worker | Add `heureka` marketplace profile/preview/publish parity to `catalog-microservice` | Approved Catalog contract and fields | Catalog integration owner | later |
| F. DB user-profile scoping | dependency-gated | Future worker | Add app-local Heureka user/profile/account ownership | Reviewed Prisma migration plan | Heureka integration owner | later |
| G. Deploy/live smoke | final integration | Orchestrator | Build, deploy, route smoke | C and D validation | Orchestrator | final |

## Shared Contracts

- Catalog product truth remains in `catalog-microservice`.
- Heureka first-pass publish semantics mean local feed inclusion plus feed regeneration.
- `[UNKNOWN: external Heureka submission API]`; no external Heureka API submission is implemented in this pass.
- `[MISSING: Catalog heureka marketplace profile connector]`; the dashboard uses local Heureka listing overrides until Catalog adds the connector.
- `[MISSING: app-local user profile table]`; admin users are sourced from Auth admin APIs and local Heureka usage statistics.

## Validation

Planned validation evidence:

- Source build evidence for shared and Heureka service.
- IPS audit and pre-coding evidence.
- HTTP route evidence after deploy.
- Admin endpoint evidence must not print raw token, password, secret, or production user-data dumps.

## Handoff Notes

Next follow-up should define Catalog Heureka marketplace fields. Candidate field set:

- `categoryText`
- `productName`
- `description`
- `manufacturer`
- `ean`
- `deliveryDate`
- `deliveryPrice`
- `freeDeliveryThreshold`
- `includeInFeed`

Only after that contract exists should Catalog add `heureka` to marketplace fields, content previews, and product publication channels.

## Completion Evidence

- Source validation: `git diff --check`, `npm --prefix shared run build`, `npx ts-node services/heureka-service/src/public/public-dashboard-routes.self-test.ts`, `npx ts-node services/heureka-service/src/heureka/dashboard/dashboard-list-products.self-test.ts`, `npx ts-node services/heureka-service/src/heureka/dashboard/dashboard-operations-history.self-test.ts`, `npx ts-node services/heureka-service/src/heureka/dashboard/dashboard-order-read-model.self-test.ts`, `LOGGING_SERVICE_URL=http://logging-microservice:3367 npm --prefix services/heureka-service run build`, `npm run ips:audit`, and `npm run ips:pre-coding`.
- Runtime integration: deploy from remote `main` ran successfully through image build, push, manifest apply, and rollout trigger for tag `be7c128`; production smoke returned HTTP 200 for `/` and `/login`, HTTP 401 for `/heureka/dashboard/me` without token, and `health.status=ok`. The new pods remained in `ContainerCreating` while pulling images, so rollout settlement is still pending cluster-side.
- Outcome: hosted Auth public routes, guarded dashboard API, feed controls, product listing/admin surfaces, and admin statistics are implemented without a schema migration.
