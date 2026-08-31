# Agent operations

## Roles
- Readiness scanner: classify whether a change is within the feed-generation boundary or an upstream dependency issue.
- Worker agent: implement one bounded change in the feed logic, API contract, or readiness handling.
- Worker monitor: watch for scope drift into catalog ownership, warehouse control, or payment logic.
- Integration validator: confirm the service remains truthful about its dependencies and validation evidence.

## Before work
- Read the repo’s actual business and system boundaries before changing code.
- Confirm whether the requested change touches the marketplace feed, readiness logic, order ingestion, or an upstream dependency.
- Verify that no change is silently expanding into catalog or payment ownership.

## Parallel work
- Feed-generation improvements and readiness logic changes may proceed together only when they stay within the marketplace integration boundary.
- Do not assign parallel agents to service-of-truth ownership for catalog, warehouse, or payment systems.

## Validation debt
- Any known validation debt must be recorded in `docs/orchestrator/VALIDATION_DEBT.md` and kept separate from current-task failures.
- Current-task failures remain blocking even if a repo-wide debt record exists.

## Handoff
- Document any change that alters the Heureka feed contract, the stock-update processing flow, or product inclusion behavior.

## Project-specific operations
- Preserve the Heureka XML validity contract and zero-stock exclusion rules.
- Keep the service boundary aligned with catalog and warehouse up-stream ownership rather than inventing a broader commerce layer.
