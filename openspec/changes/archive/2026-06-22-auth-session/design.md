## Context

#7 adds backend auth/session on top of #2 (Admin SDK + Auth emulator) and #8 (readers), per ADR-0011 and ADR-0012. No login UI (that is #9). The Auth emulator lets us test the full flow headlessly by minting users and ID tokens over REST.

## Goals / Non-Goals

**Goals:**
- `email` (unique) on the reader + `findReaderByEmail`.
- Session cookie lifecycle (create with CSRF / verify / revoke) via the Admin SDK.
- First-login linking with closed membership; optional `readerId` custom claim.
- `requireAuth` middleware + `getCurrentReader()` server helper + `GET /api/auth/me`.
- Harden existing writes (`/api/readers`).
- PIN set/verify backend (scrypt hash + rate-limit) for reader switching (#11).
- A thin client auth helper for #9 to build on.

**Non-Goals:**
- Any UI (login form, PIN pad, reader selector) — #9/#11.
- QR deep-link flow — #10.
- Opening direct-client Firestore/Storage rules — #3/#27.

## Decisions

- **Session cookies (Admin SDK).** `createSessionCookie(idToken, { expiresIn })` with `expiresIn ≤ 14d`; verify with `verifySessionCookie(cookie, true)` (checks revocation). httpOnly + secure + sameSite=lax. Rationale: server-authoritative (ADR-0011), works for both Express APIs and Next RSC.
- **CSRF (double-submit).** The client sends a CSRF token both as a cookie and in the request body/header; the server requires they match on `POST /api/auth/session`. Standard Firebase guidance; no extra dep.
- **Closed membership at link time.** Verify the ID token, read `email`+`email_verified`; `findReaderByEmail`. No match or uid conflict → `403`, no cookie. First match → `assignUid` (the transaction from #8 enforces uid uniqueness). Optionally `setCustomUserClaims(uid, { readerId })`.
- **Reading the cookie.** Add `cookie-parser` to Express; in Next RSC read it via `cookies()` and verify with the same helper. One `verifySessionCookie` path shared by `requireAuth` (Express) and `getCurrentReader()` (server util).
- **PIN.** Hash with Node `crypto.scrypt` + per-PIN random salt (`scrypt$N$salt$hash`); constant-time compare. Rate-limit verify with a small attempts store — start **in-memory per instance** (simple; resets on cold start), with a note to move to Firestore if needed. PIN endpoints require an authenticated session (you set your own PIN).
- **Writes hardening.** Replace the `TODO(#7)` by applying `requireAuth` to the reader write router; keep `GET` public (reads are allowed; ADR-0006). Future write features mount under the same guard.
- **Email on reader.** Extend the zod schema + `readerUpdateSchema` with `email` (validated, unique via a query-before-write check, mirroring `uid` uniqueness). Surface an email field in the existing `/ajustes` editor.
- **Client helper (no UI).** `lib/auth/client.ts` wraps the Client SDK: `sendSignInLink(email)`, `completeSignInFromLink()`, `exchangeForSession()` (POST the ID token), `signOut()`. #9 builds the UI calling these.

## Risks / Trade-offs

- **In-memory rate-limit resets on cold start (Cloud Run)** → acceptable for a 2-person home; documented; move to Firestore counters if abused.
- **Cookie ≤14d vs "remembered"** → durable enrollment is the Client SDK refresh token (ADR-0012); the cookie is silently re-minted. #7 provides the exchange; the silent-refresh trigger is wired in the client helper / #9.
- **Email/uid uniqueness without native constraints** → enforced via transactional query-before-write; fine at 2 readers.
- **Testing without UI** → use the Auth emulator REST API to create a user and fetch an ID token, then exercise the endpoints.

## Migration Plan

Additive on `claude/hola-oejkn3`. `readers` gains `email` (nullable until set); no data migration. Rollback = revert; sessions are stateless cookies (revoke on rollback if needed).

## Open Questions

- The two readers' emails — provided by the owner (set in `/ajustes`); needed to actually log in.
- Whether to persist the PIN rate-limit in Firestore now or defer (leaning defer).
