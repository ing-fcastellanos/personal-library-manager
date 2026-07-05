## ADDED Requirements

### Requirement: Containerized image

The repository SHALL provide a multi-stage `Dockerfile` that builds the Next.js application
and the compiled Express server and produces a runtime image that starts the custom server
with `node dist/server/index.js` (never `next start`). The runtime stage SHALL contain only
production dependencies and the build outputs (`.next`, `dist/server`, `public`,
`next.config.mjs`, `package.json`). The container SHALL listen on the port given by the
`PORT` environment variable. A `.dockerignore` SHALL exclude development and non-runtime
files (`node_modules`, `.next`, `dist`, `.git`, `.env*`, emulator data, tests, openspec) so
the build context is reproducible.

#### Scenario: Image starts the custom server

- **WHEN** the runtime image is started with `PORT` set
- **THEN** it runs `node dist/server/index.js`, listens on that port, and serves both the
  Express API and the Next.js app from a single process

#### Scenario: Build outputs are present

- **WHEN** the image is built
- **THEN** `next build` and `tsc -p tsconfig.server.json` have run and their outputs
  (`.next`, `dist/server/index.js`) are included in the runtime stage

#### Scenario: Only production dependencies ship

- **WHEN** the runtime stage is assembled
- **THEN** it installs dependencies with dev dependencies omitted and does not include test,
  source-spec, or local-development files

### Requirement: Build-time public config, runtime secrets

The image build SHALL receive the public `NEXT_PUBLIC_FIREBASE_*` values as build arguments
so they are inlined into the client bundle at `next build` time. Server-only secrets (the AI
provider keys and the optional Google Books key) SHALL NOT be baked into the image; they
SHALL be supplied at runtime from Secret Manager. Firebase Admin credentials SHALL NOT be
supplied at all — the running service SHALL authenticate to Google Cloud via Application
Default Credentials from its service account.

#### Scenario: Public Firebase config is baked at build time

- **WHEN** the image is built with the `NEXT_PUBLIC_FIREBASE_*` build args set
- **THEN** the client bundle contains those public identifiers and the browser Firebase SDK
  initializes correctly

#### Scenario: Secrets are not in the image

- **WHEN** the built image is inspected
- **THEN** it contains no AI provider keys or other runtime secrets

#### Scenario: Admin SDK uses ADC at runtime

- **WHEN** the deployed service handles a request needing Firestore/Storage/Auth
- **THEN** Firebase Admin authenticates via the runtime service account's Application
  Default Credentials, with no key file present

### Requirement: Automated deploy to Cloud Run on push to main

A push to `main` SHALL, only after the existing quality job (lint, typecheck, test) passes,
build and push the image to Artifact Registry tagged with the commit SHA and deploy it to a
single production Cloud Run service. Deployment SHALL run only for `main` (not for pull
requests or other branches). The deployed service SHALL be publicly reachable and SHALL
expose the app at its URL.

#### Scenario: Push to main deploys

- **WHEN** a commit is pushed to `main` and the quality job passes
- **THEN** the image is built, pushed to Artifact Registry tagged with the commit SHA, and
  deployed to the production Cloud Run service, and the public URL serves the app

#### Scenario: Quality gate blocks a bad deploy

- **WHEN** the quality job fails on a push to `main`
- **THEN** the deploy job does not run

#### Scenario: Non-main refs do not deploy

- **WHEN** a pull request or a non-`main` branch is pushed
- **THEN** only the quality job runs and no deployment happens

#### Scenario: Health probe confirms readiness

- **WHEN** the Cloud Run service starts
- **THEN** its startup probe targets `/api/health` (liveness) and `GET /api/health` returns
  `200`, independent of Firestore availability

### Requirement: Keyless GCP authentication and runtime configuration

The pipeline SHALL authenticate to Google Cloud using Workload Identity Federation — no
service-account JSON keys SHALL be stored in the repository or in GitHub secrets. The deploy
SHALL run the service as a dedicated runtime service account, map the AI provider keys from
Secret Manager into the service environment, and set the non-secret runtime environment
(`GOOGLE_CLOUD_PROJECT`, `NODE_ENV=production`). The service SHALL be configured within free-
tier-friendly bounds (scale to zero, a small instance cap).

#### Scenario: No long-lived keys

- **WHEN** the deploy job authenticates to GCP
- **THEN** it uses Workload Identity Federation and no service-account JSON key exists in the
  repo or GitHub secrets

#### Scenario: Secrets mapped at deploy

- **WHEN** the service is deployed
- **THEN** the AI provider keys are bound from Secret Manager into the service environment
  and the runtime service account is set, while non-secret env (`GOOGLE_CLOUD_PROJECT`,
  `NODE_ENV`) is set directly

#### Scenario: Free-tier-friendly service shape

- **WHEN** the service is deployed
- **THEN** it is configured to scale to zero with a bounded maximum instance count and a
  modest memory limit

### Requirement: Manual GCP setup runbook

The repository SHALL document, in `docs/deploy.md`, the one-time manual Google Cloud
prerequisites that the workflow assumes: the Workload Identity Pool and Provider bound to
this GitHub repository, the deployer and runtime service accounts with their roles, the
Artifact Registry repository, the Secret Manager secrets, and the GitHub Actions variables
the workflow reads. The runbook SHALL be sufficient to reproduce the deployment target from
scratch.

#### Scenario: A new maintainer can provision the target

- **WHEN** a maintainer follows `docs/deploy.md` on a fresh GCP project
- **THEN** they create the WIF pool/provider, both service accounts with the listed roles,
  the Artifact Registry repo, and the secrets, and set the GitHub Actions variables, after
  which a push to `main` deploys successfully
