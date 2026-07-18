# CTX-TASK-004: Catalog Feed Readiness Action Context

```yaml
id: CTX-TASK-004
status: executed
owner: AI agent
created: 2026-06-15
last_updated: 2026-06-15
completeness_level: complete
upstream:
  - ../11_tasks/TASK-004-design-catalog-feed-readiness-action.md
  - ../21_execution_plans/EP-TASK-004-design-catalog-feed-readiness-action.md
```

## Target task

`../11_tasks/TASK-004-design-catalog-feed-readiness-action.md`

## Upstream traceability

Vision `../01_vision/VISION.md`, roadmap `../08_roadmap/ROADMAP.md`, feature `../10_features/FEAT-004-catalog-feed-readiness-action.md`, execution plan `../21_execution_plans/EP-TASK-004-design-catalog-feed-readiness-action.md`, contract `../23_documentation_contracts/CATALOG_FEED_READINESS_CONTRACT.md`, and invariants `../17_governance/PROJECT_INVARIANTS.md`.

## Included documents

- `../17_governance/PROJECT_INVARIANTS.md`
- `../16_operations/INTEGRATIONS.md`
- `../10_features/FEAT-004-catalog-feed-readiness-action.md`
- `../21_execution_plans/EP-TASK-004-design-catalog-feed-readiness-action.md`
- `../23_documentation_contracts/CATALOG_FEED_READINESS_CONTRACT.md`
- `../services/heureka-service/src/heureka/feed/feed-validation-policy.ts`
- `../services/heureka-service/src/heureka/feed/feed-lifecycle.ts`
- `../services/heureka-service/src/heureka/feed/feed.service.ts`
- `../services/heureka-service/src/heureka/feed/feed.controller.ts`
- `../shared/clients/catalog-client.service.ts`
- `../shared/clients/warehouse-client.service.ts`

## Excluded documents

- `.env`
- Kubernetes secret manifests
- Raw production feed outputs
- Customer, order, supplier-private, cost, margin, payment, token, and password data

## Constraints

Use synthetic validation fixtures only. Keep readiness evaluation deterministic. Do not change cross-service ownership boundaries, public XML fields, catalog data, price data, media data, stock data, feed publication behavior, AI behavior, or database schema.

## Agent prompt

Implement `TASK-004` from the execution plan and readiness contract, add a reusable readiness evaluator, expose read-only single-product and bulk dry-run endpoints, and collect validation evidence without secrets or production raw data.

## Validation instructions

Run the synthetic readiness self-test, TypeScript build, strict documentation audit, pre-coding gate, and deployment-readiness gate for `TASK-004`.
