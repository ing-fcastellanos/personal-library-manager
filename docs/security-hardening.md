# Security hardening — API key restriction, Auth abuse protection, App Check

Companion to [`deploy.md`](./deploy.md). Issue #42. The steps below are **manual
actions in GCP Console / Firebase Console** — nothing here is automated by the app
or by CI, and nothing in this repo can perform them on your behalf.

## Context

The Firebase web config (`apiKey`, `authDomain`, `projectId`, etc.) is a **public
identifier**, not a secret — it's inlined into every page load, same as it is for
every Firebase web app. Restricting it isn't about hiding it (it can't be hidden);
it's about limiting **where it can be used from**, so it can't be lifted out of this
app's bundle and replayed against Google's APIs from somewhere else.

The app's only live client-direct Firebase surface is **Identity Toolkit** (the
magic-link sign-in, `lib/auth/client.ts`). Firestore and Storage are both
deny-by-default (`firebase/firestore.rules`, `firebase/storage.rules`) — nothing to
restrict there today (see "Deferred: full App Check" below).

## 1. Restrict the web API key (GCP Console)

Using the same `$PROJECT_ID` as `deploy.md`:

1. Go to **APIs & Services → Credentials** in the GCP project.
2. Open the browser key (Firebase auto-creates one, usually named "Browser key
   (auto created by Firebase)").
3. **Application restrictions → HTTP referrers**: add the production origin(s) —
   the Cloud Run URL and any custom domain in front of it. Local dev doesn't need
   an entry here: `npm run dev` with `NEXT_PUBLIC_FIREBASE_USE_EMULATOR=true`
   never calls real Google endpoints with this key at all (the Client SDK is
   rerouted to `127.0.0.1` by `connectAuthEmulator`/`connectFirestoreEmulator`/
   `connectStorageEmulator` in `lib/firebase/client.ts`).
4. **API restrictions**: limit to the APIs the client actually calls — at minimum
   **Identity Toolkit API** and **Token Service API** (needed for session refresh).
   If login breaks after this, that's the first place to check — add back the
   specific API it needs, or temporarily remove the restriction to isolate it.
5. Save, then do a real sign-in against production to confirm the login flow still
   works before considering this done.

Rollback: the restriction can be relaxed (or removed) instantly from the same
console page if something breaks — there's no deploy involved.

## 2. Firebase Authentication abuse protection

In **Firebase Console → Authentication → Settings**, enable the built-in
protections against scripted abuse of the sign-in endpoints (email enumeration
protection, bot/abuse detection for `sendOobCode`). This is a console toggle —
no SDK integration, no reCAPTCHA site keys, no debug tokens to manage in the
`npm run emulators` loop. Exact menu labels vary by console version; look under
Authentication's settings for anything referencing abuse protection or email
enumeration.

This directly narrows the concrete risk on this app: someone calling
`accounts:sendOobCode` directly against Identity Toolkit with the public
`apiKey` (bypassing the app's own UI) to spam sign-in emails at arbitrary
addresses. It cannot lead to session takeover on its own — session exchange
(`POST /api/auth/session`) already rejects any email that doesn't match an
existing reader (closed membership, ADR-0012) — but it's still worth closing
at the source.

## 3. Deferred: full App Check + reCAPTCHA Enterprise

Issue #42 originally asked for Firebase App Check (reCAPTCHA Enterprise
attestation) enforced on Firestore and Storage. **Not built in this change** —
both are already `allow read, write: if false` (deny-by-default), with the only
planned direct-client cases (ADR-0009: Storage photo upload, dashboard
listeners) left as commented-out stubs that were never enabled. App Check would
protect a door that's already fully closed; building the reCAPTCHA Enterprise +
App Check SDK + debug-token setup now would be real effort for zero change in
the actual security posture.

**Revisit this** the moment either of those stubs gets enabled — i.e. the day a
feature actually does direct-client `uploadBytes` to Storage or an `onSnapshot`
listener against Firestore. App Check should be wired up **before** opening the
corresponding rule, not after.

## 4. Express write rate-limiting

Separate from all of the above (this one ships in code, not a manual step): every
non-`GET` request under `/api/*` is rate-limited (`server/middleware/rate-limit.ts`,
600 requests/minute per IP). It protects the actual data API (server-mediated,
ADR-0009) against a runaway or malicious write loop — an axis Identity Toolkit
protections and API key restriction don't touch, since Google doesn't expose that
traffic to this app's own rate-limiting.
