## 1. Client auth state

- [x] 1.1 `components/auth/auth-provider.tsx`: `AuthProvider` + `useAuth` reading `GET /api/auth/me`, exposing `{ reader, loading, refresh }`
- [x] 1.2 Silent re-mint: on load, if `me` is null but the Client SDK has a persisted user, exchange a fresh ID token and refetch
- [x] 1.3 Mount `AuthProvider` in the root layout (inside `ThemeProvider`)

## 2. Magic-link login + callback

- [x] 2.1 `app/login/page.tsx`: email form → `sendSignInLink` → "check your email" state; reads `?next=`
- [x] 2.2 `app/auth/callback/page.tsx`: run `completeSignInFromLink` → `exchangeForSession` → redirect to `next` (loading/error states)

## 3. Contextual write gating

- [x] 3.1 `components/auth/require-auth-to-write.tsx`: a client guard/hook that redirects to `/login?next=<path>` when there is no reader
- [x] 3.2 Apply the guard at the write entry points of the existing `/agregar` and `/leido` placeholders (reads stay public)

## 4. Header auth control

- [x] 4.1 Wire the header to `useAuth`: show the real reader avatar + a menu (sign out) when authenticated
- [x] 4.2 Show a "Iniciar sesión" action when unauthenticated

## 5. Set-PIN + PIN-pad

- [x] 5.1 `components/auth/pin-pad.tsx`: reusable controlled numeric keypad (value/onChange/length/masking, large touch targets, a11y)
- [x] 5.2 `components/auth/set-pin.tsx`: enter + confirm flow calling `POST /api/auth/pin`; surface in Settings

## 6. Claude Design handoff

- [x] 6.1 Author `claude-design-prompt.md` for the auth screens (login, check-email, callback states, set-PIN, PIN-pad, header states; mobile-first, a11y, project tokens)
- [x] 6.2 Integrate the Claude Design output: map to primitives + tokens, reconcile with the scaffold, replace placeholders
- [x] 6.3 QA visual responsive (mobile/desktop) and accessibility on the integrated result

## 7. Verification

- [x] 7.1 `npm run typecheck` passes
- [x] 7.2 With the Auth emulator: the login → callback flow establishes a session and the header reflects the reader; sign out clears it
- [x] 7.3 An unauthenticated write entry point redirects to `/login?next=…`; reads remain public
- [x] 7.4 `npm run build` succeeds
