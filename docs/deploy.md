# Deploy — Cloud Run + GitHub Actions

The app deploys automatically to **Google Cloud Run** on every push to `main`
(`.github/workflows/ci.yml` → `deploy` job, gated on the `quality` job). This page is the
**one-time setup** for the GCP target the workflow assumes. Everything here is created by
hand once; after that, pushes deploy themselves.

The workflow is keyless: GitHub authenticates to GCP via **Workload Identity Federation**
(OIDC) — no service-account JSON key is ever stored in the repo or in GitHub secrets.

> Commands below are **Windows PowerShell**. Run them in a PowerShell session with the
> `gcloud` and `gh` CLIs installed and authenticated.

## Config model

| Plane             | What                                                       | Where it enters                                                                                            |
| ----------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Public web config | `NEXT_PUBLIC_FIREBASE_*` (6)                               | **Build args**, from GitHub Actions **variables** (public, inlined into the client bundle at `next build`) |
| Runtime secrets   | `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_BOOKS_API_KEY` | **Secret Manager** → Cloud Run `--set-secrets` (never in the image)                                        |
| Admin credentials | Firestore / Storage / Auth                                 | **ADC** from the runtime service account — nothing to inject                                               |
| Non-secret env    | `GOOGLE_CLOUD_PROJECT`, `NODE_ENV`                         | Cloud Run `--set-env-vars`                                                                                 |

## Prerequisites

- `gcloud` CLI authenticated as a project owner/editor.
- A GCP project with billing enabled.
- Admin access to the GitHub repo (to set Actions variables).

Fill these in and set them for the rest of the session (PowerShell):

```powershell
$PROJECT_ID     = "personal-library-manager-frank"
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$REGION         = "us-central1"
$REPO           = "app"                                  # Artifact Registry repository
$SERVICE        = "personal-library-manager"             # Cloud Run service
$GH_REPO        = "ing-fcastellanos/personal-library-manager"  # owner/repo
gcloud config set project $PROJECT_ID
```

## 1. Enable APIs

```powershell
gcloud services enable `
  run.googleapis.com `
  artifactregistry.googleapis.com `
  secretmanager.googleapis.com `
  iamcredentials.googleapis.com `
  iam.googleapis.com
```

## 2. Artifact Registry repository

```powershell
gcloud artifacts repositories create $REPO `
  --repository-format=docker --location=$REGION `
  --description="Container images for $SERVICE"
```

## 2b. Firestore database — must be `(default)`

The app stores everything in Firestore. The Admin SDK (and the local emulator) target the
standard **`(default)`** database — note the parentheses. A database with any other name
(e.g. a literal `default`) is a _different_ database the SDK will not use; the symptom is
`500 {"error":"internal"}` on every read in prod while local (emulator) works fine. Create
the `(default)` database once (omit `--database` so it is the default):

```powershell
gcloud firestore databases create --location=$REGION
```

Verify the name shows parentheses:

```powershell
gcloud firestore databases list --format="value(name)"
# → projects/<project>/databases/(default)
```

A fresh database is empty — seed any initial data (e.g. readers) separately.

## 3. Runtime service account (used BY the Cloud Run service)

Holds only what the running app needs: Firestore, Storage, and read access to the secrets.

```powershell
gcloud iam service-accounts create plm-runtime --display-name="PLM Cloud Run runtime"
$RUNTIME_SA = "plm-runtime@$($PROJECT_ID).iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID `
  --member="serviceAccount:$RUNTIME_SA" --role="roles/datastore.user"
gcloud projects add-iam-policy-binding $PROJECT_ID `
  --member="serviceAccount:$RUNTIME_SA" --role="roles/storage.objectAdmin"
```

## 4. Deployer service account (impersonated BY GitHub Actions)

Holds only what the pipeline needs: push images, deploy Cloud Run, and act as the runtime SA.

```powershell
gcloud iam service-accounts create plm-deployer --display-name="PLM CI deployer"
$DEPLOYER_SA = "plm-deployer@$($PROJECT_ID).iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID `
  --member="serviceAccount:$DEPLOYER_SA" --role="roles/artifactregistry.writer"
gcloud projects add-iam-policy-binding $PROJECT_ID `
  --member="serviceAccount:$DEPLOYER_SA" --role="roles/run.admin"
# Required so the deploy can set the service to run as the runtime SA.
gcloud iam service-accounts add-iam-policy-binding $RUNTIME_SA `
  --member="serviceAccount:$DEPLOYER_SA" --role="roles/iam.serviceAccountUser"
```

## 5. Workload Identity Federation (keyless GitHub → GCP)

```powershell
# Pool
gcloud iam workload-identity-pools create github `
  --location=global --display-name="GitHub Actions"

# OIDC provider, restricted to THIS repo
gcloud iam workload-identity-pools providers create-oidc github-provider `
  --location=global --workload-identity-pool=github `
  --display-name="GitHub provider" `
  --issuer-uri="https://token.actions.githubusercontent.com" `
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" `
  --attribute-condition="assertion.repository=='$($GH_REPO)'"

# Let the deployer SA be impersonated from this repo's workflows
gcloud iam service-accounts add-iam-policy-binding $DEPLOYER_SA `
  --role="roles/iam.workloadIdentityUser" `
  --member="principalSet://iam.googleapis.com/projects/$($PROJECT_NUMBER)/locations/global/workloadIdentityPools/github/attribute.repository/$($GH_REPO)"

