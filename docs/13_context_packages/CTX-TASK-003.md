# CTX-TASK-003: Feed Validation Policy Engine Context

```yaml
id: CTX-TASK-003
status: executed
owner: AI agent
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../11_tasks/TASK-003-define-feed-validation-policy-engine.md
  - ../21_execution_plans/EP-TASK-003-define-feed-validation-policy-engine.md
```

## Target task

`../11_tasks/TASK-003-define-feed-validation-policy-engine.md`

## Upstream traceability

Vision `../01_vision/VISION.md`, roadmap `../08_roadmap/ROADMAP.md`, feature `../10_features/FEAT-003-feed-validation-policy-engine.md`, execution plan `../21_execution_plans/EP-TASK-003-define-feed-validation-policy-engine.md`, and invariants `../17_governance/PROJECT_INVARIANTS.md`.

## Included documents

- `../17_governance/PROJECT_INVARIANTS.md`
- `../16_operations/INTEGRATIONS.md`
- `../10_features/FEAT-003-feed-validation-policy-engine.md`
- `../21_execution_plans/EP-TASK-003-define-feed-validation-policy-engine.md`
- `../services/heureka-service/src/heureka/feed/feed-lifecycle.ts`
- `../services/heureka-service/src/heureka/feed/feed.service.ts`
- `../services/heureka-service/src/heureka/feed/feed.controller.ts`

## Excluded documents

- `.env`
- Kubernetes secret manifests
- Raw production feed outputs
- Customer, order, supplier-private, cost, margin, payment, token, and password data

## Constraints

Use synthetic validation fixtures only. Keep policy evaluation deterministic. Do not change cross-service ownership boundaries, public XML fields, catalog data, submission behavior, AI behavior, or database schema.

## Agent prompt

Implement `TASK-003` from the execution plan, publish a reusable policy vocabulary, integrate it into the lifecycle snapshot, and collect validation evidence without secrets or production raw data.

## Validation instructions

Run the synthetic lifecycle self-test, TypeScript build, strict documentation audit, pre-coding gate, and deployment-readiness gate for `TASK-003`.
