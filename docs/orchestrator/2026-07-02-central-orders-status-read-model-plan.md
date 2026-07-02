# Heureka Central Orders Status Read Model Plan

Date: 2026-07-02
Parent plan: `orders-microservice/docs/orchestrator/2026-07-02-order-lifecycle-warehouse-status-rollout-plan.md`

## Objective

Heureka dashboard/order views must show central Orders lifecycle for every forwarded order and must flag orders missing a central Orders id.

## Current Evidence

- Heureka imports or ingests marketplace orders.
- The service forwards orders to central Orders and stores `orderId`.
- Dashboard order output currently appears to expose local status and forwarding state rather than full central lifecycle.

## Workstream

Owner role: Heureka read-model owner
Status: ready after Orders read contract

Allowed files:

- `services/heureka-service/src/heureka/**`
- Heureka docs, tests, validation reports

Forbidden files:

- unrelated marketplace sync/import code unless needed for order id mapping

## Required Work

1. Read central Orders by stored `orderId` or consume lifecycle events.
2. Render central lifecycle stage in dashboard/order detail.
3. Mark unforwarded orders as actionable errors.
4. Avoid presenting stale local status as canonical.

## Validation

- forwarded order shows central Orders id and lifecycle
- missing central Orders id is visible
- Orders API failure is shown as stale/unknown, not as a fake status

## 2026-07-02 H1 Worker Handoff

Role: Heureka read-model owner.

Intent Preservation Chain:

- Vision: Alfares marketplace channels show canonical Orders lifecycle without making Heureka the lifecycle owner.
- Goal Impact: Heureka dashboard order rows now prefer central Orders lifecycle/status when a stored central order id exists.
- System: Heureka reads `heureka_orders.orderId`; Orders remains lifecycle authority; Heureka local `status` is retained only as `localStatus`.
- Feature: Dashboard central Orders status read model for `/heureka/dashboard/orders` and order detail.
- Task: Add tolerant Orders readback, serialize central lifecycle, and render unknown/stale or missing id states without invented status.
- Execution Plan: Reuse stored `heureka_orders.orderId`, call existing Orders readback path through the shared client, normalize common lifecycle/status fields, and fail open to `unknown`/`stale` with `[MISSING: ...]` markers.
- Coding Prompt: Do not assume an Orders lifecycle DTO beyond current readback availability; preserve concurrent dirty work; do not deploy or push.
- Code: `shared/clients/order-client.service.ts`, `services/heureka-service/src/heureka/dashboard/dashboard.service.ts`, `services/heureka-service/src/public/public.controller.ts`, and `services/heureka-service/src/heureka/dashboard/dashboard-order-read-model.self-test.ts`.
- Validation: See evidence below.

Implementation notes:

- `OrderClientService.getOrderById(orderId)` reads `GET /api/orders/:orderId` with existing Orders auth headers and returns a non-throwing read result.
- Dashboard order list/detail enrich serialized orders with `centralLifecycle`, `lifecycleStatus`, `lifecycleStage`, `localStatus`, and page-level `centralStatusCounts`.
- Missing `heureka_orders.orderId` is visible as `centralLifecycle.state=missing_id`, `status=unknown`, `stale=true`, and `[MISSING: central Orders id]`.
- Orders read failure or unavailable read contract/client method is visible as `centralLifecycle.state=stale`, `status=unknown`, and `[MISSING: Orders lifecycle read contract/client method]`.
- Public dashboard order table now labels central lifecycle separately from local Heureka status and forwarding state.

Validation evidence:

- `git diff --check`: passed.
- `npm --prefix shared run build`: passed.
- `npx ts-node --skip-ignore --compiler-options '{"types":["node"]}' services/heureka-service/src/heureka/dashboard/dashboard-order-read-model.self-test.ts`: passed.
- `npm run verify:heureka-order-ingestion`: passed.
- `npm run verify:heureka-orders-runtime-readiness`: passed in source mode with `blockers: []`.
- `LOGGING_SERVICE_URL=http://logging-microservice:3367 npm --prefix services/heureka-service run build`: passed.
- `npx ts-node --skip-ignore --compiler-options '{"types":["node"]}' services/heureka-service/src/heureka/dashboard/dashboard-operations-history.self-test.ts`: passed.

Validation caveat:

- `npx ts-node --skip-ignore --compiler-options '{"types":["node"]}' services/heureka-service/src/heureka/dashboard/dashboard-list-products.self-test.ts`: failed in concurrent local-resale dirty work with `Expected /heureka/dashboard/products/owned-product/resale, received /heureka/dashboard/products/catalog-product-4/resale`. This is outside the central Orders read-model objective and was not changed by this H1 worker.

Blockers:

- `[MISSING: Orders lifecycle read contract/client method]` is intentionally surfaced at runtime if Orders readback is unavailable, unauthorized, or returns an unusable payload.
- `[UNKNOWN: exact stable Orders lifecycle DTO field names]`; the read model currently normalizes common fields such as `lifecycleStatus`, `status`, `lifecycleStage`, `stage`, and warehouse handoff status.

Deployment:

- Not run. No push or deploy was requested.
