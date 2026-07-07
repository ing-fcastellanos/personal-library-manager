## 1. Star rating control

- [x] 1.1 Create `components/reading/star-rating.tsx`: accessible 1–5 stars, `role="radiogroup"` + `role="radio"` (`aria-checked`), keyboard (arrows/1–5), visible focus, and a clear-to-null affordance. Read-only variant for display.
- [x] 1.2 `star-rating.test.tsx`: set a value, keyboard set, clear back to null, read-only renders stars without controls.

## 2. Payload helpers

- [x] 2.1 Extend `readingEventCreateBody` in `mark-read.ts` to carry optional `rating`/`review` (null when unset).
- [x] 2.2 Add `readingEventUpdateBody(...)` producing the `PATCH` shape (status omitted; rating/review/dates as set/cleared).
- [x] 2.3 Unit tests for both helpers (rating included/omitted, clearing → null).

## 3. Dual-mode confirm sheet

- [x] 3.1 Add `mode: "create" | "edit"` (default `create`) + optional `event` prop to `ConfirmReadingSheet`; preload date/copy/rating/review from `event` in edit mode.
- [x] 3.2 Add the rating (StarRating) and review (textarea) fields to the form; both optional.
- [x] 3.3 Submit: create → `POST` (now including rating/review); edit → `PATCH /api/reading-events/:id` with the update body; success/error/toast unchanged.
- [x] 3.4 Update `confirm-reading-sheet.test.tsx`: create-with-rating POST body; edit-mode preload + PATCH; clearing a rating.

## 4. Book-detail display + edit entry

- [x] 4.1 Show each reader's rating (read-only stars) and review text on their "Lectura" row when present.
- [x] 4.2 Active reader's row: an "Editar" affordance opening the sheet in `edit` mode for their latest event; optimistic refresh of the row on save.
- [x] 4.3 Update `book-detail.test.tsx`: rating/review render; active-reader "Editar" opens edit → PATCH → updated values; others read-only.

## 5. Verify

- [x] 5.1 Run `npm test` (jsdom + node) green; typecheck + lint clean.

## 6. Claude Design handoff (#25)

- [x] 6.1 Generate the specific Claude Design prompt for the rating + review UI: star control states (empty/hover/selected/read-only/focus), review textarea, capture-vs-edit, detail display, mobile-first, accessibility, M0 tokens.
- [ ] 6.2 Produce the design in Claude Design and validate against the base design system.
- [ ] 6.3 Integrate the handoff: map markup/code to Next components + tokens/styles.
- [ ] 6.4 QA: visual responsive + accessibility pass.
