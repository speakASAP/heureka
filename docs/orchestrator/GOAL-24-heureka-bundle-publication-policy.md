# GOAL 24 Heureka Bundle Publication Policy

Date: 2026-07-03
Owner: Heureka channel policy worker
Status: Heureka-owned policy implemented; bundle feed publication remains blocked

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: Alfares marketplace channels publish only public-safe, deterministic feed items while Catalog keeps bundle identity separate from checkout, stock, payment, and marketplace side effects.
- Goal Impact: addresses the Heureka-owned part of `[MISSING: channel-specific external marketplace bundle publication policies]` for Catalog `catalog.bundle.v1` by defining a fail-closed Heureka policy.
- System: Heureka owns XML feed inclusion/rendering and external Heureka publication handoff; Catalog owns `catalog.bundle.v1`; Warehouse owns component stock; Orders/Payments own checkout evidence.
- Feature: Heureka bundle publication policy for external marketplace feeds.
- Task: document and verify whether a Catalog bundle aggregate can be published as one Heureka feed item.
- Execution Plan: source-policy and docs only; no feed regeneration, live publication, Catalog mutation, Warehouse mutation, Orders/Payments mutation, external Heureka mutation, deploy, or Kubernetes change.
- Coding Prompt: fail closed when Heureka cannot represent a Catalog bundle as one feed item under current rules; preserve component-product publication as the only approved current alternative.
- Code: `services/heureka-service/src/heureka/feed/bundle-publication-policy.ts`, `scripts/verify_heureka_bundle_publication_policy.js`, `package.json` script entry, and this policy document.
- Validation: `npm run verify:heureka-bundle-publication-policy`; `LOGGING_SERVICE_URL=http://logging-microservice:3367 npm --prefix services/heureka-service run build`; `git diff --check`.
- State Update: Heureka channel policy is explicit; `catalog.bundle.v1` bundle-as-one-`SHOPITEM` publication remains blocked.

## Decision

Heureka must not publish a Catalog `catalog.bundle.v1` aggregate as one XML feed item under the current service rules.

The current Heureka feed renderer emits one `SHOPITEM` for each included Catalog product ID in `heureka_products`. Readiness, stock, category, image, price, quality, and XML validation all operate on Catalog product snapshots and Warehouse component stock. Catalog `catalog.bundle.v1` is explicitly not a Catalog product row, SKU, stock item, current price record, or marketplace offer identity. Therefore Heureka cannot safely map one bundle aggregate to one external marketplace feed item without inventing SKU, price, stock, category, delivery, or external import semantics.

## Current Allowed Behavior

- Component Catalog products may be published individually when the existing Heureka product readiness policy returns `ready` or `warning`.
- `catalog.bundle.v1` may be used as storefront/dashboard merchandising evidence outside the Heureka XML feed.
- A future Heureka bundle feed item requires a new approved channel policy covering item identity, component disclosure, category, public copy, price presentation, stock evidence, delivery/free-shipping claims, external import behavior, and rollback/validation evidence.

## Current Blockers

- `[MISSING: approved Heureka bundle-as-one-SHOPITEM policy]`
- `[MISSING: external Heureka evidence that bundle aggregates may be imported as one marketplace item without product SKU/stock identity]`
- `[MISSING: approved source for bundle price/category/delivery/free-shipping copy in Heureka XML]`
- `[MISSING: approved Heureka runtime verifier proving bundle publication is non-mutating and externally safe]`

## Forbidden Actions

- Do not add `catalog.bundle.v1` IDs to `heureka_products` for live feed publication.
- Do not serialize a bundle aggregate as a Heureka `SHOPITEM` by reusing a component product SKU, price, category, or stock row.
- Do not publish a bundle to external Heureka, trigger external import checks for bundle items, or mutate external marketplace state.
- Do not change Catalog, Orders, Warehouse, Payments, Allegro, Bazos, Aukro, FlipFlop, Kubernetes manifests, deploy scripts, migrations, or secrets from this policy lane.

## Parallel Execution

| Workstream | Status | Owner role | Objective | Allowed files | Forbidden files | Dependencies | Validation evidence | Handoff notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| H1 Heureka policy | ready now | Heureka policy worker | Define fail-closed bundle publication decision | This document, Heureka source policy, verifier script, package script | Catalog/Orders/Warehouse/Payments/other marketplace repos, deploy/k8s/secrets/migrations | Catalog `catalog.bundle.v1` contract evidence | `npm run verify:heureka-bundle-publication-policy`, service build, `git diff --check` | Completed in this lane. |
| H2 Catalog status sync | dependency-gated | Catalog integration owner | Mark Heureka policy resolved in Catalog Goal 24 status | Catalog docs/status only | Heureka source | H1 commit merged/pushed | Catalog doc validation | Separate Catalog-owned lane. |
| H3 Future external policy | blocked | Marketplace policy owner | Approve a bundle-as-offer external Heureka policy if desired | New cross-service policy docs/verifiers | Live publication until approved | Owner/external marketplace evidence | `[MISSING: approved policy]` | Not part of this lane. |

Shared contracts: `catalog.bundle.v1`, existing Heureka product readiness, existing Heureka feed validation policy.
Integration owner: Catalog commerce integration owner after Heureka branch handoff.
Validation owner: Heureka channel worker for H1; Catalog integration owner for status sync.
Merge order: Heureka policy first, Catalog status sync second, future external policy only after owner approval.
