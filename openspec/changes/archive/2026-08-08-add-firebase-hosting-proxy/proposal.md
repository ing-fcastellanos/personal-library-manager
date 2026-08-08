## Why

Cloud Run's default URL (`*.run.app`) works but isn't a memorable/brandable domain, and
Cloud Run alone gives up the free global CDN and managed-SSL edge that Firebase Hosting
provides. ADR-0001 already ruled out Firebase Hosting **alone** (it can't run the Express
SSR server), but that decision didn't consider Firebase Hosting **as a proxy** in front of
an existing Cloud Run service — a well-supported pattern (`hosting.rewrites[].run`) that
adds a Firebase-managed edge/CDN/domain without moving any server logic off Cloud Run.

## What Changes

- Add a `hosting` block to `firebase.json`: a catch-all rewrite (`"source": "**"`) to the
  existing Cloud Run service (`personal-library-manager`, `us-central1`) — no static
  `public` directory, so 100% of traffic still passes through to the same Express/Next
  server that handles it today. Behavior is unchanged; only the front door changes.
- Extend `docs/adr/0001-hosting-cloud-run.md`'s Alternatives section (or add a short
  follow-up ADR) to record that Firebase Hosting **as a Cloud Run proxy** is adopted,
  distinct from the already-rejected "Firebase Hosting (solo)" option.
- Add a one-time manual runbook section to `docs/deploy.md` for enabling Hosting and
  running the first `firebase deploy --only hosting` — mirroring the existing runbook
  style (PowerShell, run by the maintainer, not automated in CI).
- **Not** changed: the GitHub Actions deploy pipeline (still builds/pushes/deploys to
  Cloud Run exactly as today), the Express/Next server, and any application code.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `deployment`: adds a requirement that Firebase Hosting fronts the production Cloud Run
  service via a full-passthrough rewrite, plus a runbook requirement for the one-time
  Hosting setup steps.

## Impact

- `firebase.json` (config only).
- `docs/adr/0001-hosting-cloud-run.md` and/or a new ADR file.
- `docs/deploy.md` (new runbook section).
- `openspec/specs/deployment/spec.md` (new requirement via delta spec).
- No application code, no CI workflow changes, no Cloud Run service changes.
- Real infra actions (enabling the Hosting API, first `firebase deploy --only hosting`,
  confirming the Cloud Run service accepts Hosting's requests, adding the new domain to
  Firebase Auth's authorized domains) are manual, one-time, and performed by the project
  owner following the runbook — not executed by the assistant.
