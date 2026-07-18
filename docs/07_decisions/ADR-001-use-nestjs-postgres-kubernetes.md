# ADR-001: Use NestJS, PostgreSQL, and Kubernetes for Feed Service

```yaml
id: ADR-001
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../SYSTEM.md
  - ../06_architecture/ARCHITECTURE_OVERVIEW.md
downstream: []
related_adrs: []
```

## Context

The service is implemented as NestJS with PostgreSQL, shared TypeScript modules, RabbitMQ, and Kubernetes deployment.

## Decision

Continue this architecture for feed-generation work. Future major architecture changes require a new ADR.

## Consequences

Tasks touching boundaries must inspect service, gateway, shared modules, Prisma schema, and manifests; contract changes require validation.

## Validation

Validated through architecture docs, graph links, and task validation reports.
