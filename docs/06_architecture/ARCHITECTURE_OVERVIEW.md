# Heureka Service Architecture Overview

```yaml
id: ARCHITECTURE-OVERVIEW
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream: [../SYSTEM.md, ../01_vision/VISION.md]
downstream: []
related_adrs: []
```

## Architectural style

NestJS service on Kubernetes with API gateway, shared modules, PostgreSQL, and RabbitMQ.

## Storage choices

PostgreSQL database `heureka` through Prisma.

## Runtime components

`services/heureka-service`, `services/api-gateway`, `shared`, and `k8s`.

## Integration model

Catalog supplies product data; warehouse sends `stock.updated`; `flipflop-service` consumes the feed.

## Security model

Secrets come from Vault/ESO. IPS artifacts must not contain secret values or raw production data.

## Operational model

Deploy with `./scripts/deploy.sh`; IPS gates write evidence under `reports/validation/`.
