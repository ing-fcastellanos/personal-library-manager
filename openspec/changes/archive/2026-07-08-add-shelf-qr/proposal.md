## Why

Scanning a shelf's QR to preselect it when adding a book has worked since #18 — the shelf-context capture, catalog filter, and add-form default all already exist. What's missing is the QR itself: nothing in the app generates a printable `/scan?action=add&shelf=<id>` code per shelf. This change closes that last gap using the QR-rendering piece #31 already built.

## What Changes

- Add a "Ver QR" action to each shelf row in the Shelves Manager (`/ajustes`, alongside the existing "Ver contenido"/editar/eliminar actions).
- The action opens a dialog showing that shelf's QR (encoding `/scan?action=add&shelf=<id>`) with a label and a print affordance for that single tile — printed one shelf at a time, not a combined sheet.
- Reuses `<QrCode>` and the print-tile pattern from #31 (`add-qr-print-sheets`); no changes to `/scan`, shelf-context, or the add-form/catalog preselection logic (#10/#18), which are already correct.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `shelf-map`: adds a "Ver QR" action per shelf in the Shelves Manager that shows and lets the reader print that shelf's QR code.

## Impact

- `components/shelves/shelves-manager.tsx`: new per-row action + dialog.
- Reuses `components/qr/qr-code.tsx` and `components/qr/scan-url.ts` (extended to build shelf-scoped URLs) from #31 — no new dependency.
- No backend/API changes.
