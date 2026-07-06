## 1. ISBN validation helper

- [x] 1.1 Add `isValidBookIsbn13(code)` (13 digits, 978/979 prefix, valid EAN-13 checksum) next to the enrichment/normalize helpers
- [x] 1.2 Unit-test it: valid 978/979 ISBNs pass; EAN-5, non-978/979 EAN, and checksum-invalid codes fail

## 2. Decoder abstraction (native + lazy fallback)

- [x] 2.1 Add `@zxing/browser` as a dependency (lazy-loaded, never in the main bundle)
- [x] 2.2 Add `createIsbnScanner()` behind a common `start(video, onResult) / stop()` interface: use `BarcodeDetector` when present, else dynamically import the JS decoder
- [x] 2.3 Feed decoded values through `isValidBookIsbn13`; only surface valid book ISBNs to `onResult`

## 3. Scan → confirm → save flow

- [x] 3.1 Add the scanner component: `getUserMedia` live `<video>` + aim guide; start/stop the decode loop; pause on a valid ISBN
- [x] 3.2 On a hit: resolve via `GET /api/enrich?isbn=`, run the duplicate check, and show the confirm card (cover/title/author; add-as-copy when duplicate; "no encontramos" + discard/continue when enrichment misses — unknown ISBNs use the Manual mode)
- [x] 3.3 Confirm → `POST /api/books/intake` to the batch shelf (reusing the shelf intake payload); accumulate an `ImportOutcome`; resume scanning. Guard against re-opening the same in-frame ISBN
- [x] 3.4 Single batch-shelf selector for the session; "Terminar" persists outcomes and routes to `/agregar/resumen` (#22)

## 4. Manual entry + camera fallback

- [x] 4.1 Manual ISBN input that resolves through the same enrichment → confirm → save path (accept ISBN-10/13 via `toIsbn13`)
- [x] 4.2 Handle `getUserMedia` failure (`NotAllowedError` / `NotFoundError` / insecure): show the manual input with a "retry camera" affordance; never dead-end

## 5. Hub integration

- [x] 5.1 Add the "Por código" mode to `app/agregar/page.tsx` (4th option) and render the scanner component

## 6. Tests

- [x] 6.1 Component test: a mocked decode of a valid ISBN → enrich → confirm → intake → outcome; discard path saves nothing
- [x] 6.2 Component test: manual ISBN entry resolves and saves via the same path; camera-denied shows the manual fallback
- [x] 6.3 Component test: a scanned duplicate offers add-as-copy; an invalid/non-book decode is ignored (no enrich call)

## 7. Claude Design handoff

- [x] 7.1 Generate the Claude Design prompt: **three** mode-selector layouts (2×2, overflow "más", icon-only) + all scanner states (aiming, detected/confirm, not-found, duplicate, camera-denied/manual, continuous progress), mobile-first, a11y, design tokens (M0)
- [x] 7.2 Produce the designs in Claude Design and pick a mode-selector layout; validate against the base design system
- [x] 7.3 Integrate the handoff: map markup to Next components + tokens/styles
- [ ] 7.4 QA visual responsive + accessibility

## 8. Verify

- [x] 8.1 Lint, typecheck, and the affected test suite green
- [ ] 8.2 Manual QA on a phone: scan a real ISBN → confirm → added; continuous scanning of several; duplicate handling; manual entry; camera-denied fallback
