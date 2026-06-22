## Why

The bookshelf QR codes need somewhere to land. After #9, the app already has deep-linkable routes (`/`, `/agregar`, `/leido`), contextual write gating, and "remembered device" sessions — so the QR experience is mostly a thin, stable entry point plus carrying the **shelf** context. This change delivers issue **#10**: a canonical `/scan` resolver and the auth/landing behavior for QR deep-links, per ADR-0006 (QR is a link, not a credential) and ADR-0012 (remembered device).

## What Changes

- Add a **`/scan` resolver**: `GET /scan?action=dashboard|add|finish&shelf=<id>` maps the action to its route (`/`, `/agregar`, `/leido`), preserves `shelf`, and redirects. This is the stable URL the printed QR encodes — internal routes can change without reprinting.
- **Propagate the shelf context**: capture `?shelf=<id>` into a small client context that survives navigation and the login round-trip, so later flows (#18/#33) can default to that shelf. (No real shelf preselection here — that needs #18.)
- **Preserve the query string in the login redirect**: the write gating currently redirects with `next=<pathname>` (dropping `?shelf=`); fix it so `next` carries the full path+query, so a scanned write action returns to the same action **with** its shelf after sign-in.
- **Auth/landing behavior** (reaffirming the decisions): `dashboard` is public; `add`/`finish` require a session — reusing #9's contextual gating. On an enrolled device this feels like auto-login (ADR-0012); a new device signs in once and returns to the action. **No credential/token is ever embedded in the QR** (ADR-0006).

Out of scope: generating/printing the QR sheets (#31), wiring the landing to the real add/finish actions (#32 — needs #14/#24), shelf model + actual preselection (#18/#33).

## Capabilities

### New Capabilities
- `qr-auth`: The QR deep-link entry — a `/scan` action resolver, shelf-context propagation that survives the login round-trip, and the public-read / auth-required-write landing behavior, with no credential carried in the QR.

### Modified Capabilities
- `auth-ui`: the contextual write gating SHALL redirect with a `next` that preserves the full path **and query string** (so the shelf survives sign-in). This refines the existing gating requirement.

## Impact

- **New code:** `app/scan/route.ts` (or page) — the action→route resolver; a `ShelfContext` provider + hook (e.g. `components/shelf/shelf-context.tsx`); a tiny helper to build `next` from path+query.
- **Changed:** `components/auth/write-cta.tsx` / the gating helper to use path+query for `next`; the login/callback `next` handling already reads `next` and will now receive the query too.
- **No new deps.** No backend changes (the resolver is a redirect; auth reuses #7/#9).
- **Downstream:** gives #31 a stable URL scheme to encode, #32 a defined landing to wire real actions onto, and #18/#33 a shelf context to consume.
