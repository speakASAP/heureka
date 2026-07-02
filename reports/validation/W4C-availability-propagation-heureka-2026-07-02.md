# W4c Availability Propagation - Heureka

Date: 2026-07-02
Role: W4c Bazos/Aukro/Heureka Consumer Foundation worker
Repo: `/home/ssf/Documents/Github/heureka`

## Intent Chain

Vision -> Heureka exposes deterministic XML feeds that exclude unavailable products and do not own Catalog or Warehouse truth.
Goal Impact -> Catalog non-sellability and Warehouse zero-stock must remove linked products/offers from local feed/listing surfaces.
System -> `heureka-service` RabbitMQ consumers.
Feature -> Availability propagation for Catalog lifecycle and Warehouse stock events.
Task -> Add local fail-closed consumers without external Heureka mutation.
Execution Plan -> Use `HeurekaProduct.isIncluded=false`, `HeurekaOffer.isActive=false`, stock zeroing, and operation event evidence.
Coding Prompt -> W4c option 2 product availability propagation.
Code -> Catalog consumer plus zero-stock-safe Warehouse stock consumer.
Validation -> focused subscriber specs, shared build, service build, `git diff --check`.

## Runtime Behavior

- Warehouse `stock.out` and zero `stock.updated` upsert `HeurekaProduct.isIncluded=false` and set linked `HeurekaOffer` rows inactive with stock zero.
- Positive `stock.updated` refreshes local `HeurekaOffer.stockQuantity` only and does not re-include feed products.
- Catalog product archived/deleted/inactive and sellability false events exclude feed products and deactivate linked offers.
- Durable `HeurekaOperationEvent` writes use idempotency keys when that table/model is available; the state projection itself is idempotent.

## Blockers

- `[MISSING: confirmed Heureka feed approval/import removal behavior]`
- `[MISSING: safe catalog-event refresh policy]` for sellable `updated`, `upserted`, or `category_changed` events.
- `[UNKNOWN: live Catalog RabbitMQ exchange/routing configuration]`; defaults are documented in `.env.example`.

## External Mutation

No Heureka external submission/import endpoint is called. The handler only changes local feed/listing state and records blockers.
