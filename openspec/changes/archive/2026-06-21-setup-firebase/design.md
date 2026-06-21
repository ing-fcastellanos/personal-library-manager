## Context

Issue #2 wires Firebase into the #1 skeleton (Next 15 + custom Express, TypeScript). Decisions are already fixed by ADRs: Firestore (0002), Cloud Run + ADC (0001), and the data-access pattern (0009: server-mediated default, direct-client for Storage uploads and dashboard real-time). The owner provisions one Firebase project and supplies its `projectId` via env. Local development uses the Firebase Emulator Suite.

## Goals / Non-Goals

**Goals:**
- One lazy Admin SDK singleton (server) and one lazy Client SDK singleton (browser).
- Zero key files: ADC in prod, emulators in dev.
- Deny-by-default Firestore + Storage rules.
- `GET /api/health/ready` readiness check for Firestore.
- A frictionless `npm run emulators` dev loop and clear `.env.example`.

**Non-Goals:**
- Auth/session logic (#7), reader model (#8), domain collections/repos (#12).
- Real photo upload pipeline (#3/#13) — only the closed Storage-rule stub.
- Secret Manager / AI keys (#19).

## Decisions

- **Credentials.** Prod: `initializeApp()` with ADC (Cloud Run service account). Dev: no credentials — emulators. We never read a service-account JSON. Rationale: aligns with ADR-0001 (WIF, no keys). Alternative (key file via `GOOGLE_APPLICATION_CREDENTIALS`) rejected: secret sprawl.
- **Emulator detection.** Use the official env vars (`FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`, `FIREBASE_STORAGE_EMULATOR_HOST`). The Admin SDK auto-honors `FIRESTORE_EMULATOR_HOST`; the Client SDK is wired explicitly via `connectFirestoreEmulator`/`connectAuthEmulator`/`connectStorageEmulator`. `firebase.json` defines emulator ports.
- **Client config is public.** `NEXT_PUBLIC_FIREBASE_*` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId). These are identifiers, not secrets, and are safe in the client bundle.
- **Singletons.** Guard against re-init: Admin via `getApps().length ? getApp() : initializeApp()`; Client likewise. Avoids "app already exists" during Next HMR and across server modules.
- **Readiness vs liveness.** `/api/health` stays a pure liveness probe (no external deps). `/api/health/ready` does a cheap Firestore round-trip (e.g. a `limit(1)` read on a reserved/health doc) with a short timeout; returns `503` on failure. Cloud Run uses liveness for traffic; readiness is for diagnostics/CI.
- **Rules deny-by-default.** `firestore.rules` and `storage.rules` start with `allow read, write: if false;`. Stubs (commented or guarded) mark where #3 (Storage upload path scoped to the authenticated reader) and #27 (read-only dashboard listeners) will open access — kept closed now.
- **File layout.** `lib/firebase/config.ts` (env parsing/validation), `lib/firebase/admin.ts` (server singleton + Firestore/Storage handles), `lib/firebase/client.ts` (browser singleton + emulator wiring). `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules` at repo root.

## Risks / Trade-offs

- **Readiness check could be abused or slow** → short timeout + cheap read; not wired into Cloud Run liveness so a Firestore blip won't kill the instance.
- **Two access models coexist (A + B)** → enforced by convention + rules; documented in ADR-0009; reviewed when #3/#27 land.
- **Env var drift between dev/prod** → `lib/firebase/config.ts` validates required vars at startup and fails fast with a clear message.
- **Emulator/prod parity** → keep wiring identical except the connect-emulator calls; smoke test both paths.

## Migration Plan

Additive change on `claude/hola-oejkn3`. One-time manual step by the owner: create the Firebase project, enable Firestore/Auth/Storage, and provide `projectId` + web config via env. Rollback = revert the commit; no data migration (no collections yet).

## Open Questions

- Firestore location/region (set at project creation by the owner; influences latency vs Cloud Run region from ADR-0001).
- Whether to pin Firebase CLI as a devDependency or rely on `npx firebase-tools` (leaning devDependency for reproducible `npm run emulators`).
