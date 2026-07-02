# Heureka Central Orders Status Read Model Plan

Date: 2026-07-02
Parent plan: `orders-microservice/docs/orchestrator/2026-07-02-order-lifecycle-warehouse-status-rollout-plan.md`

## Objective

Heureka dashboard/order views must show central Orders lifecycle for every forwarded order and must flag orders missing a central Orders id.

## Current Evidence

- Heureka imports or ingests marketplace orders.
- The service forwards orders to central Orders and stores `orderId`.
- Dashboard order output currently appears to expose local status and forwarding state rather than full central lifecycle.

## Workstream

Owner role: Heureka read-model owner
Status: ready after Orders read contract

Allowed files:

- `services/heureka-service/src/heureka/**`
- Heureka docs, tests, validation reports

Forbidden files:

- unrelated marketplace sync/import code unless needed for order id mapping

## Required Work

1. Read central Orders by stored `orderId` or consume lifecycle events.
2. Render central lifecycle stage in dashboard/order detail.
3. Mark unforwarded orders as actionable errors.
4. Avoid presenting stale local status as canonical.

## Validation

- forwarded order shows central Orders id and lifecycle
- missing central Orders id is visible
- Orders API failure is shown as stale/unknown, not as a fake status
