# Orders Lifecycle UI Reliability Report - Heureka

Date: 2026-07-03
Worker: Frontend-A
Scope: public dashboard customer/admin order lifecycle UI only.

## Intent Preservation

- Vision: channel dashboards show canonical Orders lifecycle without owning lifecycle truth.
- Goal Impact: Heureka dashboard order rows/details and admin lifecycle metrics have explicit friendly coverage for every known Orders lifecycle stage.
- System: Orders remains lifecycle authority; Heureka renders central lifecycle read-model fields and local status separately.
- Feature: dashboard orders route keeps 30s visible polling and renders full lifecycle labels through a dashboard label map.
- Task: add explicit lifecycle label coverage and verifier assertions.
- Execution Plan: extend `public.controller.ts` humanizer with central lifecycle labels; update dashboard route self-test and readiness verifier.
- Coding Prompt: do not touch Orders docs or shared schemas; do not print customer/order/token payloads.
- Code: `services/heureka-service/src/public/public.controller.ts`, `services/heureka-service/src/public/public-dashboard-routes.self-test.ts`, `scripts/verify_heureka_orders_runtime_readiness.js`.
- Validation: see commands below.

## Coverage

Covered lifecycle stages: `ordered_unpaid`, `payment_failed`, `paid_not_delivered`, `warehouse_fulfillment_requested`, `warehouse_collecting`, `warehouse_forming`, `warehouse_formed`, `handed_to_delivery`, `in_delivery`, `received`, `not_received`, `returned`, `cancelled`.

Refresh: existing `ORDER_STATUS_POLL_MS = 30000` and `visibilitychange` pause/resume behavior retained and asserted.

Sensitive output: source verifiers print no token values, customer payloads, order rows, tracking values, provider payloads, or DB rows.

## Validation

- `npx ts-node --skip-ignore --compiler-options '{"types":["node"]}' services/heureka-service/src/public/public-dashboard-routes.self-test.ts` -> PASS.
- `npm run verify:heureka-orders-runtime-readiness` -> PASS, source mode, blockers empty.
- `npm --prefix services/heureka-service run build` -> PASS.


## 2026-07-03 Route Collision Fix Deployment

- Fixed the protected dashboard order list route collision by adding `GET /heureka/dashboard/orders-list` while keeping public shell `/dashboard/orders` and detail hydration `/heureka/dashboard/orders/:id` unchanged.
- Dashboard polling now uses `/heureka/dashboard/orders-list?limit=50&status=...`, so the public shell global-prefix exclusion no longer hides the protected list API.
- Commit/deploy: `e4b97fe fix: add heureka dashboard orders api alias`, images `localhost:5000/heureka-service:e4b97fe` and `localhost:5000/heureka-api-gateway:e4b97fe`, both ready/available `1/1`.
- Validation before deploy: public dashboard route self-test, `npm run verify:heureka-orders-runtime-readiness`, `services/heureka-service` build, and `git diff --check`.
- Runtime smoke after deploy: `/dashboard/orders` HTTP 200, `/api/health` HTTP 200, unauthenticated `/api/heureka/dashboard/orders-list?limit=5&status=all` HTTP 401, in-pod authenticated `/heureka/dashboard/orders-list?limit=5&status=all` HTTP 200 with aggregate `total=4`, `orders=4`, `centralStatusCounts.available=0`, `missingId=1`, `stale=4`, `unknown=4`. Token value and raw order rows were not printed.
- Remaining gate: `[MISSING: approved Heureka live row linked to a current non-stale canonical Orders lifecycle stage, then rendered customer/admin lifecycle proof]`.

## Remaining Gates

- [MISSING: browser smoke] `/dashboard/orders`, `/dashboard/orders/:id`, and `/dashboard/admin/users` were not browser-smoked in a live deployed environment in this source-only slice.
- [MISSING: deploy] Source changes were not deployed in this worker slice.
