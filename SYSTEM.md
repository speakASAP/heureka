# SYSTEM.md

completeness_level: complete

status: validated

## Purpose
The Heureka service translates the active catalog and stock state into a valid Heureka.cz/sk XML feed, exposes feed readiness and product inclusion state, and supports marketplace order ingestion without owning broader product or payment workflows.

## Responsibilities
- Consume catalog product data and warehouse stock updates
- Generate and validate the Heureka feed XML
- Expose feed status, readiness, and product inclusion APIs
- Maintain the Heureka DB state for feed operations and settings
- Expose order retrieval and ingestion endpoints for the marketplace integration boundary

## Non-responsibilities
- Owning the authoritative catalog or product pricing data model
- Managing user auth, payments, or invoice issuance
- Acting as the general inventory control system for the whole ecosystem
- Operating a separate notification platform or customer messaging system

## Inputs
- Catalog product metadata from catalog-microservice
- Stock change notifications from warehouse-microservice via `stock.updated`
- Operational configuration, environment variables, and Vault secrets
- Marketplace feed-specific settings stored in the service database

## Outputs
- XML feed files and generated feed status information
- Product inclusion and exclusion state for the Heureka feed
- Order ingest and query endpoints for marketplace workflow management
- Dependency health and readiness signals for platform monitoring

## Dependencies
- catalog-microservice for product data
- warehouse-microservice for stock events
- db-server-postgres for the Heureka database
- logging-microservice for structured logs
- platform monitoring for health checks

## Upstream traceability
- The product catalog is the upstream truth for items eligible for the feed.
- Warehouse stock events are the upstream trigger for feed regeneration.
- The repo depends on the platform runtime environment, Vault secret flow, and shared Kubernetes conventions.

## Downstream artifacts
- Public Heureka XML feed and download endpoints
- Product inclusion/readiness dashboards and operations pages
- Order and feed operational records used by marketplace operators

## Validation criteria
- Feed generation remains valid XML matching the Heureka schema.
- Products with zero stock do not enter the public feed.
- Feed generation completes within the service’s operational SLA of 60 seconds.
- Dependency health remains reviewable and operationally transparent.

## Open questions
- Whether additional feed variants or category-specific rules need to be added for future marketplace expansion.
- Whether product inclusion rules need a more explicit governance workflow as the catalog grows.
