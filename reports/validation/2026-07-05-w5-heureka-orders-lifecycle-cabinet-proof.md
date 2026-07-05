# W5 Heureka Orders Lifecycle Cabinet Proof

Date: 2026-07-05
Agent: W5 Aukro and Heureka cabinet proof
Repo: /home/ssf/Documents/Github/heureka
Scope: prove whether Heureka lifecycle views and admin stats consume central Orders lifecycle, or record exact gaps.

## Intent Preservation Chain

Vision -> Every customer/admin cabinet reflects canonical Orders lifecycle without moving lifecycle truth into marketplace services.
Goal Impact -> Heureka users/admins can see central lifecycle state and operational stale/missing states without raw customer, payment, token, or provider payload exposure.
System -> Orders owns central order lifecycle. Heureka owns channel UI/order client rendering and may only read central lifecycle state.
Feature -> Heureka dashboard order list/detail and admin statistics consume central Orders lifecycle/readiness fields.
Task -> Run existing lifecycle verifier, inspect UI/order-client source, perform safe runtime status/env-presence checks, and record exact remaining blockers.
Execution Plan -> Read repo handoff and master plan, run `verify:orders-lifecycle-ui`, check dashboard/admin source markers, run pod-local runtime readiness in presence-only mode, and avoid deploy/provider/customer data output.
Coding Prompt -> Allowed files: UI/order client/verifier docs/reports. Forbidden: broad contract/schema edits, provider writes, deploy, raw customer/payment/token output.
Code -> No source code changed by this W5 proof pass.
Validation -> See command evidence below.

## Verdict

Source proof: PASS. Heureka dashboard order list/detail and admin stats are wired to central Orders lifecycle/readiness fields and all 13 lifecycle labels remain covered by the existing verifier.

Runtime proof: PARTIAL, auth-gated for row-level proof. The deployed pod resolves an Orders URL and internal-token source by presence-only evidence, public service routes are healthy, and protected order/admin APIs fail closed without a session. Pod-local runtime readiness reports no env blockers. No approved customer/admin bearer/session packet was available in this lane, so live row-level browser/API rendering was not queried.

## Source Evidence

- `shared/clients/order-client.service.ts` preserves `orders.create.v1`, Orders URL fallbacks, internal-token auth sources, and `x-service-name: heureka-service`.
- `services/heureka-service/src/public/public.controller.ts` keeps the protected dashboard list API alias `/heureka/dashboard/orders-list`, detail route `/dashboard/orders/:id`, 30s polling, and `visibilitychange` behavior.
- Dashboard rendering reads lifecycle stage/status, payment state/status, central status counts, stale/unknown states, and detail lifecycle fields.
- Admin dashboard loads `/heureka/dashboard/admin/stats` and renders `orderLifecycleStats.centralStatusCounts` plus delivery reservation/unknown metrics.
- `services/heureka-service/src/public/public-dashboard-routes.self-test.ts` asserts order detail, orders list refresh, admin lifecycle stats rendering, Warehouse reserved, and Delivery unknown markers.

## Command Evidence

```bash
ssh alfares 'cd /home/ssf/Documents/Github/heureka && npm run verify:orders-lifecycle-ui'
```

Result: PASS, source mode, read-only, blockers empty. Key verifier output:

```json
{
  "contractVersion": "heureka-orders-runtime-readiness.v1",
  "readOnly": true,
  "mode": "source",
  "source": {
    "orderClientContract": "orders.create.v1",
    "sourceContractsVerified": true,
    "finalSmokeEvidenceRecorded": true
  },
  "blockers": []
}
```

Pod-local runtime readiness, source assertions skipped by design, no raw values printed:

```bash
ssh alfares 'kubectl -n statex-apps exec deployment/heureka-service -- sh -lc "pwd; node scripts/verify_heureka_orders_runtime_readiness.js --runtime"'
```

Result: PASS, runtime mode, blockers empty. Presence-only evidence: `ORDER_SERVICE_URL`, `JWT_TOKEN`, `HEUREKA_INTERNAL_SERVICE_TOKEN`, and `WAREHOUSE_SERVICE_TOKEN` present; resolved Orders URL source `ORDER_SERVICE_URL`, internal token source `JWT_TOKEN`, Warehouse token source `WAREHOUSE_SERVICE_TOKEN`.

Status-only HTTP smoke, no bearer/session:

```bash
ssh alfares 'for url in https://heureka.alfares.cz/dashboard/orders https://heureka.alfares.cz/api/health https://heureka.alfares.cz/api/heureka/dashboard/orders-list?limit=5 https://heureka.alfares.cz/api/heureka/dashboard/admin/stats; do printf "%s " "$url"; curl -sk -o /dev/null -w "%{http_code}\n" "$url"; done'
```

Result:

```text
https://heureka.alfares.cz/dashboard/orders 200
https://heureka.alfares.cz/api/health 200
https://heureka.alfares.cz/api/heureka/dashboard/orders-list?limit=5 401
https://heureka.alfares.cz/api/heureka/dashboard/admin/stats 401
```

## Exact Gaps

- [MISSING: approved live Heureka customer/admin bearer or browser session packet for row-level dashboard/admin smoke]
- [MISSING: approved row-level proof that at least one Heureka dashboard/admin response renders a current non-stale canonical Orders lifecycle stage]
- [UNKNOWN: whether current production data contains Heureka rows with central lifecycle status available; protected API was not queried without approved session]

## Sensitive Data Boundary

This pass did not print tokens, bearer values, customer identifiers, payment data, delivery addresses, raw order rows, provider tracking payloads, or database rows. Runtime evidence is limited to HTTP status codes and env presence/length.
