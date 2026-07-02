# BPCP Holiday Discount Adoption

Status: service-local adoption contract
Date: 2026-07-02
Service: `heureka`
Central contract pack: `statex-ecosystem/docs/business-process-control-plane/`

## Role

Channel consumer for holiday messaging only where supported by Heureka flows.

## Responsibilities

- Render or export campaign messaging only if channel contract allows it.
- Do not mutate price/feed contracts without channel-specific approval.

## Required interfaces

- Supported slot map or explicit unsupported slot result.
- Optional feed/message metadata if allowed.

## Boundaries

- This service must not become the global owner of BPCP process definitions.
- This service must fail closed on invalid or unknown BPCP process versions.
- This service must keep existing domain ownership and invariants.
- This service must expose or document dry-run behavior before live execution.
- This service must not overwrite existing service contracts without an
  explicit integration owner and validation owner.

## Holiday Discount pilot expectations

- Recognize `holiday-discount-2026` only through versioned BPCP contracts.
- Preserve `processId`, `processVersion`, and `policyId` in every relevant
  decision, event, snapshot, log, or rendered experience.
- Support rollback by respecting BPCP pause and retired states.
- Keep process display and process execution separate where applicable.

## Blockers and unknowns

- [MISSING: Heureka channel constraints for promotions]

## Validation evidence required before implementation is accepted

- Channel parity checklist includes BPCP slot support or unsupported reason.
- No feed mutation without dedicated validation.

## Parallel handoff

This adoption doc is safe for a focused service owner to implement in parallel
after the central BPCP schemas are accepted. The service owner must not edit
shared BPCP schemas directly; schema changes go through the BPCP integration
owner.
