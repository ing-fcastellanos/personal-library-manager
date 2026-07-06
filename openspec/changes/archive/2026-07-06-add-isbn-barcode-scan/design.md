## Context

The "Agregar" hub (`app/agregar/page.tsx`) is a 3-way tab: Por foto (#20), Por estante
(#21), Manual (#14). Both camera flows use `<input capture="environment">` — a **still
photo**, not a live stream. Downstream, `GET /api/enrich?isbn=` → `enrichByIsbn` returns a
canonical `Candidate`; `/api/books/duplicates`, `POST /api/books/intake` (with a batch
`shelfId`), and the `/agregar/resumen` import summary (#22, an `ImportOutcome[]` in
`sessionStorage`) all exist. `services/enrichment/normalize.ts` has `toIsbn13` (accepts
ISBN-10/13, no checksum validation on 13-digit input). There is no `getUserMedia`, no
barcode library, and no ISBN-13 checksum validator.

## Goals / Non-Goals

**Goals:**

- Fast, reliable ISBN-barcode add via a live camera; continuous scan/confirm/save.
- Works across phones (Android + iOS) without bloating browsers that have the native API.
- Reuse enrichment, duplicates, intake, batch shelf, and the import summary unchanged.
- A manual ISBN input that doubles as the camera-unavailable fallback.

**Non-Goals:**

- Torch/zoom controls (shown only where supported; otherwise absent) — follow-up.
- Server-side barcode decoding (all decoding is client-side).
- Non-ISBN barcodes, and AI vision (that is the photo/shelf flows).

## Decisions

### D1 — Continuous scan → confirm → save loop (confirm each)

On a valid ISBN the decode loop **pauses**, enrichment resolves the book, and a lightweight
confirm card (cover/title/author — no full form; ISBN metadata is canonical) is shown.
Confirm → intake to the batch shelf → resume; discard → resume. The session accumulates
`ImportOutcome[]` and ends on `/agregar/resumen`. Pausing on detection is what prevents the
same in-frame barcode from re-firing (no separate debounce needed).

### D2 — Decoder: native `BarcodeDetector` + lazy `@zxing/browser` fallback

Feature-detect `window.BarcodeDetector`; use it when present (Android/Chromium, 0 KB). When
absent (notably iOS Safari), **lazily import** `@zxing/browser` so its weight is only paid on
browsers that need it. A thin `createIsbnScanner()` abstraction hides which engine is used
behind a common "start(video, onResult) / stop()" interface. _Alternative:_ zxing-only —
rejected as it ships the heavy decoder to everyone; native-only — rejected as it breaks iOS.

### D3 — Scan validation: `isValidBookIsbn13` (prefix + checksum), pure

Scans are validated by a new pure helper: 13 digits, `978`/`979` prefix, valid EAN-13
checksum. This rejects EAN-5 supplements (the price barcode beside the ISBN), product EANs,
and mis-reads before wasting an enrichment call. `toIsbn13` is reused for the **manual**
input only (there ISBN-10 entry is legitimate and gets converted). Colocated with the other
enrichment/normalize helpers, unit-tested.

### D4 — Reuse the shelf/summary batch machinery, not the photo form

The continuous flow is structurally the shelf batch (#21) with the "identify" step replaced
by a scan: one batch shelf, per-item duplicate handling ("ya lo tenés" / add-as-copy),
`ImportOutcome[]` accumulation, and the #22 summary. The confirm card and intake payload
mirror the shelf flow's, so the new UI is the camera + confirm card; the rest is reuse.

### D5 — Manual input is also the camera-denied fallback

`getUserMedia` can fail (`NotAllowedError`, `NotFoundError`, insecure context). The view
always exposes a manual ISBN input; when the camera starts it is the primary path, and when
it cannot, the manual input is the path (with a "retry camera" affordance). One control
covers both "book has no barcode" and "camera unavailable".

### D6 — Layout of the 4th mode: defer to design, request variants

Four tabs on ~360px is tight in the current `grid-cols-3`. The Claude Design prompt SHALL
request **three** treatments — 2×2 grid, an overflow ("más") menu, and icon-only tabs — so
we compare them before integrating, plus every scanner state (aiming, detected/confirm,
not-found, duplicate, camera-denied/manual, continuous progress).

## Risks / Trade-offs

- **[iOS Safari lacks `BarcodeDetector`]** → lazy `@zxing/browser` fallback; only iOS pays the
  bytes, and only when the scanner is opened.
- **[Small/low-focus barcodes]** → request a decent resolution (`ideal 1280×720+`) and rely
  on continuous attempts + an on-screen aim guide; torch/zoom are a follow-up where supported.
- **[Rapid re-decode of the same code]** → the confirm step pauses the loop; a "last confirmed
  ISBN" guard avoids immediately re-opening the same in-frame code.
- **[Non-book / supplement barcodes]** → `isValidBookIsbn13` filters to 978/979 + checksum;
  invalid decodes are ignored silently so scanning is not interrupted.
- **[Enrichment miss for a valid ISBN]** → show "no encontramos metadata para ese ISBN" and
  let the reader discard/continue; loading unknown-ISBN metadata by hand is the "Manual" mode
  (not an inline form here), keeping the scan sheet lightweight.
- **[`@zxing/browser` bundle/version]** → lazy-loaded and isolated behind `createIsbnScanner`,
  so it never enters the main bundle and can be swapped without touching callers.
