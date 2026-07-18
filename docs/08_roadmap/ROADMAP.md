# Heureka Service Roadmap

```yaml
id: ROADMAP-HEUREKA-SERVICE
status: draft
owner: Project Owner
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../01_vision/VISION.md
  - ../02_business_case/BUSINESS_CASE.md
  - ../04_systems/SYS-001-feed-generation.md
  - ../06_architecture/ARCHITECTURE_OVERVIEW.md
downstream:
  - ../09_milestones/MS-001-ips-bootstrap.md
  - ../09_milestones/MS-002-feed-publication-foundation.md
  - ../09_milestones/MS-003-catalog-feed-readiness.md
  - ../09_milestones/MS-004-intelligent-feed-optimization.md
  - ../09_milestones/MS-005-stock-order-profit-feedback.md
  - ../09_milestones/MS-006-growth-analytics-and-demand-loops.md
  - ../09_milestones/MS-007-operations-trust-and-scale.md
related_adrs:
  - ../07_decisions/ADR-001-use-nestjs-postgres-kubernetes.md
```

## Purpose

Sequence `heureka-service` work so marketplace feed changes remain traceable to business intent, validation evidence, and measurable growth. The service must stay deterministic: it generates public Heureka.cz/sk XML from catalog and stock state, excludes zero-stock products, completes generation within 60 seconds, and never publishes internal commercial data.

## Strategic Outcome

Turn Heureka feed generation from a narrow XML endpoint into a governed marketplace feed engine that can prepare valid public XML, reject invalid or unsafe feed states, give catalog actionable readiness feedback, use AI only for suggestions, feed public-safe outcomes back into the ecosystem, and expose operational evidence for freshness, validity, timing, and downstream submission health.

## Non-Negotiable Invariants

| Invariant | Roadmap Meaning |
|---|---|
| INV-001 | Every generated feed must be valid Heureka XML before it is served or submitted. |
| INV-002 | Zero-stock products must be excluded from public feeds and feed-ready product sets. |
| INV-003 | Full feed generation must remain under 60 seconds, with evidence for risky changes. |
| INV-004 | Public feed fields must not expose internal cost, margin, supplier, payment, or private operational data. |
| INV-005 | Secrets stay in Vault/ESO and out of docs, prompts, tests, reports, and generated feed examples. |

## Ecosystem Integration Strategy

| Service | Boundary | Allowed Heureka Use | Forbidden Ownership Transfer |
|---|---|---|---|
| catalog-microservice | Product source of truth | Read product, price, media, category, and attribute data; return readiness blockers. | Heureka must not become catalog owner. |
| warehouse-microservice | Stock source of truth | Consume stock events and query stock freshness/readiness. | Heureka must not own stock reservation or warehouse mutation. |
| flipflop-service | Feed submission consumer | Receive feed URL/status and return submission evidence. | Heureka must not become submission scheduler unless approved by ADR. |
| orders-microservice | Order source of truth | Read aggregate demand/outcome signals after contract approval. | Heureka must not own orders or customer records. |
| payments/suppliers | Payment and supplier owners | Read eligibility signals after contract approval. | Heureka must not expose internal cost, margin, or supplier private values. |
| ai-microservice | Suggestion engine | Produce draft suggestions for public-safe feed improvements. | AI must not directly mutate public feed output. |
| logging/notifications | Event and alert sinks | Receive redacted lifecycle events and alerts. | Logs and alerts must not contain secrets or raw production records. |
| leads/marketing | Growth systems | Receive versioned public-safe demand segments after validation. | No raw PII or production order export. |

## Milestones

| Milestone | Goal | Status | Primary Lever |
|---|---|---|---|
| MS-001 | IPS governance bootstrap | reviewed | Delivery safety |
| MS-002 | Feed publication foundation | planned | Valid, observable, replay-safe feed generation |
| MS-003 | Catalog feed readiness | planned | More products eligible for Heureka feed |
| MS-004 | Intelligent feed optimization | planned | Better public feed quality and conversion |
| MS-005 | Stock, order, profit feedback | planned | Fewer stale listings, better margin decisions |
| MS-006 | Growth analytics and demand loops | planned | Actionable marketplace demand signals |
| MS-007 | Operations, trust, and scale | planned | Stable production feed operations |

## Stage 1: Feed Publication Foundation

Make feed generation a durable lifecycle: prepare, validate, persist, expose, hand off, observe, and reconcile. Persist validation snapshots for XML validity, product count, zero-stock exclusions, sensitive-field scan, timing, and feed type.

## Stage 2: Catalog Feed Readiness

Add deterministic single-product and bulk readiness checks that return missing fields, category/media/price/stock blockers, owner service, and remediation hints.

## Stage 3: Intelligent Feed Optimization

Define AI suggestion contracts for public feed text, categories, parameters, and media notes. Store suggestions with input snapshot hash, confidence, evidence, and review status; require approval and validation before public XML changes.

## Stage 4: Stock, Order, Payment, Supplier, And Profit Feedback

Strengthen stock freshness and zero-stock evidence, add flipflop submission feedback, and define read-only order/payment/supplier signals without moving ownership into Heureka.

## Stage 5: Growth Analytics And Demand Loops

Emit redacted events for feed generation, inclusion/exclusion counts, validation failures, stale feeds, submission outcomes, and readiness blockers.

## Stage 6: Operations, Trust, And Scale

Add smoke checks, alert thresholds, dashboards, rollback playbooks, and scale validation for the 60-second generation invariant.
