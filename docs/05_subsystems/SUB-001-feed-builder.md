# SUB-001 Feed Builder

```yaml
id: SUB-001
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../04_systems/SYS-001-feed-generation.md
downstream: []
related_adrs: []
```

## Purpose

Build Heureka XML from eligible products and settings.

## Parent system

`../04_systems/SYS-001-feed-generation.md`

## Responsibilities

Select eligible products, exclude zero-stock products, map XML fields, exclude internal commercial data, and provide validation evidence.

## Interfaces

`services/heureka-service/src/heureka/feed/feed.controller.ts`, `services/heureka-service/src/heureka/feed/feed.service.ts`, and gateway routing.

## Inputs

Catalog payloads, stock events, and settings.

## Outputs

XML feed, history records, and inclusion state.

## Dependencies

Shared clients, RabbitMQ subscriber, and Prisma module.

## Data ownership

Owns feed records and settings; catalog and stock remain upstream-owned.

## Failure modes

Invalid XML, missing fields, contract drift, slow generation, or public exposure of internal fields.

## Validation criteria

Tests and XML validation for feed changes plus sensitive-data scans.

## Validation

Current evidence is `../12_validation/VAL-TASK-001-ips-bootstrap.md`.
