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

## 2026-07-01 Current Runtime Verification

Role: integration validator / smoke gate.

Intent Preservation Chain:

- Vision: Alfares marketplace channels should create canonical Orders without duplicating order lifecycle, Catalog product truth, Warehouse stock truth, or reservation authority.
- Goal Impact: Goal 7.2A verifies Heureka-side readiness for a sanitized create, idempotent replay, and Warehouse reservation readback smoke.
- System: Heureka, Orders, Catalog, and Warehouse remain separately owned; Heureka only forwards accepted channel order facts.
- Feature: `POST /heureka/orders/ingest` smoke gate.
- Task: Verify runtime env names, source forwarding contract, and pod-local smoke prerequisites without printing secrets or raw production data.
- Execution Plan: Read repo instructions/contracts, validate source contract/builds, inspect live env-name presence only, run pod-local preflight, and do not execute mutating smoke while any `[MISSING: ...]` blocker remains.
- Coding Prompt: No source/runtime changes were required; evidence is recorded in this document only.
- Code: Source remains ready; the live runtime image is `localhost:5000/heureka-service:92c0bb0`, and remote head `9c4c308` differs from that image only by documentation and the lane-local smoke script.
- Validation: See command evidence below.

### Instruction Discovery

- `AGENTS.md`, `CLAUDE.md`, `AGENT_OPERATIONS.md`, `PLAN.md`, the order ingestion contract, service/client files, smoke scripts, and Kubernetes manifests were read from the remote repo.
- Docs RAG lookup retried through the pod Node runtime after the documented `curl` path failed because `curl` is not installed in the Heureka container; the Node query returned status `200` with empty context and no sources.

### Runtime Env Presence

Presence only; no values were printed.

- `JWT_TOKEN`: present.
- Orders URL env used by code: `ORDER_SERVICE_URL` present; `ORDERS_SERVICE_URL` and `ORDERS_MICROSERVICE_URL` absent.
- Orders token env used by code: `JWT_TOKEN` present as the internal-token fallback; `ORDERS_SERVICE_TOKEN`, `HEUREKA_INTERNAL_SERVICE_TOKEN`, and `INTERNAL_SERVICE_TOKEN` absent.
- Warehouse URL env used by code: `WAREHOUSE_SERVICE_URL` present.
- Warehouse token env used by code: `WAREHOUSE_SERVICE_TOKEN` and `JWT_TOKEN` present; `SERVICE_TOKEN` absent.
- Deployment env refs: `JWT_TOKEN` and `WAREHOUSE_SERVICE_TOKEN` come from `heureka-service-secret`; `DATABASE_URL` comes from `heureka-database-url-secret`; config ref is `heureka-config`.

### Source Contract Evidence

- `OrderClientService` forwards `contractVersion: orders.create.v1`.
- `OrderClientService` sends `x-internal-service-token` and `x-service-name: heureka-service` when an internal token is present.
- `HeurekaOrdersService` forwards `channel: heureka`, stable `externalOrderId`, stable `channelAccountId`, canonical Catalog `items[].productId`, and Warehouse-owned `items[].warehouseId`.
- `HeurekaOrdersService` fails closed before Orders on missing/non-canonical Catalog product IDs and missing/ambiguous/non-reservable Warehouse routes.

### Validation Commands

- `npm run verify:heureka-order-ingestion`: passed.
- `LOGGING_SERVICE_URL=http://logging-microservice:3367 npx ts-node --skip-ignore --compiler-options '{"types":["node"]}' services/heureka-service/src/heureka/orders/orders.service.spec.ts`: passed.
- `npm --prefix shared run build`: passed.
- `LOGGING_SERVICE_URL=http://logging-microservice:3367 npm --prefix services/heureka-service run build`: passed.
- Initial focused spec run without `LOGGING_SERVICE_URL` did not reach assertions because shared logger config requires that non-secret env var.

### Sanitized Pod-Local Preflight

Command shape:

```bash
kubectl -n statex-apps exec -i deployment/heureka-service -- node - < scripts/smoke_heureka_order_ingestion_live.js
```

Result: exited `2` by design because preflight found schema blockers.

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

### Smoke Gate Decision

The mutating create/replay/Warehouse-reservation smoke was not run. The live preflight still contains `[MISSING: ...]` schema blockers, and running `--execute` would create an unsafe production mutation before the Heureka persistence prerequisites exist. No Orders repo edits, Vault changes, deploys, raw token values, raw customer data, payment details, database rows, or production order rows were produced by this verification pass.

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
