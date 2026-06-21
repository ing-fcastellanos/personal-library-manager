## Context

Greenfield repo with only planning artifacts (issues #1–#41, ADR-0001..0008, OpenSpec). ADR-0003 mandates Next.js served by a custom Express server, packaged as one unit for Cloud Run (ADR-0001). This change builds only that skeleton — no Firebase, CI, tooling or design system yet.

## Goals / Non-Goals

**Goals:**
- Runnable Next 15/16 (App Router) + Express custom server in TypeScript.
- `GET /api/health` → `200`.
- Folder structure and conventions that the rest of the milestones extend.
- One container-ready process (port via `PORT`).

**Non-Goals:**
- Firebase/Firestore/Auth/Storage wiring (#2).
- Dockerfile, Cloud Run, GitHub Actions (#3).
- ESLint/Prettier/test runners (#4).
- Any UI/design system beyond a placeholder page (#6).

## Decisions

- **Custom Express server over Next standalone.** Per ADR-0003, Express owns the HTTP server: it mounts `/api/*` Express routers and forwards everything else to Next's `getRequestHandler()`. Rationale: full control of server middleware (sessions, rate-limiting) needed by later milestones. Alternative (Next API routes only) rejected for less server-side control.
- **TypeScript everywhere, compiled server.** Next is built with `next build`; the Express entry (`server/index.ts`) is run with a TS-aware runtime in dev (`tsx`) and compiled to JS for production (`tsc`) so the runtime image needs no TS toolchain. Alternative (`ts-node` in prod) rejected for startup cost.
- **App Router under `app/`.** Aligns with Next 15/16 defaults; API surface lives in Express (`server/routes/`), not `app/api`, to keep a single API style.
- **Config via env + dotenv.** `PORT` (default 3000), `.env.example` documents variables. Matches Cloud Run's `PORT` injection.
- **Folder structure:** `app/` (Next routes/pages), `server/` (Express entry + routes + Next integration), `lib/` (shared utils/types), `components/`, `services/`. Path alias `@/*` → project root.

## Risks / Trade-offs

- **Custom server maintenance across Next majors** → keep the Next integration thin and isolated in `server/next.ts`; revisit on each Next upgrade.
- **Dev vs prod parity (tsx vs compiled)** → smoke-test `build && start` in CI later (#4) and in the Cloud Run deploy (#3).
- **Losing some Next platform optimizations by using a custom server** → acceptable for a self-hosted Cloud Run target; documented in ADR-0003.

## Migration Plan

Not applicable — first code in the repo. Delivered on branch `claude/hola-oejkn3`; no rollback concerns beyond reverting the commit.

## Open Questions

- Exact Next version (15 vs 16) pinned at implementation time to the latest stable that supports a custom server cleanly.
