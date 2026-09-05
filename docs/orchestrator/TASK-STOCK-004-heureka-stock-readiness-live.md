# TASK-STOCK-004 Heureka Stock Readiness Live Verification

Intent chain: Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation.

Vision: Alfares must not expose or sell products as available when Warehouse cannot fulfill them.

Goal Impact: Heureka feed/readiness must consume Warehouse availability and must not report `STOCK_UNKNOWN` or `ZERO_STOCK` when Warehouse has positive stock.

System: Warehouse remains stock authority; Heureka reads Warehouse availability for feed readiness and order-route evidence, but does not own stock, reservations, or order lifecycle.

Feature: Warehouse-backed Heureka feed readiness validation for TASK-STOCK-004.

Task: add a read-only live verifier that compares Heureka product readiness `availableStock` with Warehouse `/api/stock/:productId/total`.

Coding Prompt: keep the verifier read-only; do not ingest orders, regenerate feeds, mutate Warehouse, or print tokens/raw product payloads.

Code: `scripts/verify_heureka_stock_readiness_live.js` and package script `verify:heureka-stock-readiness-live`.

Validation commands: `git diff --check`, `node --check scripts/verify_heureka_stock_readiness_live.js`, `npm run verify:heureka-order-ingestion`, `npm --prefix shared run build`, and `npm --prefix services/heureka-service run build` all passed before deployment.

Pre-deploy runtime evidence: copying the verifier into the previously deployed Heureka pod and running it against `http://127.0.0.1:3800` plus Warehouse `GET /api/stock/:productId/total` passed for product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee`: Warehouse total available `60`, Heureka readiness available stock `60`, readiness `blocked`, blockers `MISSING_CATEGORY` and `SETTINGS_INACTIVE`.

Deployment evidence: `./scripts/deploy.sh` built and pushed `localhost:5000/heureka-service:92c0bb0` with digest `sha256:f9b18c2c2389fd91efc5d24583c3bfe7fd0904e1fd481cf76f9d5690370101e9`, applied Kubernetes manifests, rolled out successfully, and left pod `heureka-service-c9bcf7fb7-g5bs7` ready `1/1`.

Post-deploy validation: running packaged `npm run verify:heureka-stock-readiness-live` inside the `92c0bb0` pod passed with contract `heureka-stock-readiness-live.v1`, checked product count `1`, Warehouse total available `60`, Heureka readiness available stock `60`, readiness `blocked`, blockers `MISSING_CATEGORY` and `SETTINGS_INACTIVE`. No order ingestion, feed regeneration, Warehouse mutation, reservation, or channel publish was run.

Extended 9-product validation: running the packaged verifier inside the same `92c0bb0` pod with the 9 currently Allegro-authoritative Catalog product IDs passed with checked product count `9`. Warehouse totals matched Heureka readiness for every product: `124`, `87`, `50`, `25`, `110`, `60`, `10`, `3`, and `27`. Each product remained feed-readiness `blocked` only by `MISSING_CATEGORY` and `SETTINGS_INACTIVE`, with no `STOCK_UNKNOWN` or `ZERO_STOCK` blocker.
