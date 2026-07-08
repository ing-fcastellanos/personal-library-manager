## Context

`/scan?action=<action>&shelf=<id>` has resolved deep-links since #10 (M1), and shelf preselection has worked since #18 (M2) — but nothing in the app has ever rendered an actual QR code. This change adds the missing piece: a page that renders the three action QRs (`dashboard`, `agregar`, `finish`) and lets the reader print them to stick next to the shelf. #33 (QR por estante) will reuse the same rendering piece for per-shelf QRs later; this change only covers the three global actions.

No backend involvement: a QR here is just `<origin>/scan?action=X` rendered client-side. The app already knows its own origin at render time (`window.location.origin`), so there's no new API surface.

## Goals / Non-Goals

**Goals:**

- Render three legible, scannable QR codes (dashboard / agregar / registrar leído) client-side, no server round-trip.
- A print-friendly view: correct sizing, margins, and labels so a phone camera can scan the printed page reliably.
- Reuse the app's existing visual language (M0 tokens, icons already used for these same actions elsewhere) rather than a one-off page.

**Non-Goals:**

- PDF export (CSS print + `window.print()` only, per the confirmed decision).
- Per-shelf QRs (#33 — reuses this change's QR-rendering piece, out of scope here).
- Any change to `/scan`, auth gating, or shelf-context (#10/#18 are unmodified).
- QR error handling/expiry semantics (#32's scope, not this change's).

## Decisions

**Decision 1 — QR rendering library: `qrcode` (canvas).**
Client-side, MIT-licensed, no dependencies of its own, renders directly to a `<canvas>` (`QRCode.toCanvas`). Chosen over an SVG-based lib because canvas output prints crisply at arbitrary DPI and is the most common/battle-tested choice for this exact use case. Alternative considered: a hosted QR-generation API — rejected, since it would add a network dependency and a third party in the loop for something that's pure client-side math.

**Decision 2 — Absolute URLs, computed at render time.**
The QR must encode an absolute URL (`https://.../scan?action=add`), not a relative path — a phone camera has no "current origin" to resolve against. Built from `window.location.origin` in a client component; no env var or hardcoded domain, so it keeps working across `localhost`, Cloud Run staging, and prod without configuration.

**Decision 3 — Error-correction level M, generous quiet zone.**
`qrcode`'s default is `M` (~15% recovery) — kept as-is. It's the standard trade-off for printed codes that may see minor smudging/wear over time, without bloating the code's density (which would hurt scannability from a phone at arm's length). Each QR gets padding equivalent to the spec's quiet-zone recommendation (4 modules) so a slightly imprecise print trim doesn't clip it.

**Decision 4 — New page under `/ajustes`, not a new top-level nav item.**
Printing shelf QRs is a one-time (or rare) setup action, not a daily flow — it belongs next to the other setup/admin actions already in Settings (shelves manager, reader management), not in the bottom nav. Exact path (e.g. `/ajustes/qr`) and the entry-point link's copy are implementation details for `tasks.md`.

**Decision 5 — Render on mount, not on print-click.**
All three canvases render as soon as the page loads (not lazily on a "generate" click), so `window.print()` always has fully-drawn QR codes — avoids a race where the print dialog opens before an async canvas draw finishes.

## Risks / Trade-offs

- **[Risk] Browser print margins/scaling vary by device/printer** → Mitigation: use a `@media print` stylesheet with fixed physical units (`cm`/`in`) rather than viewport-relative units, and a documented visual QA step (task in tasks.md) to print-test on at least one real printer before considering #31 done.
- **[Risk] No PDF means no "print later from another device"** → Mitigation: accepted trade-off per the confirmed decision (CSS print over PDF); the page can always be reopened and reprinted since it's fully client-computed, no state to lose.
- **[Risk] `qrcode`'s `toCanvas` is async** → Mitigation: render via a `useEffect` per QR that awaits the draw and only enables the "Imprimir" button once all three have resolved (or renders unconditionally if draws are fast enough in practice — confirmed during implementation).

## Migration Plan

None — purely additive UI, no data model or API changes, nothing to backfill or roll back beyond removing the new page/route.

## Open Questions

- Exact route path and Settings entry-point copy — left to `tasks.md`/implementation, not a design-level decision.
- Whether to also show the shelf's own QR placeholder/link-out to #33 from this same page (a "ver QRs por estante" link) — deferred until #33 exists; this change ships with just the three action QRs.
