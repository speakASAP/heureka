# PROMPT-TASK-004: Catalog Feed Readiness Action

```yaml
id: PROMPT-TASK-004
status: executed
owner: AI agent
created: 2026-06-15
last_updated: 2026-06-15
completeness_level: complete
upstream:
  - ../21_execution_plans/EP-TASK-004-design-catalog-feed-readiness-action.md
context_package:
  - ../13_context_packages/CTX-TASK-004.md
```

## Role

Act as the TASK-004 implementation agent for Heureka catalog feed readiness work.

## Task

Implement a deterministic, read-only catalog feed readiness dry-run that explains whether products are ready, warning, blocked, or unknown before a future Heureka feed generation run.

## Context

Use `../17_governance/PROJECT_INVARIANTS.md`, `../16_operations/INTEGRATIONS.md`, `../10_features/FEAT-004-catalog-feed-readiness-action.md`, `../21_execution_plans/EP-TASK-004-design-catalog-feed-readiness-action.md`, `../23_documentation_contracts/CATALOG_FEED_READINESS_CONTRACT.md`, and the existing feed lifecycle/policy implementation.

## Constraints

Preserve valid XML, zero-stock exclusion, sub-60-second timing evidence, public data safety, and secret handling. Use synthetic examples only. Do not mutate catalog, media, pricing, warehouse, feed inclusion, feed publication, or database schema.

## Acceptance criteria

- Versioned readiness response is available for single-product and bulk dry-runs.
- Readiness blockers include owner service, public-safe reason, remediation hint, and no-mutation flags.
- Bulk readiness preserves deterministic output for a fixed product id list and evidence snapshot.
- Synthetic tests cover ready, warning, blocked, unknown, zero stock, missing category/media/price blockers, sensitive-field blocking, no-mutation flags, and replay hash stability.

## Validation

Run the synthetic readiness self-test, service build, strict documentation audit, pre-coding gate, and deployment-readiness gate for `TASK-004`.

## Execution Evidence

Implemented `feed-readiness.ts`, exposed read-only readiness endpoints through `feed.service.ts` and `feed.controller.ts`, added synthetic self-tests, and captured validation evidence in `../12_validation/VAL-TASK-004.md`.
