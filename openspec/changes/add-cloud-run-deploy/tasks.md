## 1. Container image

- [x] 1.1 Add multi-stage `Dockerfile`: deps (`npm ci`) → build (`npm run build`) → runtime (`node:22-slim`, `npm ci --omit=dev`, copy `.next` + `dist/server` + `public` + `next.config.mjs` + `package.json`), `CMD ["node","dist/server/index.js"]`, listening on `$PORT`
- [x] 1.2 Declare the 6 `NEXT_PUBLIC_FIREBASE_*` values as build `ARG`s in the build stage so `next build` inlines them
- [x] 1.3 Add `.dockerignore` (node_modules, .next, dist, .git, .env*, .emulator-data, coverage, \*\*/*.test.\*, openspec, docs)
- [x] 1.4 Build the image locally and run it with a test `PORT` + the public build args; confirm it starts and `GET /api/health` returns 200

## 2. CI/CD deploy job

- [x] 2.1 Add a `deploy` job to `.github/workflows/ci.yml`: `needs: quality`, `if: github.ref == 'refs/heads/main' && github.event_name == 'push'`, with `permissions: { id-token: write, contents: read }`
- [x] 2.2 Authenticate to GCP via `google-github-actions/auth@v2` (Workload Identity Federation) + `setup-gcloud`; configure Docker auth for Artifact Registry
- [x] 2.3 Build + push the image to Artifact Registry tagged with `${{ github.sha }}`, passing the `NEXT_PUBLIC_*` build args from GitHub Actions **variables**
- [x] 2.4 `gcloud run deploy` the prod service: `--image` (SHA tag), `--region=us-central1`, `--service-account=RUNTIME_SA`, `--set-secrets` for the AI keys, `--set-env-vars` for `GOOGLE_CLOUD_PROJECT`/`NODE_ENV`, `--min-instances=0 --max-instances=2 --memory=512Mi --allow-unauthenticated --port`
- [x] 2.5 Reference all GCP identifiers (project, region, repo, image, SA emails, WIF provider) via GitHub Actions variables/inputs — no hardcoded secrets

## 3. Runbook

- [x] 3.1 Write `docs/deploy.md`: enable APIs (run, artifactregistry, secretmanager, iamcredentials); create the Artifact Registry Docker repo
- [x] 3.2 Document the WIF pool + provider bound to this GitHub repo (OIDC), and the deployer SA (Artifact Registry Writer, Cloud Run Admin, Service Account User) with the WIF binding
- [x] 3.3 Document the runtime SA (Firestore/Datastore User, Storage object access, Secret Manager Secret Accessor) and the three Secret Manager secrets
- [x] 3.4 List the GitHub Actions **variables** (`NEXT_PUBLIC_*`, project/region/repo/SA/WIF values) the workflow reads

## 4. Verify

- [x] 4.1 Lint/typecheck/test still green; the workflow YAML is valid
- [ ] 4.2 First real deploy from `main`: pipeline goes green, the public Cloud Run URL serves the app, and `GET /api/health` returns 200
- [ ] 4.3 Smoke-check a Firestore-backed path (e.g. catalog) works in prod (ADC) and an AI path sees its key from Secret Manager
