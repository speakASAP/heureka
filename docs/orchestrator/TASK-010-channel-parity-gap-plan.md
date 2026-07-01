# TASK-010: Heureka Sales Channel Parity Gap Plan

Date: 2026-07-01
Repository: `/home/ssf/Documents/Github/heureka-service`
Orchestrator: current Codex thread
Status: active; code parity implemented through `task-010-route-cleanup-20260701`, remaining completion is owner/data-gated

## Vision

Heureka should behave like the other Alfares sales-channel services: a customer-facing landing page, hosted Auth entry, operator dashboard, catalog-driven product controls, orders integration, logging, health, deployment, and validation should follow the same contracts and maintenance style used by Allegro, Bazos, Aukro, and FlipFlop.

## Goal Impact

- Reduce channel-specific maintenance complexity by reusing the same flow shapes, route names, auth handoff, client services, dashboard semantics, logging conventions, and deploy validation patterns.
- Expose every missing Heureka feature as an implementation-ready checklist item before coding.
- Implement ready, low-risk parity items without overwriting existing uncommitted TASK-009 work.

## System

- Target system: `heureka-service`.
- Reference systems: `allegro-service`, `bazos-service`, `aukro-service`, `flipflop-service`, `catalog-microservice`, `orders-microservice`, `logging-microservice`, and shared Auth/Catalog/Orders clients.
- Source-of-truth environment: remote `alfares`, not the local `/Users/Sergej.Stasok/Documents/heureka` directory.

## Feature

Feature family: cross-channel parity for frontend, landing, dashboard, catalog communication, order communication, logging, microservice health, deployment, and validation.

## Task

1. Inventory the current Heureka implementation and dirty worktree.
2. Compare Heureka against the proven implementations in Allegro, Bazos, Aukro, and FlipFlop.
3. Compare Heureka contracts against Catalog, Orders, Auth, and Logging service expectations.
4. Produce a checklist of missing features with exact evidence.
5. Implement ready parity gaps in small, conflict-aware slices.
6. Validate build/tests/routes and record evidence.

## Execution Plan

### Phase 0: Remote Safety Gate

- Use only `/home/ssf/Documents/Github/heureka-service` on `alfares`.
- Do not edit local application code under `/Users/Sergej.Stasok/Documents/heureka`.
- Preserve existing dirty worktree changes unless they are clearly part of this task and reviewed.
- Current validated state after implementation:
  - Branch: `main`.
  - Remote status after final deployment and commit: clean worktree; `main...origin/main [ahead 8]`.
  - Latest deployed images: `localhost:5000/heureka-service:task-010-route-cleanup-20260701` and `localhost:5000/heureka-api-gateway:task-010-route-cleanup-20260701`.
  - Live route evidence: `/dashboard/orders`, `/dashboard/operations`, `/dashboard/settings`, `/health`, `/api/health`, and `/health/dependencies` return `200`; `/heureka/feed/preview?type=heureka_cz` returns XML with `x-heureka-feed-read-only: true`; `/api/heureka/orders`, `/api/settings`, and `/api/import/test` return expected unauthenticated `401`.

### Phase 1: Parallel Discovery

Run these lanes in parallel:

| Lane | Status | Owner Role | Objective | Scope | Forbidden Files | Expected Output | Validation Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A | ready_parallel | Explorer: Heureka current-state auditor | Map implemented Heureka features and gaps. | `heureka-service` docs, `services/heureka-service`, shared clients, k8s/nginx. | No writes. | Current-state matrix with route/module/file evidence. | File/path/route evidence only. |
| B | ready_parallel | Explorer: marketplace frontend parity auditor | Extract frontend/Auth/dashboard/landing patterns from Allegro, Bazos, Aukro, FlipFlop. | Reference repos only. | No writes. | Reference feature matrix and reusable files/contracts. | File/path/route evidence only. |
| C | ready_parallel | Explorer: integration parity auditor | Extract Catalog, Orders, Logging, health, deploy, and validation contracts used by reference channels. | Reference repos plus `catalog-microservice`, `orders-microservice`, `logging-microservice`. | No writes. | Integration checklist with concrete contracts. | File/path/command evidence only. |

