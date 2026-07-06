## Why

Adding books by AI photo (#20) or shelf (#21) is powerful but can be slow or imprecise.
For a book that has a barcode, scanning the **ISBN** off the back cover is the fastest,
cheapest, most reliable path — the ISBN yields canonical metadata directly. Issue #23 (the
last open item in milestone M3) adds a camera barcode scanner that feeds the existing
ISBN enrichment. Everything downstream already exists (enrich-by-ISBN, duplicate check,
intake, batch shelf, import summary), so this is mostly a new **scanner front-end**.

## What Changes

- Add a **"Por código"** mode to the "Agregar" hub (a 4th option alongside Por foto / Por
  estante / Manual).
- **Continuous scan → confirm → save loop**: a live camera decodes ISBN barcodes; each hit
  pauses the loop and shows a lightweight confirm card (cover/title/author from ISBN
  enrichment); confirming saves and resumes scanning; a running batch ends on the shared
  **import summary** (`/agregar/resumen`, #22).
- **Barcode decoding** via the native `BarcodeDetector` when available, falling back to a
  lazily-loaded JS decoder (`@zxing/browser`) so iOS Safari works without weighing down
  browsers that have the native API.
- **ISBN validation** for scans: accept only EAN-13 with a 978/979 prefix and a valid
  checksum (reject EAN-5 supplements, product barcodes, mis-scans).
- **Manual ISBN input** as a fallback — for books without a barcode and, importantly, when
  the camera is denied/unavailable.
- Reuse the existing duplicate check ("ya lo tenés" / add-as-copy) and single batch-shelf
  selector.

## Capabilities

### New Capabilities

- `barcode-add`: the camera ISBN-barcode add flow — the continuous scan/confirm/save loop,
  decoder-with-fallback, ISBN validation, manual-entry + camera-denied fallback, and the
  "Por código" entry point.

### Modified Capabilities

<!-- none — catalog-enrichment (enrich-by-ISBN), catalog-duplicates, catalog-add (intake),
     and ai-import-summary are reused as-is, unchanged. -->

## Impact

- New: `@zxing/browser` (lazy-loaded) dependency; a barcode-scan component + its pure
  helpers (ISBN validation, decoder abstraction); a 4th tab in `app/agregar/page.tsx`.
- Reused unchanged: `GET /api/enrich?isbn=`, `/api/books/duplicates`, `POST /api/books/intake`,
  the batch-shelf selector, and the `/agregar/resumen` import summary.
- Camera: `getUserMedia` (needs HTTPS — already on Cloud Run) with explicit permission /
  no-camera handling that falls back to manual entry.
- Out of scope (follow-ups): torch/zoom controls (shown only where the browser supports
  them, otherwise absent), server-side barcode decoding, non-ISBN barcodes.
