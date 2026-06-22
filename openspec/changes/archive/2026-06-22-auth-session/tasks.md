## 1. Reader email

- [x] 1.1 Add `email` (unique, validated) to the reader zod schema and `readerUpdateSchema` in `lib/types/reader.ts`
- [x] 1.2 Add `findReaderByEmail` and email-uniqueness enforcement (query-before-write, like `uid`) to the readers repository
- [x] 1.3 Add an email field to the `/ajustes` reader editor

## 2. Session backend

- [x] 2.1 `lib/auth/session.ts`: create (`createSessionCookie`), verify (`verifySessionCookie` with revocation check), and clear/revoke helpers; cookie attributes (httpOnly, secure, sameSite=lax, ≤14d)
- [x] 2.2 CSRF helper (double-submit token: issue + validate)
- [x] 2.3 Add `cookie-parser` and mount it on `/api`

## 3. Auth routes

- [x] 3.1 `server/routes/auth.ts`: `POST /api/auth/session` (verify ID token + CSRF → link reader (closed membership) → set cookie; optional `readerId` claim)
- [x] 3.2 `DELETE /api/auth/session` (clear cookie + revoke)
- [x] 3.3 `GET /api/auth/me` (current reader or unauthenticated)
- [x] 3.4 Mount the auth router under `/api`

## 4. Authorization helpers & hardening

- [x] 4.1 `server/middleware/require-auth.ts`: `requireAuth` Express middleware (401 without a valid session; attaches the reader)
- [x] 4.2 `lib/auth/current-reader.ts`: `getCurrentReader()` server helper for RSC/API
- [x] 4.3 Apply `requireAuth` to the `/api/readers` write route(s); keep GET public (resolves the `TODO(#7)`)

## 5. PIN backend

- [x] 5.1 `lib/auth/pin.ts`: scrypt hash + constant-time verify; in-memory rate-limit with lockout
- [x] 5.2 `POST /api/auth/pin` (authenticated: set/change own PIN → `reader.pinHash`)
- [x] 5.3 `POST /api/auth/pin/verify` (rate-limited verification for reader switching)

## 6. Client helper (no UI)

- [x] 6.1 `lib/auth/client.ts`: `sendSignInLink`, `completeSignInFromLink`, `exchangeForSession`, `signOut` wrapping the Client SDK (for #9 to build UI on)

## 7. Verification

- [x] 7.1 `npm run typecheck` passes
- [x] 7.2 With the Auth emulator: mint a user + ID token via REST, then `POST /api/auth/session` links the matching reader and sets a cookie; a protected `PATCH /api/readers/:id` succeeds with the cookie and returns `401` without it
- [x] 7.3 Closed membership: a token whose email matches no reader is rejected (no session)
- [x] 7.4 PIN: set then verify succeeds; repeated wrong PINs lock out; `DELETE /api/auth/session` logs out
- [x] 7.5 `npm run build` succeeds
