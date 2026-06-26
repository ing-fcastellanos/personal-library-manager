## 1. Identify + enrich service

- [x] 1.1 Add `services/ai/identify.ts`: `identifyAndEnrich(image, deps)` calling `identifyBookFromImage` (#19)
- [x] 1.2 Bridge to enrichment: ISBN present → `enrichByIsbn`; else → `searchByText(title + authors)`
- [x] 1.3 Shape the result as `{ aiConfidence, sourceProvider, best, alternatives }`; degrade to the raw AI candidate when enrichment is empty
- [x] 1.4 Make AI + enrichment injectable via `deps` (matching existing service patterns)
- [x] 1.5 Unit-test ISBN path, text-search path, and no-match path with injected fakes (emulator-free)

## 2. API endpoint

- [x] 2.1 Add `server/routes/ai-identify.ts`: `POST /api/ai/identify` (`requireAuth`), zod-validated `{ imageBase64, contentType }`
- [x] 2.2 Apply the 8mb base64 limit + content-type validation (reuse the cover route's approach)
- [x] 2.3 Map a "no engine available" / AI error to a clear status; return `{ aiConfidence, sourceProvider, best, alternatives }`
- [x] 2.4 Mount the router under `/api` in `server/index.ts` (before the books `:id` route)
- [x] 2.5 Route tests: auth gate, validation/oversize `400`, success shape, error mapping

## 3. Cover-on-confirm

- [x] 3.1 Allow the captured photo (base64) to become the cover at save time, reusing the cover service (#15)
- [x] 3.2 Wire intake-or-cover so the book is created then the photo uploaded on confirm; never upload for a discarded photo
- [x] 3.3 Test that a confirmed save stores the photo as cover and a cancel stores nothing

## 4. Capture + confirm UI

- [x] 4.1 Add a photo entry point in `/agregar` using `<input capture="environment">`
- [x] 4.2 Send the photo to `/api/ai/identify`; show capturing / analyzing / error states
- [x] 4.3 Confirmation view: show the photo (as cover), pre-fill `best`, list `alternatives` to pick, surface low confidence
- [x] 4.4 Map the chosen candidate into the existing `BookData` path → duplicate pre-check (#16) → intake (#14)
- [x] 4.5 Component tests: analyze → candidate render, pick alternative updates fields, save calls intake with the photo cover

## 5. Claude Design handoff

- [x] 5.1 Generate the Claude Design prompt: states (capturing, analyzing, candidate, low-confidence, error), mobile-first, a11y, design tokens (M0)
- [x] 5.2 Produce the design in Claude Design and validate against the base design system
- [x] 5.3 Integrate the handoff: map markup to Next components + tokens/styles
- [x] 5.4 QA visual responsive + accessibility

## 6. Verify

- [x] 6.1 Confirm no API key reaches the client; identify is auth-gated
- [x] 6.2 Run lint, typecheck, and the test suite green
- [x] 6.3 Manual check: photo → candidate + alternatives → confirm saves the book with the photo as cover
