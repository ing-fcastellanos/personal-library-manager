## Why

The app has no deployment path: it runs only locally. Issue #3 (milestone M0) closes
that gap by containerizing the Next.js + custom Express server and auto-deploying it to
Google Cloud Run on every push to `main`. The codebase already anticipates this — Firebase
Admin authenticates via ADC with no key file, `/api/health` exists for the platform probe,
and ADR-0001/0003 assume a single container on Cloud Run — so this is plumbing, not a
refactor.

## What Changes

- Add a multi-stage **Dockerfile** (+ `.dockerignore`) that builds Next (`next build`) and
  the compiled Express server (`tsc -p tsconfig.server.json`) and runs
  `node dist/server/index.js` on a slim Node 22 runtime with production-only `node_modules`.
- Add a **deploy job** to the existing `.github/workflows/ci.yml`, gated on the `quality`
  job and on `push` to `main`: authenticate to GCP via **Workload Identity Federation** (no
  JSON keys), build + push the image to **Artifact Registry** (tagged with the commit SHA),
  and **`gcloud run deploy`** the single prod service.
- Wire the three config planes correctly: the public `NEXT_PUBLIC_FIREBASE_*` values as
  **build-time Docker args**, the AI keys as **Secret Manager** runtime secrets, and
  Firebase Admin via the runtime service account's **ADC**.
- Add a **`docs/deploy.md` runbook** for the one-time manual GCP prerequisites the workflow
  assumes (WIF pool/provider, deployer + runtime service accounts, Artifact Registry repo,
  Secret Manager secrets, the GitHub Actions variables to set).

## Capabilities

### New Capabilities

- `deployment`: containerized build and automated Cloud Run deployment — the Docker image
  contract, the push-to-`main` CI/CD pipeline, GCP auth via WIF, and the build-time /
  runtime / ADC config split.

### Modified Capabilities

<!-- none — app-platform's "Health endpoint" requirement is consumed by the Cloud Run probe
     but its behavior is unchanged. -->

## Impact

- New files: `Dockerfile`, `.dockerignore`, `docs/deploy.md`.
- Modified: `.github/workflows/ci.yml` (adds the `deploy` job).
- No application code changes — the server, Firebase Admin init, and health endpoints are
  already deploy-ready.
- External (manual, documented in the runbook): GCP project setup — WIF, two service
  accounts, Artifact Registry, three Secret Manager secrets, and GitHub Actions variables.
- Out of scope: staging environment, `output: 'standalone'` image slimming, Firebase App
  Check / API-key restriction (#42), custom domain.