### Phase 2: Checklist And Integration Plan

The orchestrator merges A/B/C outputs into `docs/orchestrator/TASK-010-channel-parity-checklist.md` with:

- Implemented in Heureka.
- Missing in Heureka.
- Partially implemented in Heureka.
- Blocked or unknown facts marked as `[MISSING: ...]` or `[UNKNOWN: ...]`.
- Implementation owner.
- Shared-file conflict risk.
- Validation command.
- Merge order.

### Phase 3: Parallel Implementation

Only after the checklist is written, split code work into disjoint write scopes:

| Lane | Status | Owner Role | Objective | Allowed Files | Forbidden Files | Dependency | Integration Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D | implemented | Worker: frontend/public surface | Bring landing/Auth/static dashboard shell to reference parity. | `services/heureka-service/src/public/**`, frontend/static assets if present, nginx/k8s only if route wiring requires it. | Catalog/orders/shared clients. | Phase 2 checklist. | Public landing/Auth/dashboard shells are explicit routes, deployed, and smoke-tested. |
| E | implemented with owner/data-gated product readiness residuals | Worker: product/feed catalog parity | Bring Catalog product/feed controls to reference channel lifecycle shape. | `services/heureka-service/src/heureka/feed/**`, `shared/clients/catalog-client.service.ts` if needed. | Public landing/dashboard files. | Phase 2 checklist. | Catalog content/profile, Warehouse batch readiness, and read-only external feed preview implemented; current blockers are stock/image owner data. |
| F | implemented with platform-level audit package residual | Worker: orders/logging/health parity | Bring Orders, logging, health, and telemetry to reference channel lifecycle shape. | `services/heureka-service/src/heureka/orders/**`, `shared/logger/**`, `shared/clients/order-client.service.ts`, service health wiring. | Public/feed files unless needed for route registration. | Phase 2 checklist. | Orders contract, local operation events, gateway orders routing, optional gateway route fail-closed handling, dependency health, and redacted gateway error logging deployed; shared ecosystem audit package remains separate platform work. |

Conflict rule: if two lanes need the same file, that file becomes orchestrator-owned and workers must hand off recommendations instead of editing it.

### Phase 4: Validation And Deployment Gate

- Run targeted unit/self-tests first.
- Run TypeScript builds for modified packages.
- Run IPS gates if the changed surface touches docs/contracts.
- Run route smoke checks locally or against deployed routes only after build passes.
- Deploy only after validation and dirty worktree review.

## Coding Prompt

Implement missing Heureka channel parity by copying the proven shape of other Alfares marketplace services, not by inventing a separate Heureka-specific architecture. Keep code scoped, preserve existing uncommitted work, and mark unknown runtime or credentials facts explicitly.

## Code

Implemented in the remote repo and tracked in `docs/orchestrator/TASK-010-channel-parity-checklist.md`.

## Validation

Validated with targeted self-tests, TypeScript builds, IPS gates, live deployment smoke, dependency-health smoke, public dashboard route smoke, gateway route/redaction/optional-route smoke, read-only feed preview smoke, blocked-product lane verifier, and external-readiness verifier. Use `npm run verify:task-010-source-parity` for the consolidated non-mutating source parity bundle.

## Open Questions

- `[RESOLVED: production Heureka host]`; live public URL is `https://heureka.alfares.cz`.
- `[RESOLVED: TASK-009 dirty worktree baseline]`; TASK-010 changes are committed and deployed in the remote repo; current worktree is clean except branch ahead status when not pushed.
- `[RESOLVED: frontend implementation style]`; Heureka keeps the current server-rendered public controller/dashboard pattern because it matches Bazos/Aukro static-controller parity and avoids introducing a new local React app only for Heureka.
- `[MISSING: owner-supplied stock, primary images, and external Heureka approval/import evidence]`; these are the remaining completion blockers and are tracked in `TASK-010-data-owner-handoff.md`.
