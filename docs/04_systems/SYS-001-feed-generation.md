# SYS-001 Feed Generation System

```yaml
id: SYS-001
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../01_vision/VISION.md
  - ../02_business_case/BUSINESS_CASE.md
downstream: []
related_adrs: []
```

## Purpose

Generate and serve valid Heureka XML feeds for CZ/SK marketplace workflows.

## Responsibilities

Read catalog data, react to stock events, exclude zero-stock products, generate/store/serve XML, expose product and settings APIs.

## Non-responsibilities

Do not own catalog truth, warehouse stock truth, submission scheduling, or internal cost/margin publication.

## Inputs

Catalog product data, `stock.updated` events, and feed settings.

## Outputs

Public XML feed, download response, product inclusion state, settings response, and generation history.

## Dependencies

PostgreSQL, RabbitMQ, API gateway, Kubernetes, Vault/ESO.

## Upstream traceability

Vision: `../01_vision/VISION.md`; business constraints: `../BUSINESS.md`.

## Downstream artifacts

`../05_subsystems/SUB-001-feed-builder.md`, `../10_features/FEAT-001-feed-generation-governance.md`, `../11_tasks/TASK-001-implement-ips-governance-bootstrap.md`.

## Validation criteria

XML validity, zero-stock exclusion, 60-second generation, and IPS gate evidence.

## Open questions

No open system questions are known for the bootstrap.

## Validation

System validation starts with `../12_validation/VAL-TASK-001-ips-bootstrap.md`.
