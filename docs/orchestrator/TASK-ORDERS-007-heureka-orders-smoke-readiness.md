# TASK-ORDERS-007 - Heureka Orders Smoke Production Readiness

Date: 2026-07-01
Status: Complete for sanitized create, idempotency replay, Warehouse reservation readback, and synthetic cleanup; external Heureka registration details remain [UNKNOWN]
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

## 2026-07-01 Post-Approval Setup And Smoke Rerun

The owner approved proceeding with Heureka setup. Browser inspection used the logged-in Chrome session and found `account.heureka.cz` logged in as the Heureka user. The partner/e-shop admin path redirected to the shop registration flow at `sluzby.heureka.cz/shop-registration/company`, which requires IČO and subsequent company/contact/shop details. No external Heureka registration form was submitted because those legal/contact values were not provided in this lane.

Database setup was applied only after generating SQL from `prisma/schema.prisma`, checking it for destructive statements, and confirming the live `heureka_%` table inventory was empty. The applied SQL contained create-only schema work for Heureka Prisma tables and indexes. No secrets or DSNs were printed.

Sanitized database result:

- created tables: `heureka_accounts`, `heureka_feeds`, `heureka_offers`, `heureka_orders`, `heureka_products`, `heureka_settings`
- active account mapping: `heureka-cz`
- account id: present, not printed
- API key: not set

Feed settings result:

- feed type: `heureka_cz`
- shop URL: `https://flipflop.alfares.cz`
- shop name: `FlipFlop`
- contact email: present
- XML feed URL for Heureka UI: `https://heureka.alfares.cz/heureka/feed?type=heureka_cz`
- live URL status: `200`
- content type: `application/xml; charset=utf-8`
- feed lifecycle header: `X-Heureka-Feed-Status: valid`
- current feed body: valid XML with no `SHOPITEM` rows until Heureka products are included/renderable

Post-setup preflight:

- Heureka health status: `200`
- Catalog product status: `200`
- Warehouse stock status: `200`
- reservable Warehouse route count: `1`
- selected Warehouse route: `c0de0000-0000-4000-8000-000000000013`
- runtime schema check: completed
- present required order tables: `heureka_accounts`, `heureka_offers`, `heureka_orders`
- missing required order tables: none

Post-setup live smoke attempt:

- first POST status: `500`
- replay POST status: `500`
- order id presence: `false`
- replay flag: `false`
- reservation status presence: `false`
- Heureka pod root cause: `OrderClientService.createOrder` received status `400` from Orders.
- Orders pod evidence: `WarehouseReservationClient` logged `Warehouse reservation handoff failed`; Orders audit recorded `channel=heureka`, `outcome=failure`.

Orders/Warehouse runtime evidence, presence only:

- Orders `WAREHOUSE_RESERVATION_ENABLED`: present and `true`
- Orders `WAREHOUSE_SERVICE_URL`: present
- Orders `WAREHOUSE_SERVICE_TOKEN`: present
- Warehouse service endpoint: `warehouse-microservice:3201`
- Warehouse app pod: running
- Warehouse logs around the same window include reservation/expiry `401` failures and reservation handoff noise.

## Blockers

- `[MISSING: successful Orders Warehouse reservation handoff for Heureka]` - Heureka now reaches Orders, but Orders fails closed when Warehouse reservation handoff does not return `reserved`.
- `[MISSING: successful first order ingest]` - post-schema Heureka POST still returns `500` because downstream Orders returns `400`.
- `[MISSING: successful idempotent replay]` - replay cannot pass until first create succeeds.
- `[MISSING: orderId]` - no order id is returned while Orders rejects the create.
- `[MISSING: reservationStatus]` - no reservation status is present while Orders rejects the create before persistence.
- `[UNKNOWN: external Heureka e-shop registration details]` - the logged-in Heureka UI requires IČO and company/contact/shop details; no external registration form was submitted without those values.

## Unblock Plan

1. Orders/Warehouse owner fixes or verifies the reservation handoff credential/role/path so sellable-channel creates return Warehouse handoff status `reserved`.
2. If external Heureka shop registration is required, owner provides IČO and approved company/contact/shop details for `sluzby.heureka.cz/shop-registration/company`.
3. Integration owner reruns:
   - `node scripts/verify_heureka_order_ingestion_contract.js`
   - `npm --prefix shared run build`
   - `npm --prefix services/heureka-service run build`
   - pod-local `node /tmp/smoke_heureka_order_ingestion_live.js`
   - pod-local `HEUREKA_ORDER_SMOKE_EXECUTE=true node /tmp/smoke_heureka_order_ingestion_live.js --execute`

## Parallel Execution

| Workstream | Status | Owner Role | Scope | Blockers | Validation Owner | Handoff |
| --- | --- | --- | --- | --- | --- | --- |
| Heureka DB schema initialization | complete | database/schema owner | Heureka production database schema for Prisma tables only | none for current schema inventory | database/schema owner | Tables and `heureka-cz` active account mapping are present. |
| Orders/Warehouse reservation handoff | ready now | Orders/Warehouse owner | Orders runtime Warehouse handoff credential/role/path | `[MISSING: successful Orders Warehouse reservation handoff for Heureka]` | Orders/Warehouse owner | Report sanitized reserve result and whether handoff status is `reserved`. |
| External Heureka e-shop registration | blocked | owner/browser operator | `sluzby.heureka.cz/shop-registration/company` | `[UNKNOWN: external Heureka e-shop registration details]` | owner/browser operator | Provide IČO and approved company/contact/shop fields before submission. |
| Heureka smoke rerun | dependency-gated | integration owner | `scripts/smoke_heureka_order_ingestion_live.js` and sanitized pod execution | downstream reservation handoff blocker | integration owner | Rerun create/replay/reservation smoke after Orders/Warehouse unblock. |

