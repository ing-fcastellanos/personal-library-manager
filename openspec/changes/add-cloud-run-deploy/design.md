## Context

The app is a single Node process: `server/index.ts` mounts the Express API and delegates
everything else to Next.js via `next()` used as a library (`server/next.ts`), per ADR-0003.
`npm run build` runs `next build && tsc -p tsconfig.server.json` → `.next/` + `dist/server/`;
`npm start` runs `node dist/server/index.js`. Firebase Admin (`lib/firebase/admin.ts`)
already uses ADC in production and reads env at call time. `/api/health` (liveness) and
`/api/health/ready` (Firestore check) exist. `engines.node >= 22.12`. There is no
Dockerfile, and `.github/workflows/ci.yml` runs lint/typecheck/test only.

## Goals / Non-Goals

**Goals:**

- One reproducible container image that serves the whole app.
- Push-to-`main` → automatic Cloud Run deploy, gated on CI green.
- Keyless GCP auth (WIF); secrets never in the image or the repo.
- A runbook so the GCP target can be recreated from scratch.

**Non-Goals:**

- Staging / multi-environment promotion (prod only).
- `output: 'standalone'` image slimming (follow-up).
- Firebase App Check / API-key restriction (#42), custom domain, IaC (Terraform).

## Decisions

### D1 — Multi-stage Dockerfile shipping prod `node_modules`, not Next standalone

Stages: **deps** (`npm ci`, full) → **build** (`npm run build`) → **runtime** (`node:22-slim`,
`npm ci --omit=dev`, copy `.next` + `dist/server` + `public` + `next.config.mjs` +
`package.json`), `CMD ["node","dist/server/index.js"]`. _Why not `output: 'standalone'`:_ Next's
standalone traces deps for **its own** server entry, not our custom Express entry, so
`express`/`firebase-admin`/`openai` may be missing or the wrong server gets shipped. Prod
`node_modules` is larger but correct and simple — the right M0 trade. Slimming is a measured
follow-up.

### D2 — Three config planes, three delivery mechanisms

The crux of the change. `NEXT_PUBLIC_FIREBASE_*` are **public** and inlined at `next build`,
so they must be **Docker build ARGs** (sourced from GitHub Actions _variables_, not secrets) —
treating them as runtime env would ship a broken client bundle. AI keys are **runtime
secrets** via Cloud Run `--set-secrets` from Secret Manager, never baked in. Firebase Admin
needs **nothing injected** — ADC from the runtime service account. `GOOGLE_CLOUD_PROJECT` and
`NODE_ENV` are plain `--set-env-vars`.

```
build-time ARG  ─►  NEXT_PUBLIC_FIREBASE_* (6)   (public, baked into client bundle)
runtime secret  ─►  OPENAI/GEMINI/GOOGLE_BOOKS keys  (Secret Manager → --set-secrets)
runtime env     ─►  GOOGLE_CLOUD_PROJECT, NODE_ENV   (--set-env-vars)
ADC             ─►  Firestore / Storage / Auth        (runtime service account)
```

### D3 — Deploy as a gated job inside the existing `ci.yml`

Add a `deploy` job with `needs: quality` and `if: github.ref == 'refs/heads/main' && github.event_name == 'push'`.
One workflow, deploy strictly downstream of green CI, only on `main`. _Alternative:_ a separate
workflow keyed on `workflow_run` — rejected as more moving parts for no benefit at this scale.

### D4 — Keyless auth via Workload Identity Federation

`google-github-actions/auth@v2` exchanges the GitHub OIDC token for short-lived GCP
credentials against a Workload Identity Pool/Provider bound to this repo. No JSON keys in the
repo or GitHub secrets. The job needs `permissions: { id-token: write, contents: read }`. The
deployer SA (impersonated via WIF) holds Artifact Registry Writer + Cloud Run Admin + Service
Account User; the **runtime** SA (passed as `--service-account`) holds Firestore/Storage +
Secret Manager Secret Accessor.

### D5 — Image tagged by commit SHA; deploy parameters

Tag `REGION-docker.pkg.dev/PROJECT/REPO/IMAGE:${GITHUB_SHA}` for traceability/rollback.
`gcloud run deploy` with `--region=us-central1`, `--min-instances=0` (scale to zero — cold
starts acceptable for a personal app), `--max-instances=2`, `--memory=512Mi` (bump to 1Gi if
Next 15 + React 19 OOMs), `--allow-unauthenticated` (public app), `--port` matching the
server. Startup probe → `/api/health` (liveness only) so a Firestore hiccup can't fail the
rollout; `/api/health/ready` stays for manual checks.

### D6 — Manual GCP prerequisites documented, not automated

WIF, service accounts, Artifact Registry, and Secret Manager are created once, by hand,
following `docs/deploy.md`. IaC is out of scope for M0; the runbook lists every value the
workflow consumes (project, region, repo, SA emails, WIF provider resource name, the
`NEXT_PUBLIC_*` GitHub Actions variables) so the workflow is reproducible without guesswork.

## Risks / Trade-offs

- **[Image size from full prod `node_modules`]** → Accept for M0; revisit with standalone or
  dep-pruning if pulls get slow. Bounded by `.dockerignore` and `--omit=dev`.
- **[Cold starts at min-instances=0]** → A few seconds on first hit after idle; fine for
  personal use. Bump to `min-instances=1` later if it annoys (small always-on cost).
- **[512Mi OOM with Next 15 / React 19 SSR]** → Watch the first deploys; `--memory=1Gi` is a
  one-line bump. Build happens in CI, not at runtime, so runtime memory is serving-only.
- **[Missing `NEXT_PUBLIC_*` at build → broken client]** → Pipeline passes them as build args
  from GitHub Actions variables; the runbook lists them explicitly. They are public, so no
  secret exposure.
- **[WIF/SA misconfiguration is the main failure mode]** → It is one-time and documented; the
  first deploy validates it end-to-end (push → URL serves, `/api/health` 200).
