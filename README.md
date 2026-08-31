# heureka

## Status
Status: production
Lifecycle: active service
The Heureka integration service generates and maintains the Heureka.cz/sk XML feed for catalog products and exposes feed status, product readiness, and order ingestion endpoints for the marketplace integration workflow.

## Documentation authority
This repository is the source of truth for the Heureka service boundary, runtime contract, and integration metadata. Cross-repo ecosystem ownership remains with the underlying catalog, warehouse, and platform services it depends on.

## Capabilities
- auth: not-applicable — The service presents hosted Auth entry routes but does not own the central auth provider or identity boundary.
- postgres: required — The repo uses PostgreSQL for the Heureka feed, products, and settings state.
- redis: not-applicable — No Redis runtime is required for the feed-generation workflow.
- logging: required — The service emits structured logs and dependency health evidence through the shared platform logging path.
- notifications: not-applicable — The service does not operate a user-notification delivery stack; it remains a marketplace feed integration.
- ai: not-applicable — The service is deterministic feed-generation logic and does not own an AI runtime.
- payments: not-applicable — Heureka feed generation does not perform payment processing.
- catalog: required — The service consumes catalog product data to determine which items qualify for the feed and readiness checks.
- orders: required — The service ingests and reads marketplace order information for the Heureka integration workflow.
- warehouse: required — The service subscribes to `stock.updated` events and regenerates the feed based on warehouse state.
- invoices: not-applicable — The service does not issue or manage invoices.
- object-storage: not-applicable — The service does not own object storage or file-serving persistence.
- event-bus: required — The service consumes `stock.updated` messages from the shared event bus for feed regeneration.
- docs-rag: required — The repo is part of the ecosystem service map and should remain discoverable through the documentation index.
- monitoring: required — The app exposes health and dependency-health endpoints for the platform monitoring boundary.
- backups: required — The PostgreSQL-backed Heureka state should be included in the platform backup scope.

## Interfaces
- Primary domain: https://heureka.alfares.cz
- Service ports: 3800 (service), 3801 (API gateway)
- Health endpoints: GET /health, GET /health/dependencies
- Feed endpoints: /heureka/feed, /heureka/feed/download, /heureka/feed/regenerate, /heureka/feed/status
- Product readiness endpoints: /heureka/products, /heureka/products/:productId/status, /heureka/products/:productId/include, /heureka/products/:productId/exclude
- Order endpoints: /heureka/orders/ingest, /heureka/orders, /heureka/orders/:id
- Dependency owners: catalog-microservice, warehouse-microservice, db-server-postgres, logging-microservice

## Development
- Stack: NestJS, TypeScript, PostgreSQL, Kubernetes
- Source of truth: repository-local service code and deployment config
- Validation: use repo-local scripts and the central IPS adoption validator for the planning gate
- Typical checks: npm run build, npm test, npm run verify:health-dependencies, npm run verify:heureka-stock-readiness-live

## Configuration
- Secrets are managed through Vault and External Secrets into the Kubernetes namespace.
- Runtime config is repo-local and environment-managed, with the database and service boundary defined in the platform configuration.
- The service uses the shared catalog and inventory integration layers rather than inventing a separate upstream source of truth.

## Deployment
- Deployment mode: Kubernetes in the `statex-apps` namespace
- Runtime image: `localhost:5000/heureka-service:latest`
- Deploy command: `./scripts/deploy.sh`
- Ingress: `https://heureka.alfares.cz`
- Operational access: Kubernetes rollout and pod logs via the platform operator flow

## Health and observability
- Health probes: GET /health and GET /health/dependencies
- Logs: structured platform logs via the shared logging service
- Feed validity: XML feed generation must continue to satisfy the Heureka schema contract and avoid zero-stock items.
- Key metric: feed generation must complete within 60 seconds and remain valid for the public Marketplace feed.
