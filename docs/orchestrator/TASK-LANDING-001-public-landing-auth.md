# TASK-LANDING-001 Public Landing And Hosted Auth

## Vision

Alfares Heureka is a sales channel that lets Alfares clients publish catalog products to Heureka with automation, speed, and operational control.

## Goal Impact

Clients get a public entry point at `https://heureka.alfares.cz/`, understand the value of automated catalog-to-Heureka publishing, and register through the shared Alfares Auth platform instead of a local form.

## System

`heureka-service` on `alfares`, deployed from `/home/ssf/Documents/Github/heureka-service`, currently serves the public host and health endpoint through the NestJS Heureka service on port `3800`.

## Feature

Public responsive landing page plus hosted Auth routes:

- `/`
- `/login`
- `/register`
- `/auth/callback`
- `/dashboard`

## Task

Add a code-native landing page focused on automation, fewer human errors, faster offer updates, full control, and shared Alfares registration.

## Execution Plan

1. Keep existing `/heureka/*` API and `/health` behavior intact.
2. Add a public Nest controller for static HTML/CSS/JS routes.
3. Use hosted Auth with `client_id=heureka-service` and `return_url=https://heureka.alfares.cz/auth/callback`.
4. Parse token handoff from `window.location.hash`, validate `state`, persist tokens locally, and remove the hash from browser history.
5. Validate build, live routes, hosted Auth redirect behavior, and responsive rendering.

## Coding Prompt

Implement the Heureka public landing in the remote repo only. Do not add a local login/register form. Do not create a separate frontend deployment unless the existing service structure requires it.

## Code

Runtime files:

- `services/heureka-service/src/main.ts`
- `services/heureka-service/src/app.module.ts`
- `services/heureka-service/src/public/public.controller.ts`

## Validation

Planned evidence:

- `cd services/heureka-service && npm run build`
- `curl -I https://heureka.alfares.cz/`
- `curl -I https://heureka.alfares.cz/health`
- hosted Auth URL validation for `https://heureka.alfares.cz/auth/callback`
- browser screenshot checks for desktop and mobile after deploy

