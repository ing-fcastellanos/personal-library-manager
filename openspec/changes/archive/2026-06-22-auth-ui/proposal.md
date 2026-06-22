## Why

#7 built the auth/session backend (magic-link exchange, session cookie, PIN, `getCurrentReader`) but there is no UI: the header avatar is a static "LM", nothing lets a reader sign in, and write actions just fail with `401`. This change delivers issue **#9**: the login experience — magic-link UI, the sign-in callback, contextual write gating, the header auth control, and the PIN-pad — built on the design system (#6) via the Claude Design handoff (ADR-0010).

## What Changes

- **Auth state provider** (`AuthProvider` + `useAuth`): reads `/api/auth/me` (server is the source of truth, ADR-0011), exposes `{ reader, loading, refresh }`, and performs a **silent re-mint** on load when the Client SDK has a persisted login but the server session expired ("remembered device", ADR-0012).
- **Magic-link login** (`/login`): enter email → `sendSignInLink` → "check your email" confirmation. Supports a `?next=` redirect target.
- **Sign-in callback** (`/auth/callback`): completes the link (`completeSignInFromLink` → `exchangeForSession`) and redirects to `?next` (or `/`), with loading/error states.
- **Contextual write gating** (ADR-0006): reads stay public; an unauthenticated **write** action sends the user to `/login?next=…`. Provided as a small client guard the write screens (#14/#24) reuse.
- **Header auth control**: replace the static avatar with the real reader (avatar + menu → sign out) when authenticated, or a "Iniciar sesión" action when not.
- **Set-PIN screen + PIN-pad component**: a mobile numeric **PIN-pad** and a "set your PIN" flow (calls `POST /api/auth/pin`). The PIN-pad is the reusable component the reader-switch flow (#11) consumes.
- **Claude Design handoff** (ADR-0010): author the prompt for the auth screens; integrate the generated React/Tailwind onto the primitives + tokens.

Out of scope: reader-switch **orchestration** (#11 — it consumes the PIN-pad), the QR deep-link flow (#10), any non-auth screen.

## Capabilities

### New Capabilities
- `auth-ui`: The reader-facing authentication experience — client auth state with silent re-mint, the magic-link login + callback, contextual write gating, the header auth control, and the set-PIN flow with a reusable PIN-pad.

### Modified Capabilities
<!-- None. Consumes auth-session (#7), readers (#8) and design-system (#6); their requirements don't change. -->

## Impact

- **New code:** `components/auth/auth-provider.tsx` (+ `useAuth`), `app/login/page.tsx`, `app/auth/callback/page.tsx`, `components/auth/require-auth-to-write.tsx` (client guard), `components/auth/pin-pad.tsx`, `components/auth/set-pin.tsx`; header wired to `useAuth`; `AuthProvider` mounted in the root layout.
- **Consumes:** the `lib/auth/client.ts` helpers and `/api/auth/*` from #7; design-system primitives from #6.
- **Dev:** magic-link in development surfaces in the Auth emulator UI/logs (no real email); production needs Email-link sign-in enabled + authorized domains in the Firebase console.
- **Downstream:** unblocks #11 (reader switch reuses the PIN-pad) and gives every write feature (#14 add, #24 mark-read, …) a real "sign in to continue" path.
