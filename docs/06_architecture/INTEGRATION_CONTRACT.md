# Integration contract

## Purpose
This contract defines the real Heureka integration boundary: the service consumes catalog and stock truth, generates a valid marketplace feed, and exposes readiness/order endpoints without claiming broader product or commerce ownership.

## Capability decisions
- auth: not-applicable — The service uses hosted Auth entry routes but does not own the central authentication provider.
- postgres: required — The service persists Heureka feed, product, and settings state in PostgreSQL.
- redis: not-applicable — No Redis-backed runtime is required for the feed-generation workflow.
- logging: required — Structured logs and dependency health evidence flow through the shared logging service.
- notifications: not-applicable — The service does not own a notification delivery platform.
- ai: not-applicable — No AI runtime is owned by the service.
- payments: not-applicable — No payment workflow belongs to the marketplace feed service.
- catalog: required — The service depends on catalog product data for feed inclusion and readiness checks.
- orders: required — The service reads and ingests order data for the marketplace integration boundary.
- warehouse: required — The service consumes `stock.updated` events and reacts to warehouse inventory changes.
- invoices: not-applicable — Invoice generation and management are out-of-scope.
- object-storage: not-applicable — No object-storage runtime or file-serving boundary is owned by the service.
- event-bus: required — Feed regeneration is triggered by `stock.updated` events.
- docs-rag: required — The repo should remain indexed and discoverable via the shared docs pipeline.
- monitoring: required — The service exposes health and dependency health checks for platform monitoring.
- backups: required — The Heureka database should be included in the backup scope of the stateful service.

## Data ownership
The repository owns Heureka feed and ordering state, but it does not own the authoritative product catalog or warehouse inventory source of truth.

## Authentication and authorization
The service exposes public and protected routes, but auth enforcement and identity ownership remain with the central auth boundary rather than the Heureka repo itself.

## Synchronous dependencies
- catalog-microservice for product data
- db-server-postgres for the Heureka database
- logging-microservice for operational logs
- monitoring flow for health/dep checks

## Asynchronous dependencies
- warehouse-microservice publishes `stock.updated` events that trigger feed regeneration
- external Heureka publication remains a consumer-facing integration boundary rather than a broader commerce platform ownership claim

## Degraded operation
If the service is unavailable, the feed may stop updating, but the underlying catalog and warehouse source-of-truth systems remain responsible for their own data and operational integrity.

## Validation
- `python3 intent-preservation-system/scripts/validate_adoption_profile.py --root heureka --phase planning`
- Repository-local validation for XML validity, zero-stock exclusion, and feed readiness remains the service-level acceptance gate.