## Deployment

No deployment was run. The smoke runner was copied into the running pod as a temporary verifier after source validation. Runtime DB schema initialization was applied directly to the configured Heureka database after owner approval and create-only SQL validation.

## 2026-07-01 Final Orders/Warehouse Smoke Verification

Role: channel integration owner.

Intent Preservation Chain:

- Vision: Alfares marketplace channels create canonical Orders while preserving Catalog product truth and Warehouse stock authority.
- Goal Impact: Goal 7.2 verifies Heureka can create a sanitized synthetic order, replay the idempotency key, observe Warehouse reservation handoff, and clean up the synthetic order.
- System: Heureka owns channel ingestion only; Orders owns lifecycle and idempotency; Warehouse owns reservation state; Auth owns the short-lived admin identity used only for smoke cleanup.
- Feature: `POST /heureka/orders/ingest` production smoke for create, replay, Orders readback, Warehouse reservation, and lifecycle cleanup.
- Task: Re-run the smoke after Orders/Warehouse reservation readiness and record sanitized evidence without token values, order IDs, customer payloads, database rows, or payment data.
- Execution Plan: Run pod-local preflight, run live create/replay, use an explicit short-lived Orders admin token for readback and approved synthetic cleanup, and verify no `[MISSING: ...]` markers remain.
- Coding Prompt: Keep channel create auth unchanged; add only smoke-runner support for explicit Orders admin readback/cleanup and a required cancellation approval body.
- Code: `scripts/smoke_heureka_order_ingestion_live.js` now supports `HEUREKA_ORDER_SMOKE_ORDERS_ADMIN_TOKEN` / `ORDERS_ADMIN_TOKEN` for Orders readback and approved synthetic cleanup. Normal create/replay still uses Heureka internal service headers.
- Validation: See sanitized command evidence below.

### Current Runtime Evidence

- Heureka deployment image: `localhost:5000/heureka-service:92c0bb0`, ready `1/1`.
- Env-name presence only: `JWT_TOKEN` present, `HEUREKA_INTERNAL_SERVICE_TOKEN` missing, `WAREHOUSE_SERVICE_TOKEN` present, `ORDER_SERVICE_URL` present, `WAREHOUSE_SERVICE_URL` present, `AUTH_SERVICE_URL` present.
- Orders readback with the Heureka channel token remains forbidden by design; Orders readback and cleanup require an authorized Orders admin/global-superadmin Auth identity.
- A short-lived Auth-validated token was generated inside the Auth pod for an existing authorized identity and was not printed or persisted.

### Smoke Results

Command shape:

```bash
kubectl -n statex-apps exec -i deployment/heureka-service -- env HEUREKA_ORDER_SMOKE_ORDERS_ADMIN_TOKEN="$AUTH_TOKEN" node - --execute < scripts/smoke_heureka_order_ingestion_live.js
```

Sanitized result:

- preflight missing markers: none
- Catalog product status: `200`
- Warehouse stock status: `200`
- reservable Warehouse route count: `1`
- selected Warehouse route: `c0de0000-0000-4000-8000-000000000013`
- Heureka required tables present: `heureka_accounts`, `heureka_offers`, `heureka_orders`
- first POST status: `201`
- replay POST status: `201`
- order id presence: `true`
- replay flag: `true`
- stable idempotent order id: `true`
- Orders readback status: `200`
- reservation status presence: `true`
- reservation statuses: `reserved`
- cleanup status: `200`
- cleanup cancelled: `true`
- missing markers: none

### Superseded Blockers

The earlier blockers `[MISSING: successful Orders Warehouse reservation handoff for Heureka]`, `[MISSING: successful first order ingest]`, `[MISSING: successful idempotent replay]`, `[MISSING: orderId]`, and `[MISSING: reservationStatus]` are superseded by the final smoke pass above.

Remaining non-Orders item: `[UNKNOWN: external Heureka e-shop registration details]` for the owner-operated `sluzby.heureka.cz/shop-registration/company` flow.

## 2026-07-02 Runtime Token Source Recheck

Role: integration validator.

- Vision: Heureka order forwarding should keep using the shared Orders contract and service-token shape used by other Alfares sales channels.
- Goal Impact: close the remaining TASK-010 runtime-token-source uncertainty without creating or mutating orders.
- System: Heureka service deployment, shared `OrderClientService`, Orders service URL config, and Warehouse preflight token config.
- Feature: read-only Orders runtime readiness verifier.
- Task: add and run `scripts/verify_heureka_orders_runtime_readiness.js` in source mode and pod runtime mode.
- Execution Plan: verify source contract, manifest env refs, final smoke evidence, and current pod env-name presence only; do not print secret values and do not call mutating endpoints.
- Coding Prompt: keep this as a verifier and documentation update only; no order ingestion, Orders mutation, Warehouse reservation, or cleanup flow is run in this pass.
- Code: `scripts/verify_heureka_orders_runtime_readiness.js` plus `npm run verify:heureka-orders-runtime-readiness`.
- Validation: source mode passes; pod runtime mode returned `contractVersion=heureka-orders-runtime-readiness.v1`, `readOnly=true`, `mutations=[]`, `resolvedOrdersUrlSource=ORDER_SERVICE_URL`, `resolvedInternalTokenSource=HEUREKA_INTERNAL_SERVICE_TOKEN`, and `resolvedWarehouseTokenSource=WAREHOUSE_SERVICE_TOKEN`. Only env presence and string lengths were printed; no token values were printed.
