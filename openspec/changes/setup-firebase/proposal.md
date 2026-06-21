## Why

The app skeleton (#1) has no datastore yet. Every domain milestone (catalog, auth, reading log, dashboard) needs Firestore, Auth and Storage wired in. This change delivers issue **#2**: the foundational Firebase integration and the local development story, following ADR-0002 (Firestore), ADR-0001 (Cloud Run / ADC) and ADR-0009 (data access pattern).

## What Changes

- Add **Firebase Admin SDK** initialization on the Express server (lazy singleton), using **Application Default Credentials** — no service-account key files (ADR-0001).
- Add **Firebase Client SDK** initialization for the Next app (lazy singleton), configured from public `NEXT_PUBLIC_FIREBASE_*` env vars.
- Make both SDKs **emulator-aware**: in development they connect to the **Firebase Emulator Suite** (Firestore, Auth, Storage) with no cloud credentials.
- Add **base security rules** for Firestore and Storage following **deny-by-default** (ADR-0009), with the minimal openings for the two direct-client cases (photo upload to Storage; read-only dashboard listeners) stubbed but closed until their features land.
- Add a **readiness check** (`GET /api/health/ready`) that verifies Firestore connectivity, separate from the existing liveness `GET /api/health`.
- Document configuration: update `.env.example`, add an `emulators` npm script and a short setup guide (project provisioning steps the owner runs once).

Out of scope (other issues): auth/session flows (#7), reader profiles (#8), domain collections & repositories (#12), real photo upload (#3/#13), AI keys / Secret Manager (#19).

## Capabilities

### New Capabilities
- `firebase-integration`: Initialized, environment-aware access to Firestore, Auth and Storage from both the Express server (Admin SDK) and the Next client (Client SDK), including emulator wiring for development, base deny-by-default security rules, and a Firestore readiness endpoint. (The readiness endpoint lives here, not in `app-platform`, because it verifies Firestore connectivity.)

### Modified Capabilities
<!-- None. The existing app-platform liveness endpoint (/api/health) is unchanged;
     readiness is a new endpoint owned by firebase-integration. -->`app-platform` is left untouched.

## Impact

- **New code:** `lib/firebase/admin.ts`, `lib/firebase/client.ts`, `lib/firebase/config.ts`, `server/routes/health.ts` (add readiness), `firestore.rules`, `storage.rules`, `firebase.json` (emulator config), `.firebaserc` (project alias).
- **Dependencies added:** `firebase-admin` (server), `firebase` (client). Dev: Firebase CLI / emulators (via `npx firebase-tools` or devDependency).
- **Config / ops:** new env vars (`GOOGLE_CLOUD_PROJECT`/`projectId`, `NEXT_PUBLIC_FIREBASE_*`, `*_EMULATOR_HOST`); one-time Firebase project provisioning done by the owner; `projectId` supplied via env.
- **Downstream:** unblocks #7 (auth), #8 (readers), #12 (collections/repos) and the dashboard/AI flows that read or store data.
