# Agents

## Required reading
- `README.md`
- `BUSINESS.md`
- `SYSTEM.md`
- `TASKS.md`
- `STATE.json`
- `intent-preservation-system/docs/24_onboarding/PROJECT_ADOPTION_STANDARD.md`
- `intent-preservation-system/scripts/validate_adoption_profile.py`

## Authority
This repo owns the Heureka marketplace integration boundary and the feed-generation logic for the service, but it does not own the product catalog, warehouse truth, or general commerce platform responsibilities.

## Intent preservation system
This repo preserves the standard chain by documenting the actual service boundary, keeping operational ownership honest, and tracing the onboarding profile through the local IPS artifacts.

## Safety and operations
- Keep the repo truthful about its responsibility boundaries.
- Do not claim source-of-truth ownership for catalog pricing or warehouse inventory state.
- Preserve the Heureka XML validity and zero-stock exclusion rules in all work.
- Protect sensitive data and never print tokens or raw production data in logs or documentation.

## Project-specific rules
- Feed validity and zero-stock filtering are non-negotiable execution requirements.
- The service depends on catalog and stock truth from upstream systems rather than maintaining them internally.
- Operational changes should remain scoped to Heureka feed generation, product readiness, and market integration behavior.

## Required final report
The final report must describe the Heureka service scope, the validation evidence used, the upstream dependencies that were kept honest, and the concrete next action for any remaining operational follow-up.
