## Why

Reader profiles exist (#8) but nothing authenticates a reader or protects write actions yet — `/api/readers` writes are open (a `TODO(#7)`). This change delivers issue **#7**: the backend auth/session plumbing per ADR-0011/ADR-0012 — establish a server-authoritative session for a Firebase-authenticated reader, link the reader at first login, protect writes, and provide the PIN backend the reader-switch flow (#11) will consume. **No login UI** here (that's #9).

## What Changes

- **Add `email` (unique) to the `Reader`** so magic-link logins map to a reader; surface it in the existing profile editor.
- **Session endpoints** (Express): `POST /api/auth/session` (exchange a Firebase ID token for an httpOnly **session cookie**, with CSRF protection) and `DELETE /api/auth/session` (logout + revoke).
- **First-login linking with closed membership:** on session create, match the token's verified email to a reader → `assignUid()`; reject (no session) if the email matches no reader, or if the reader is already linked to a different uid. Optionally set a `readerId` custom claim.
- **Server-authoritative authorization:** a `requireAuth` Express middleware and a `getCurrentReader()` server helper (for RSC and API) that verify the session cookie; plus `GET /api/auth/me` so the client can read auth state from the server.
- **Harden existing writes:** protect `/api/readers` write routes with `requireAuth` (resolves the `TODO(#7)`).
- **PIN backend:** `POST /api/auth/pin` (set/change the current reader's PIN, hashed with scrypt) and `POST /api/auth/pin/verify` (rate-limited verification) — consumed by the reader-switch flow (#11). PIN never mints identity.
- **A thin client auth helper** (`lib/auth/client.ts`) with sign-in/sign-out/exchange functions for #9 to build UI on — no UI in this change.

Out of scope: login/PIN **UI** (#9), QR deep-link flow (#10), reader-selector UI (#11), opening the direct-client security rules (#3/#27).

## Capabilities

### New Capabilities
- `auth-session`: Server-authoritative authentication and session for the household readers — session cookie lifecycle, first-login reader linking with closed membership, `requireAuth`/`getCurrentReader`, protected writes, and the PIN set/verify backend.

### Modified Capabilities
- `readers`: add a unique `email` to the reader (used to map a magic-link login to a reader). This is an additive requirement; existing reader behavior is unchanged.

## Impact

- **New code:** `lib/auth/session.ts` (cookie create/verify/revoke), `lib/auth/pin.ts` (scrypt hash/verify + rate-limit), `lib/auth/current-reader.ts` (server helper), `server/middleware/require-auth.ts`, `server/routes/auth.ts`, `lib/auth/client.ts` (client helper). Repository gains `findReaderByEmail` and `email` handling.
- **Deps:** `cookie-parser` (read the session cookie in Express); PIN hashing uses Node `crypto` (no dep).
- **Data:** `readers` documents gain `email`; `pinHash` (already reserved) is now written by the PIN endpoints.
- **Security:** writes now require a valid session; closed membership; CSRF on the token exchange. Direct-client Firestore/Storage rules stay deny-by-default (unchanged).
- **Downstream:** unblocks #9 (login/PIN UI), #10 (QR auth), #11 (reader switch), and every write feature (reading events, AI ingestion) that needs an authenticated reader.
