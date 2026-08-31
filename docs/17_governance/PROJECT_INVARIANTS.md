# Project invariants

completeness_level: complete

status: validated

## Purpose
This file defines the operational invariants for the Heureka service and keeps the repo aligned with the actual ownership boundaries of the marketplace integration workflow.

## Applicability
These invariants apply to the Heureka repo, its operational workflow, and the service contract it owns in the wider ecosystem.

## Invariants
- The repo must not claim ownership of the product catalog source-of-truth or the central warehouse system.
- The feed must remain valid XML and must exclude zero-stock products.
- The service contract must be traceable to the project’s adoption and validation artifacts.
- Operational documentation must stay scoped to the Heureka integration boundary and not invent unrelated commerce responsibilities.

## Exceptions
Any exception to the feed validity or ownership boundary must be reviewed through the project owner and a clear justification must be recorded in the repo’s operational docs.

## Review cadence
This file should be reviewed at milestones that touch feed generation, data ownership, or dependency changes.
