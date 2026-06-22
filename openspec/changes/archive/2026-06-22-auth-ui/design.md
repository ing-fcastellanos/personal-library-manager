## Context

#9 is the UI layer over #7's auth backend, on the #6 design system, and is a `claude-design` issue (ADR-0010 handoff). Decisions from exploration: contextual login (no global gate), a client `AuthProvider` with silent re-mint, PIN-pad owned by #9 and orchestration in #11, and the same mobile handoff loop used for #6 (scaffold + prompt now, integrate the user's Claude Design output later).

## Goals / Non-Goals

**Goals:**
- `AuthProvider`/`useAuth` reading `/api/auth/me` with silent re-mint.
- `/login` (magic-link) + `/auth/callback` with `?next=`.
- Contextual write guard reusable by write screens.
- Header wired to real auth state (avatar/menu/sign-out vs sign-in).
- Set-PIN flow + a reusable PIN-pad component.
- Author the Claude Design prompt; integrate the handoff.

**Non-Goals:**
- Reader-switch orchestration (#11), QR flow (#10), any non-auth screen.

## Decisions

- **Server is the source of truth.** `useAuth` calls `GET /api/auth/me`; it never trusts the Client SDK for authorization. The Client SDK is only used to (a) send/complete the magic link and (b) provide a fresh ID token for the silent re-mint.
- **Silent re-mint.** On mount, if `/api/auth/me` is null, check `onAuthStateChanged`; if a persisted user exists, `getIdToken()` → `exchangeForSession()` → refetch `me`. Avoids forcing magic-link after the 14-day cookie lapses (ADR-0012).
- **Contextual gating as a client guard.** A small `requireAuthToWrite()` helper / hook: if `useAuth` has no reader, `router.push('/login?next=' + currentPath)`. Write screens (#14/#24) call it on their write entry points. No global middleware gate (reads stay public).
- **Login presentation.** `/login` is a focused view (renders within the shell is fine; the Claude Design handoff sets the exact look). `/auth/callback` is a minimal status view (loading/success/error) that runs the completion effect.
- **PIN-pad.** A controlled numeric keypad component (`value`, `onChange`, `length`, masking) with large touch targets and a11y; no business logic inside. `set-pin` composes two PIN-pads (enter + confirm) and calls `POST /api/auth/pin`. #11 mounts the same PIN-pad for verification.
- **Mounting.** `AuthProvider` wraps the app in the root layout (inside `ThemeProvider`), so the header and any screen can `useAuth`.
- **Claude Design handoff (ADR-0010).** Scaffold the screens functionally with primitives, author `claude-design-prompt.md` (login, check-email, callback states, set-PIN, PIN-pad, header states; mobile-first, a11y, tokens). The owner runs Claude Design and returns the bundle; integration maps it onto the scaffold (as done for #6).

## Risks / Trade-offs

- **Silent re-mint vs flicker** → show a brief loading state in `AuthProvider` until the first `me` (and any re-mint) settles, so the header doesn't flip from signed-out to signed-in.
- **Magic-link testing in dev** → the Auth emulator surfaces the link in its UI/logs; document the click-through. Headless verification can drive the underlying `/api/auth/*` (as in #7) rather than the email click.
- **Scaffold vs final design** → the scaffold is functional but plain; the Claude Design handoff replaces the presentation. Logic stays put; only markup/styles change (the #6 pattern).

## Migration Plan

Additive on `claude/hola-oejkn3`. Wires the existing static header to real state; adds routes/components. Rollback = revert. Tasks 7.2/7.3 (integrate the Claude Design output) remain open until the owner provides the handoff, exactly like #6.

## Open Questions

- Exact look of the login / PIN screens — finalized by the Claude Design handoff.
- Whether "set PIN" is prompted right after first login or only offered in Settings (leaning: offered in Settings + a gentle prompt; the handoff can refine).
