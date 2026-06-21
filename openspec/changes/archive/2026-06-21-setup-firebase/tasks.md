## 1. Dependencies & project config

- [x] 1.1 Add deps: `firebase-admin` (server), `firebase` (client); add Firebase CLI as a devDependency
- [x] 1.2 Add `firebase.json` with emulator config (firestore, auth, storage ports) and rules file references
- [x] 1.3 Add `.firebaserc` with the project alias (projectId via env / placeholder) and add an `emulators` npm script
- [x] 1.4 Update `.env.example` with `GOOGLE_CLOUD_PROJECT`, `NEXT_PUBLIC_FIREBASE_*`, and `*_EMULATOR_HOST` vars

## 2. Config & SDK initialization

- [x] 2.1 `lib/firebase/config.ts`: parse + validate required env vars (fail fast with clear message)
- [x] 2.2 `lib/firebase/admin.ts`: lazy Admin singleton (ADC in prod), expose Firestore + Storage handles, honor `FIRESTORE_EMULATOR_HOST`
- [x] 2.3 `lib/firebase/client.ts`: lazy Client singleton from `NEXT_PUBLIC_FIREBASE_*`, wire emulators in dev via connect* calls

## 3. Security rules (deny-by-default)

- [x] 3.1 `firestore.rules`: `allow read, write: if false;` with commented stub for read-only dashboard access (#27)
- [x] 3.2 `storage.rules`: deny-by-default with commented stub for reader-scoped photo upload path (#3)

## 4. Readiness endpoint

- [x] 4.1 Add `GET /api/health/ready` to `server/routes/health.ts`: cheap Firestore read with short timeout → `200` ok / `503` on failure (liveness `/api/health` unchanged)

## 5. Verification & docs

- [x] 5.1 `npm run typecheck` passes
- [x] 5.2 With emulators running: `/api/health/ready` returns `200`; with emulators stopped it returns `503` while `/api/health` stays `200`
- [x] 5.3 Confirm deny-by-default: a direct client read/write is rejected by rules in the emulator
- [x] 5.4 Document the one-time project provisioning steps and the `npm run emulators` dev loop in the README
