# TASK-STOCK-004 Heureka Stock Readiness Live Verification

Intent chain: Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation.

Vision: Alfares must not expose or sell products as available when Warehouse cannot fulfill them.

Goal Impact: Heureka feed/readiness must consume Warehouse availability and must not report `STOCK_UNKNOWN` or `ZERO_STOCK` when Warehouse has positive stock.

System: Warehouse remains stock authority; Heureka reads Warehouse availability for feed readiness and order-route evidence, but does not own stock, reservations, or order lifecycle.

Feature: Warehouse-backed Heureka feed readiness validation for TASK-STOCK-004.

Task: add a read-only live verifier that compares Heureka product readiness `availableStock` with Warehouse `/api/stock/:productId/total`.

Execution Plan: run the verifier inside the deployed Heureka pod with `WAREHOUSE_SERVICE_TOKEN` from the pod environment, defaulting to product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee` and supporting comma-separated `HEUREKA_VERIFY_PRODUCT_IDS`.

Coding Prompt: keep the verifier read-only; do not ingest orders, regenerate feeds, mutate Warehouse, or print tokens/raw product payloads.

Code: `scripts/verify_heureka_stock_readiness_live.js` and package script `verify:heureka-stock-readiness-live`.

Validation: run `node --check`, `npm run verify:heureka-order-ingestion`, `npm --prefix shared run build`, `npm --prefix services/heureka-service run build`, and deployed in-pod `npm run verify:heureka-stock-readiness-live`.
