# Heureka Service Vision

```yaml
id: VISION
status: approved
owner: Project Sponsor / Product Owner
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../BUSINESS.md
  - ../README.md
downstream:
  - ../02_business_case/BUSINESS_CASE.md
  - ../04_systems/SYS-001-feed-generation.md
related_adrs:
  - ../07_decisions/ADR-001-use-nestjs-postgres-kubernetes.md
```

## One-Sentence Vision

`heureka-service` provides deterministic Heureka.cz/sk XML product feeds from catalog data for marketplace submission workflows.

## Problem Statement

Marketplace consumers need a current, valid XML feed that reflects catalog and stock state without exposing internal business data.

## Target Users

Marketplace operations, `flipflop-service`, and engineers responsible for feed reliability.

## Core User Need

Consumers need a valid public feed that excludes unavailable products and regenerates predictably after stock changes.

## Key Outcomes

Valid XML, zero-stock exclusion, sub-60-second generation, feed history/settings APIs, and no public exposure of internal commercial data.

## Non-Goals

The service is not the catalog source of truth, warehouse stock owner, Heureka submission scheduler, or publisher of internal financial data.

## Success Criteria

Feed endpoints return valid XML or controlled errors; regeneration preserves `../BUSINESS.md`; changes are traceable through IPS artifacts.

## Product Philosophy

Prefer deterministic, observable feed generation over implicit correction.

## AI Philosophy

AI agents may assist only with scoped, traced changes that preserve invariants and produce validation evidence.
