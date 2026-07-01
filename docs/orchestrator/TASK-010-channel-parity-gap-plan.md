# TASK-010: Heureka Sales Channel Parity Gap Plan

Date: 2026-07-01
Repository: `/home/ssf/Documents/Github/heureka-service`
Orchestrator: current Codex thread
Status: active

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
- Current preflight at plan creation:
  - Branch: `main`.
  - Remote status: `main...origin/main [behind 2]`.
  - Dirty worktree: existing changes in `Dockerfile`, `README.md`, `STATE.json`, `TASKS.md`, `k8s/deployment.yaml`, validation reports, Heureka feed/public files, shared auth, shared catalog client, and new dashboard/feed files.

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
| D | dependency-gated | Worker: frontend/public surface | Bring landing/Auth/static dashboard shell to reference parity. | `services/heureka-service/src/public/**`, frontend/static assets if present, nginx/k8s only if route wiring requires it. | Catalog/orders/shared clients. | Phase 2 checklist. | Orchestrator. |
| E | dependency-gated | Worker: product/feed catalog parity | Bring Catalog product/feed controls to reference channel lifecycle shape. | `services/heureka-service/src/heureka/feed/**`, `shared/clients/catalog-client.service.ts` if needed. | Public landing/dashboard files. | Phase 2 checklist. | Orchestrator. |
| F | dependency-gated | Worker: orders/logging/health parity | Bring Orders, logging, health, and telemetry to reference channel lifecycle shape. | `services/heureka-service/src/heureka/orders/**`, `shared/logger/**`, `shared/clients/order-client.service.ts`, service health wiring. | Public/feed files unless needed for route registration. | Phase 2 checklist. | Orchestrator. |

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

Pending Phase 2 checklist.

## Validation

Pending implementation. Validation must include exact command output summary for every changed surface.

## Open Questions

- `[UNKNOWN: production Heureka host and exact public URL until ingress/live route inspection is completed]`
- `[UNKNOWN: whether existing TASK-009 dirty changes are owner-approved final work or in-progress draft; treat as protected until inspected]`
- `[UNKNOWN: whether Heureka should expose a service-local React frontend or keep the current server-rendered public controller pattern; decide from reference parity and current repo structure]`

