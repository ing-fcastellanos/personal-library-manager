## Context

After #9, deep-linkable routes, contextual write gating, and remembered-device sessions already exist. #10 adds the stable QR entry (`/scan`) and the shelf-context plumbing, and fixes the one real gap: the login `next` drops the query string. Decisions from exploration: `/scan` resolver (not bare deep-links), no credential in the QR (ADR-0006), and real shelf preselection deferred to #18.

## Goals / Non-Goals

**Goals:**
- A `/scan?action=&shelf=` resolver that redirects to the right route, preserving `shelf`.
- A shelf context that survives navigation and the login round-trip.
- `next` preserves the full path + query so a scanned shelf survives sign-in.
- Reaffirm: public read, auth-required write, no token in the QR.

**Non-Goals:**
- QR generation/printing (#31), wiring to real add/finish actions (#32), shelf model + preselection (#18/#33).

## Decisions

- **`/scan` as a Next route handler** (`app/scan/route.ts`, `GET`) that returns a server-side redirect (`NextResponse.redirect(new URL(target, req.url))`). Server-side = no flash, fast, and stable: the printed QR encodes `/scan?action=…&shelf=…`; internal routes can change without reprinting. Action map: `dashboard → /`, `add → /agregar`, `finish → /leido`; unknown/missing → `/`. `shelf` is appended to the target when present.
- **Shelf context** (`components/shelf/shelf-context.tsx`): a client provider that reads `?shelf` via `useSearchParams` and exposes it through `useShelf()`. It also mirrors the last value in `sessionStorage` as a backup, but the primary source is the URL — because `next` (fixed below) keeps `?shelf` through the login detour, the value is back in the URL on return. Mounted in the root layout. No preselection logic here (that's #18).
- **`next` preserves query.** Add a `useNextParam()` hook returning `encodeURIComponent(pathname + search)`. Update the write gating (`write-cta`) — and `auth-control` / `pin-section` for consistency — to build `next` from path **+ query** instead of `pathname` alone. Login/callback already read and honor `next`.
- **No backend change.** The resolver is a redirect; auth/landing reuses #7 (session) and #9 (gating). The QR never carries a credential (ADR-0006); "auto-login" is the remembered device (ADR-0012).

## Risks / Trade-offs

- **Route handler vs page** → a route handler avoids rendering the shell for a redirect; chosen for speed and no flash. If we later need a branded "opening…" screen, swap to a page.
- **Shelf persistence** → URL is the source of truth; `sessionStorage` is only a backup for odd cases (e.g. a manual nav that drops the query). Avoids stale shelf by always preferring the current URL.
- **Coupling to route names** → the action→route map lives in one place (`/scan`), so renames touch a single file; the QR URLs stay constant.

## Migration Plan

Additive on `claude/hola-oejkn3`. New `/scan` + shelf context; a one-line behavior change to `next`. Rollback = revert. No data.

## Open Questions

- Final `action` vocabulary (`dashboard|add|finish`) — kept aligned with ADR-0006; #31 will encode exactly these.
- Whether the shelf context should later hold a resolved shelf object (name, etc.) — deferred to #18 when the shelf model exists.
