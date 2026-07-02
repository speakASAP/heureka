# Heureka Dashboard Catalog Source Options Validation

Date: 2026-07-02
Worker role: Heureka dashboard worker
Remote repo: `/home/ssf/Documents/Github/heureka`
Deploy: not run by instruction

## Intent Preservation Chain

- Vision: registered Heureka users can work with own, Alfares, and community Catalog-backed products from the personal dashboard.
- Goal Impact: users can reach Catalog product creation/source settings while Heureka remains the channel/feed surface.
- System: Catalog owns product truth, ownership, source settings, and resale visibility; Heureka owns channel listing overrides and feed inclusion.
- Feature: dashboard Catalog entry points, source scope filter/copy, source labels, and resale path handoff.
- Task: implement missing personal-cabinet Catalog source/resale options without backend schema changes or deploy.
- Execution Plan: use existing Catalog `catalogScope` reads and Catalog Dashboard links; do not invent a parallel resale mutation contract.
- Coding Prompt: remote-only edits in allowed Heureka files, preserve dirty worktree changes, no deploy.
- Code: implemented in dashboard controller/service, dashboard shell, and focused self-test.
- Validation: commands and results below.

## Requirement Matrix

| Requirement | Status | Evidence |
|---|---|---|
| Catalog manage/create/settings entry points | PASS | Dashboard toolbar and source strip link to `https://catalog.alfares.cz/dashboard/products`, `/dashboard/products/new`, and `/dashboard/settings`. |
| Source options for own, Alfares, and community products | PASS | `/heureka/dashboard/catalog-products?source=own|alfares|community` maps to existing Catalog `catalogScope`; UI has a Catalog source select and copy for effective/own/Alfares/community. |
| Visible source labels in product list/detail | PASS | Product rows show source chips and resale state; detail panel shows Catalog source, read-only status, and Catalog Dashboard actions. |
| Owner-only resale toggle | NOT IMPLEMENTED | `[MISSING: local Heureka resale mutation path]`; existing Heureka edit path updates local listing/Heureka marketplace overrides and does not provide a verified owner-only Catalog product mutation path. Resale is handed off to Catalog Dashboard settings/product management. |
| Non-owned Catalog products remain read-only in Heureka | PASS | Source projection marks `readOnlyCatalogRecord` for non-owned records; UI copy directs canonical product edits/resale to Catalog. |

## Validation Evidence

- `git diff --check` -> PASS
- `LOGGING_SERVICE_URL=http://logging-microservice:3367 services/heureka-service/node_modules/.bin/ts-node --skip-ignore --compiler-options '{"experimentalDecorators":true,"emitDecoratorMetadata":true,"types":["node"]}' services/heureka-service/src/heureka/dashboard/dashboard-list-products.self-test.ts` -> PASS (`PASS dashboard-list-products self-test`)
- `LOGGING_SERVICE_URL=http://logging-microservice:3367 services/heureka-service/node_modules/.bin/ts-node --skip-ignore --compiler-options '{"experimentalDecorators":true,"emitDecoratorMetadata":true,"types":["node"]}' services/heureka-service/src/public/public-dashboard-routes.self-test.ts` -> PASS (`PASS public-dashboard-routes self-test`)
- `LOGGING_SERVICE_URL=http://logging-microservice:3367 npm --prefix services/heureka-service run build` -> PASS (`tsc && tsc-alias`)

## Dirty Worktree Caveat

During this worker run, `services/heureka-service/src/public/public.controller.ts` and `services/heureka-service/src/public/public-dashboard-routes.self-test.ts` were already dirty with landing-copy work from another agent. This task layered dashboard-only changes into `public.controller.ts` and did not edit `public-dashboard-routes.self-test.ts`.

## Remaining Missing Or Unknown

- `[MISSING: local Heureka resale mutation path]`
- `[UNKNOWN: exact Catalog owner metadata shape for every product response variant]`; the projection supports common `ownerUserId`, `owner_user_id`, `owner.email`, `seller.email`, and source owner fields.
- `[UNKNOWN: runtime Auth token for authorized browser smoke]`; no deploy or live token smoke was requested.
