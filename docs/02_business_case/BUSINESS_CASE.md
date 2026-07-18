# Heureka Service Business Case

```yaml
id: BUSINESS-CASE
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream: [../BUSINESS.md, ../01_vision/VISION.md]
downstream: []
related_adrs: []
```

## Problem

Heureka integrations require current product-feed XML that is valid, public-safe, and aligned with stock state.

## Pain Points

Invalid XML blocks submission; zero-stock products create marketplace risk; slow generation makes stock stale; unbounded changes can expose internal fields.

## Proposed Solution

Operate the existing NestJS service to generate feeds, regenerate on stock updates, store history/settings, and expose controlled endpoints.

## Value Proposition

Reliable public marketplace feed while catalog and warehouse remain source systems.

## Differentiators

Deterministic feed rules, IPS validation gates, and explicit ownership boundaries.

## Risks

Contract drift, invalid XML mapping, slow generation, and accidental public exposure.

## Adoption Strategy

Use IPS documents and gates for future changes.