# The value the workflow needs as GCP_WIF_PROVIDER:
Write-Output "projects/$($PROJECT_NUMBER)/locations/global/workloadIdentityPools/github/providers/github-provider"
```

## 6. Secret Manager secrets

Create the three runtime secrets and grant the runtime SA read access. (Use a `-` value for
any AI key you are not using; an engine with no key just reports "not configured".) The temp
file is written with **no trailing newline** so the secret value is exact.

```powershell
foreach ($s in "OPENAI_API_KEY","GEMINI_API_KEY","GOOGLE_BOOKS_API_KEY") {
  $tmp = New-TemporaryFile
  [IO.File]::WriteAllText($tmp, "REPLACE_WITH_REAL_VALUE_OR_DASH")
  gcloud secrets create $s --replication-policy=automatic --data-file="$tmp"
  Remove-Item $tmp
  gcloud secrets add-iam-policy-binding $s `
    --member="serviceAccount:$RUNTIME_SA" --role="roles/secretmanager.secretAccessor"
}
```

To rotate a key later (the workflow always binds `:latest`):

```powershell
$tmp = New-TemporaryFile
[IO.File]::WriteAllText($tmp, "NEW_VALUE")
gcloud secrets versions add OPENAI_API_KEY --data-file="$tmp"
Remove-Item $tmp
```

## 7. GitHub Actions variables

Set these as **repository variables** (Settings → Secrets and variables → Actions →
_Variables_). None are secret.

```powershell
gh variable set GCP_PROJECT_ID    --body "$PROJECT_ID"
gh variable set GCP_REGION        --body "$REGION"
gh variable set GAR_REPOSITORY    --body "$REPO"
gh variable set CLOUD_RUN_SERVICE --body "$SERVICE"
gh variable set GCP_DEPLOYER_SA   --body "$DEPLOYER_SA"
gh variable set GCP_RUNTIME_SA    --body "$RUNTIME_SA"
gh variable set GCP_WIF_PROVIDER  --body "projects/$($PROJECT_NUMBER)/locations/global/workloadIdentityPools/github/providers/github-provider"

# Public Firebase web config (from the Firebase console → Project settings → Your apps)
gh variable set NEXT_PUBLIC_FIREBASE_API_KEY             --body "AIzaSyDT4RvbcC43_AD3yOQC2kICrcw0Q1Iw9CQ"
gh variable set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN         --body "$($PROJECT_ID).firebaseapp.com"
gh variable set NEXT_PUBLIC_FIREBASE_PROJECT_ID          --body "$PROJECT_ID"
gh variable set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET      --body "$($PROJECT_ID).firebasestorage.app"
gh variable set NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --body "633756061013"
gh variable set NEXT_PUBLIC_FIREBASE_APP_ID              --body "1:633756061013:web:dad9cba93983caa71d33dc"
```

## 8. First deploy & verify

Push to `main` (or re-run the workflow). After it goes green:

```powershell
$URL = gcloud run services describe $SERVICE --region $REGION --format="value(status.url)"
Invoke-RestMethod "$($URL)/api/health"   # → @{ status = ok }
Start-Process $URL                       # the app loads in the browser
```

Acceptance (issue #3): a push to `main` auto-deploys and the public URL serves the app;
`GET /api/health` returns `200`.

## 9. Seed the allowed readers (access allowlist)

Access is an **allowlist by email**: login (verified email magic-link) only succeeds if a
`readers` document with that email already exists — an unknown email gets `403 "not a
member"`. A fresh prod database has none, so seed the household readers once. Edit the
`READERS` list in `scripts/seed-readers.ts` if the emails differ.

```powershell
# One-time: give your local machine Application Default Credentials for the project.
gcloud auth application-default login
gcloud auth application-default set-quota-project $PROJECT_ID

# Seed PROD (SEED_TARGET=prod skips the emulator and targets the real Firestore).
$env:SEED_TARGET = "prod"
$env:GOOGLE_CLOUD_PROJECT = $PROJECT_ID
npx tsx scripts/seed-readers.ts
Remove-Item Env:\SEED_TARGET, Env:\GOOGLE_CLOUD_PROJECT
```

Verify (after seeding, `/api/readers` lists them):

```powershell
Invoke-RestMethod "$($URL)/api/readers"
```

## Notes & troubleshooting

- **`--startup-probe` rejected by an older gcloud**: drop that line from the deploy step —
  Cloud Run falls back to a TCP probe on the container port, which is also Firestore-
  independent. (Keep `gcloud` reasonably current to use the HTTP probe.)
- **512Mi OOM** (Next 15 + React 19 SSR): bump `--memory 1Gi` in the deploy step.
- **Cold starts**: `--min-instances 0` scales to zero (free-tier friendly); set `1` for an
  always-warm instance at a small cost.
- **Image size** (~1.5 GB): full prod `node_modules`. Slimming via Next `output: 'standalone'`
  is a tracked follow-up, not required for M0.
- Firebase Admin needs **no** credentials here — it uses the runtime SA's ADC.
- **`gcloud`/`gh` not found in PowerShell**: open a new session after installing, or ensure
  their install dirs are on `$env:Path`.
