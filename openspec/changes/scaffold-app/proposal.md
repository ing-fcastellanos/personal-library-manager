## Why

The repository has no application code yet — only planning artifacts (issues, ADRs, OpenSpec). Every other milestone (auth, catalog, AI, dashboard) depends on a running application skeleton. This change delivers issue **#1**: a minimal but production-shaped app foundation so subsequent features have a place to live.

## What Changes

- Initialize a **Next.js 15/16 (App Router)** project in **TypeScript**.
- Add a **custom Express server** that renders Next (SSR) and mounts the application API under `/api/*`.
- Provide a health endpoint `GET /api/health` returning `200`.
- Establish the base folder structure (`app/`, `server/`, `lib/`, `components/`, `services/`) per ADR-0003.
- Configure TypeScript, path aliases and local environment loading (`dotenv`).
- Add npm scripts: `dev`, `build`, `start`, `typecheck`.
- Add an initial README with local run instructions.

Out of scope (covered by other issues): Firebase wiring (#2), Dockerfile + Cloud Run CI/CD (#3), lint/test tooling (#4), design system (#6).

## Capabilities

### New Capabilities
- `app-platform`: The runnable application shell — a single Node process where an Express server renders the Next.js app (SSR) and exposes the `/api/*` surface, including a health check. This is the contract that all later capabilities build on.

### Modified Capabilities
<!-- None: this is the first change; no existing specs to modify. -->

## Impact

- **New code:** `server/` (Express entry + Next handler integration), `app/` (Next App Router root), `lib/`, `package.json`, `tsconfig.json`, `next.config`, `.env.example`, `README.md`.
- **Dependencies added:** `next`, `react`, `react-dom`, `express`, `typescript`, `@types/*`, `dotenv`.
- **Architecture:** implements ADR-0003 (Next served by a custom Express server). Sets the boundary between the web layer (Next) and the API layer (Express).
- **Downstream:** unblocks #2 (Firebase), #3 (Cloud Run), #4 (quality), #6 (design system) and the rest of the milestones.
