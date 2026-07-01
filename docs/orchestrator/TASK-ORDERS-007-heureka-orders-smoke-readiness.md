# TASK-ORDERS-007 - Heureka Orders Smoke Production Readiness

Date: 2026-07-01
Status: blocked on runtime schema prerequisites
Owner: Heureka Orders smoke / production readiness lane

## Intent Preservation Chain

Vision: Alfares marketplace channels should create canonical Orders without duplicating order lifecycle, Catalog product truth, Warehouse stock truth, or reservation authority.

Goal Impact: Goal 7.2 verifies Heureka can safely create a synthetic Orders order, replay the same idempotency key, and expose Warehouse reservation handoff evidence.

System: Heureka receives or replays Heureka-channel order facts; Orders owns canonical order lifecycle; Catalog owns product identity; Warehouse owns stock and reservation truth.

Feature: `POST /heureka/orders/ingest` production smoke for create, idempotent replay, and Warehouse reservation readback.

Task: Prepare and run a sanitized live smoke only when runtime prerequisites are present; otherwise leave exact machine-actionable blockers.

Execution Plan: Add a fail-closed live smoke runner, verify source contract/builds, run pod-local preflight, and execute production POST only when preflight has no `[MISSING: ...]` markers.

Coding Prompt: Do not print token values, customer data, raw request bodies, or secret-derived data. Report only channel, idempotency key shape, HTTP statuses, order id presence, replay status, and reservation status presence.

Code: `scripts/smoke_heureka_order_ingestion_live.js` added as a lane-local smoke runner. It defaults to preflight-only and requires `--execute` or `HEUREKA_ORDER_SMOKE_EXECUTE=true` for the mutating live smoke.

Validation: See command evidence below.

## Source Readiness Evidence

- `POST /heureka/orders/ingest` is implemented and guarded by `HeurekaOrderIngestionGuard`.
- `HeurekaOrdersService` resolves an active Heureka account, canonical Catalog product, and Warehouse route before forwarding.
- `OrderClientService` forwards `orders.create.v1`, `channel=heureka`, stable idempotency fields, `items[].warehouseId`, and machine-auth headers to Orders.
- `node scripts/verify_heureka_order_ingestion_contract.js` passed.

## Runtime Preflight Evidence

Command shape:

```bash
kubectl exec -n statex-apps heureka-service-7cc6669594-smbvv -- node /tmp/smoke_heureka_order_ingestion_live.js
```

Sanitized result:

- channel: `heureka`
- endpoint: `/heureka/orders/ingest`
- Heureka health status: `200`
- Catalog product status: `200`
- Warehouse stock status: `200`
- reservable Warehouse route count: `1`
- selected Warehouse route: `c0de0000-0000-4000-8000-000000000013`
- runtime schema check: completed
- present required order tables: none
- missing required order tables:
  - `[MISSING: public.heureka_accounts]`
  - `[MISSING: public.heureka_orders]`
  - `[MISSING: public.heureka_offers]`

## Live Smoke Attempt

The first live smoke attempt was run after the initial preflight confirmed service, Catalog, and Warehouse prerequisites but before the smoke runner checked the Heureka Prisma tables.

Sanitized result:

- first POST status: `500`
- replay POST status: `500`
- order id presence: `false`
- replay flag: `false`
- reservation status presence: `false`
- error summary: internal server error
- pod log root cause: Prisma failed because `public.heureka_accounts` does not exist.

No order id was returned and no reservation status was present. The failure occurs while resolving the Heureka account, before forwarding to Orders.

## Blockers

- `[MISSING: public.heureka_accounts]` - required by `HeurekaOrdersService.resolveAccount`.
- `[MISSING: public.heureka_orders]` - required for local Heureka forwarding/idempotency evidence.
- `[MISSING: public.heureka_offers]` - required for mapped Heureka offer ingestion paths.
- `[UNKNOWN: active Heureka account mapping]` - cannot be verified until `public.heureka_accounts` exists.
- `[UNKNOWN: successful Orders reservation handoff for Heureka]` - cannot be verified until the Heureka schema blocker is removed and the live smoke can create an order.

## Unblock Plan

1. Database/schema owner prepares a reviewed Heureka schema initialization or migration for `prisma/schema.prisma` tables without printing secrets.
2. Database/schema owner applies the approved schema change to the configured `heureka` production database.
3. Heureka owner verifies or creates an active Heureka account mapping suitable for synthetic smoke.
4. Integration owner reruns:
   - `node scripts/verify_heureka_order_ingestion_contract.js`
   - `npm --prefix shared run build`
   - `npm --prefix services/heureka-service run build`
   - pod-local `node /tmp/smoke_heureka_order_ingestion_live.js`
   - pod-local `HEUREKA_ORDER_SMOKE_EXECUTE=true node /tmp/smoke_heureka_order_ingestion_live.js --execute`

## Parallel Execution

| Workstream | Status | Owner Role | Scope | Blockers | Validation Owner | Handoff |
| --- | --- | --- | --- | --- | --- | --- |
| Heureka DB schema initialization | ready now | database/schema owner | Heureka production database schema for Prisma tables only | approval for schema application; no secret exposure | database/schema owner | Report table presence and active account mapping without row data. |
| Heureka smoke rerun | dependency-gated | integration owner | `scripts/smoke_heureka_order_ingestion_live.js` and sanitized pod execution | `[MISSING: public.heureka_accounts]`, `[MISSING: public.heureka_orders]`, `[MISSING: public.heureka_offers]` | integration owner | Rerun create/replay/reservation smoke after schema unblock. |
| Orders/Warehouse/Catalog changes | blocked/forbidden in this lane | owning service teams | none from this thread | this lane may not edit those repos | owning service teams | Not needed unless the post-schema smoke exposes a downstream blocker. |

## Deployment

No deployment was run. The new smoke runner was copied into the running pod as a temporary verifier after source validation.
