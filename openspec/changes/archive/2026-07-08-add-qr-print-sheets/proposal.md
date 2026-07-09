## Why

The `/scan` deep-link resolver (#10) and its auth/shelf-context plumbing (#10, #18) have existed since M1/M2, but there are no actual QR codes to scan yet — nothing in the app renders one. Without a printable sheet, none of that infrastructure is reachable from a real librero. #31 closes that gap: generate the three action QRs (dashboard, agregar, registrar leído) and a print-friendly sheet to stick next to the shelf.

## What Changes

- Add client-side QR code generation (canvas-based, no server round-trip) for deep-link URLs (`/scan?action=<action>`).
- Add a print sheet page listing the three action QRs (dashboard/agregar/leído), each with a legible label, sized and margined for real-world printing.
- Add a `@media print` stylesheet + a "Imprimir" trigger (`window.print()`) — no PDF export, no new print/PDF dependency.
- No changes to `/scan`, auth gating, or shelf-context — this change only adds the thing that produces the QR images; the resolver they point to already exists (#10) and is unmodified.

## Capabilities

### New Capabilities

- `qr-print-sheets`: client-side QR code rendering for action deep-links, plus a printable sheet view (layout, labels, print stylesheet) for sticking next to the shelf.

### Modified Capabilities

(none — this change is additive; `qr-auth`'s existing `/scan` resolver and shelf-context requirements are unchanged)

## Impact

- New dependency: a client-side QR rendering library (canvas-based, e.g. `qrcode`).
- New route/page for the print sheet (e.g. `app/imprimir-qr` or similar — exact path decided in design).
- No backend/API changes — the sheet only needs to know the app's own origin to build `/scan?action=...` URLs, which it already has client-side.
- No changes to existing auth, shelf, or catalog code.
