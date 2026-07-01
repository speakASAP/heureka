# heureka-service

Heureka.cz/sk XML feed, dashboard, API gateway, and sales-channel integration service.

**Domain**: https://heureka.alfares.cz
**Stack**: NestJS · PostgreSQL · Kubernetes (`statex-apps`)
**Service port**: `3800`
**API gateway port**: `3801`

## Public and Dashboard Routes

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Public Heureka channel landing |
| GET | `/login`, `/register` | Hosted Auth entry routes |
| GET | `/auth/callback` | Hosted Auth token callback |
| GET | `/dashboard` | Protected dashboard shell |
| GET | `/dashboard/feed` | Feed dashboard shell |
| GET | `/dashboard/orders` | Orders dashboard shell |
| GET | `/dashboard/operations` | Operations/readiness dashboard shell |
| GET | `/dashboard/settings` | Settings dashboard shell |
| GET | `/dashboard/admin/users` | Admin users shell |

## Heureka Service API

Base: `https://heureka.alfares.cz`

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Lightweight Kubernetes probe |
| GET | `/health/dependencies` | Read-only dependency health contract |
| GET | `/heureka/feed` | Generate and return XML feed |
| GET | `/heureka/feed/download` | Download feed file |
| POST | `/heureka/feed/regenerate` | Guarded feed regeneration |
| GET | `/heureka/feed/status` | Latest feed status |
| GET | `/heureka/feed/readiness/products/:productId` | Check one Catalog product for feed readiness |
| POST | `/heureka/feed/readiness/bulk` | Check up to 100 Catalog products for feed readiness |
| GET | `/heureka/products` | List products in feed |
| GET | `/heureka/products/:productId/status` | Read product feed inclusion and readiness |
| POST | `/heureka/products/:productId/include` | Include product after readiness passes |
| DELETE | `/heureka/products/:productId/exclude` | Exclude product |
| POST | `/heureka/orders/ingest` | Service-token guarded order ingestion |
| GET | `/heureka/orders` | Hosted Auth protected order list |
| GET | `/heureka/orders/:id` | Hosted Auth protected order detail |
| GET | `/heureka/dashboard/readiness/lanes` | Hosted Auth protected stock/media/catalog/settings handoff lanes |

Product include/exclude endpoints require `x-service-name` and `x-internal-service-token` service headers. Catalog should call readiness first and let Heureka own feed inclusion.

## API Gateway

Base: `https://heureka.alfares.cz/api`

The gateway exposes `/api/health` and routes Heureka-owned `/api/heureka/feed*`, `/api/heureka/dashboard*`, `/api/heureka/products*`, `/api/heureka/orders*`, and `/api/heureka/health*` paths to `heureka-service`. Unknown legacy `/api/heureka/*` paths retain the Aukro compatibility fallback.

## Feed Format

Heureka XML schema can be checked with:

```bash
curl -k https://heureka.alfares.cz/heureka/feed?type=heureka_cz | xmllint --noout -
curl -k -D - https://heureka.alfares.cz/heureka/feed/preview?type=heureka_cz -o /tmp/heureka-preview.xml
```

## Validation

Common remote validation commands:

```bash
npm run verify:heureka-order-ingestion
npm run verify:heureka-orders-runtime-readiness
npm run verify:heureka-stock-readiness-live
npm run verify:heureka-blocked-product-lanes
npm run verify:heureka-external-readiness
npm run verify:health-dependencies
NPM_CONFIG_CACHE=/tmp/heureka-npm-cache npm run verify:task-010-source-parity
LOGGING_SERVICE_URL=http://logging-microservice:3367 npx ts-node --skip-ignore --compiler-options '{"types":["node"]}' services/api-gateway/src/gateway/gateway-route-parity.self-test.ts
```

Use `NPM_CONFIG_CACHE=/tmp/heureka-npm-cache` for root `npm run` commands when `/mnt/docker-data` is full, because the default npm cache on that partition can fail before package scripts start.

## Secrets

All secrets are managed through Vault and ExternalSecrets into the Kubernetes namespace. Do not commit secrets or print merchant/API tokens in validation logs.

## Architecture, Deployment, and Ops

See `SYSTEM.md`, `BUSINESS.md`, and `docs/orchestrator/TASK-010-channel-parity-checklist.md`.
