## 1. URL helper

- [x] 1.1 In `components/qr/scan-url.ts`, extend `scanUrl(action, origin, shelfId?)` to append `&shelf=<id>` (URL-encoded) when `shelfId` is given. Backward-compatible with #31's existing call sites (no `shelfId` passed).
- [x] 1.2 Unit tests: with and without `shelfId`; encodes special characters in the shelf id.

## 2. Shared dialog primitive

- [x] 2.1 Add `print:hidden` to `DialogOverlay`'s default className in `components/ui/dialog.tsx` (no dialog backdrop should ever print).

## 3. Shelf QR dialog

- [x] 3.1 Create `components/qr/shelf-qr-dialog.tsx`: a `Dialog` (trigger: "Ver QR" button) showing the shelf's name + its QR (`<QrCode>`, reusing #31's screen plate style), with a print button. Pass `className="print:hidden"` on this dialog's own `DialogContent`.
- [x] 3.2 While the dialog is open, render a single print-only tile (reusing #31's cm-based tile layout: border-as-cut-line, QR left, icon+label+"Escaneá con la cámara..." subtext right) via `createPortal(..., document.body)`, `hidden print:block`, independent of `DialogContent`'s subtree (design.md Decision 2).
- [x] 3.3 Component tests: opens showing the shelf's name and a QR encoding `/scan?action=add&shelf=<id>`; the print tile is absent from the DOM when the dialog is closed and present (via the portal) when open; the "Imprimir" action calls `window.print()`.

## 4. Wire into Shelves Manager

- [x] 4.1 Add a "Ver QR" action button to each shelf row in `components/shelves/shelves-manager.tsx`, alongside "Ver contenido"/editar/eliminar, opening `ShelfQrDialog` for that shelf.
- [x] 4.2 Wrap `/ajustes`'s page content (`app/ajustes/page.tsx`) in `print:hidden` (design.md Decision 3), so printing from an open shelf-QR dialog shows only the portaled tile, not the Settings page underneath.
- [x] 4.3 Component test: the shelf row's "Ver QR" button opens the dialog for the correct shelf.

## 5. Verify

- [x] 5.1 Run `npm test` (jsdom + node) green; typecheck + lint clean.
- [ ] 5.2 Manual check: open a shelf's QR, print (or print-preview), confirm only that tile prints and the QR scans to `/scan?action=add&shelf=<id>` for the right shelf.
