## 1. Dependency + URL helper

- [x] 1.1 Add the `qrcode` package (+ `@types/qrcode` dev dependency) for canvas-based, client-side QR rendering.
- [x] 1.2 Add a small helper (e.g. `components/qr/scan-url.ts`) that builds `<origin>/scan?action=<action>` from `window.location.origin` for the three actions (`dashboard`, `add`, `finish`), matching `app/scan/route.ts`'s existing action keys.

## 2. QR code component

- [x] 2.1 Create `components/qr/qr-code.tsx`: a client component that takes a `value` string and renders it to a `<canvas>` via `qrcode`'s `toCanvas`, drawing on mount (not on-demand) so it's ready before print. Default error-correction level `M`.
- [x] 2.2 Unit/component test: renders a canvas for a given value; re-renders (redraws) when `value` changes.

## 3. Print sheet page + Settings entry point

- [x] 3.1 Create the QR print page (e.g. `app/ajustes/qr/page.tsx`) rendering the three action QRs (dashboard/agregar/leído) with real-text Spanish labels, using `QrCode` + the URL helper.
- [x] 3.2 Add an "Imprimir" button that calls `window.print()`.
- [x] 3.3 Add a `@media print` stylesheet: hides the app header/nav and shell chrome, lays out the three QR+label pairs with fixed physical-unit sizing/margins suitable for printing and cutting out individually.
- [x] 3.4 Add an entry-point link from `/ajustes` to the new page, alongside the existing setup sections (Lectores/Estantes/IA/Seguridad).
- [x] 3.5 Component tests: page renders three labeled QR codes; loads without a mocked session (no auth requirement); Imprimir triggers `window.print()`.

## 4. Verify

- [x] 4.1 Run `npm test` (jsdom + node) green; typecheck + lint clean.
- [x] 4.2 Manual print test: print (or print-preview) the sheet on at least one real printer/PDF-print and confirm all three QRs scan correctly with a phone camera to their expected `/scan?action=...` destinations.

## 5. Claude Design handoff (#31)

- [x] 5.1 Generate the specific Claude Design prompt for the QR print sheet: page layout (screen + print), QR anatomy (code + label), sizing/margins for print, entry point from Settings, accessibility, M0 tokens.
- [x] 5.2 Produce the design in Claude Design and validate against the base design system.
- [x] 5.3 Integrate the handoff: map markup/code to Next components + tokens/styles (screen view) and the print stylesheet.
- [x] 5.4 QA: visual responsive + accessibility pass, plus the real-printer scan test from 4.2 if not already done.
