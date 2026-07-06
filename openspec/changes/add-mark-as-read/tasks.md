## 1. Shared confirmation sheet

- [x] 1.1 Create `components/reading/confirm-reading-sheet.tsx`: bottom-sheet (`role="dialog"`) taking a resolved `book` + active `reader`; fetches `GET /api/books/:id/copies`.
- [x] 1.2 Fields: finish date (`<input type="date">`, default today, editable), optional start date, copy selector (only when copies exist; preselect single copy).
- [x] 1.3 Submit → `POST /api/reading-events` with `{ readerId, bookId, copyId?, status: "finished", dateFinished, dateStarted? }`; loading state on the button.
- [x] 1.4 Error handling: non-ok response keeps the sheet open with an error message; success fires `onDone(event)` + toast.
- [x] 1.5 Guard: when `reader` is null, render a sign-in / pick-reader prompt instead of the form.

## 2. Dedicated `/leido` flow

- [x] 2.1 Add `app/leido/page.tsx` + a `MarkAsRead` client component with a method selector (Buscar / Foto) reusing the `/agregar` radiogroup pattern.
- [x] 2.2 Search method: query `GET /api/catalog/search?q=` and render selectable results; selecting a book opens `ConfirmReadingSheet`.
- [x] 2.3 Photo method: capture image → `POST /api/ai/identify`; resolve candidate to a library book (isbn13 match, fallback catalog search); on match open the sheet.
- [x] 2.4 Photo no-match state: explain "solo libros de la biblioteca" and link to `/agregar`.
- [x] 2.5 Empty/loading/error states for search and photo; success returns to a "listo" state (or navigates to the book).
- [x] 2.6 Add a nav entry point to reach `/leido`.

## 3. Book-detail entry point

- [x] 3.1 Enable the "Marcar como leído" button in `components/catalog/book-detail.tsx` (remove disabled/"Pronto"); open `ConfirmReadingSheet` for the current book.
- [x] 3.2 On success, refresh reading-events (or optimistically set the reader's status) so the "Lectura" section shows "Leído".

## 4. Tests

- [x] 4.1 `confirm-reading-sheet.test.tsx`: default finish date; copy selection included; book-without-copies creates with null copyId; POST body shape; error keeps sheet open; no-reader prompt.
- [x] 4.2 `mark-as-read.test.tsx` (dedicated flow): search → select → confirm → POST; photo match → confirm; photo no-match → add prompt.
- [x] 4.3 `book-detail.test.tsx`: button enabled; mark → status becomes "Leído".
- [x] 4.4 Run `npm test` (jsdom + node) green; typecheck + lint clean.

## 5. Claude Design handoff (#24)

- [x] 5.1 Generate the specific Claude Design prompt for the mark-as-read flow: states (choose method, identifying, confirm), mobile-first responsive, accessibility, M0 design tokens.
- [x] 5.2 Produce the design in Claude Design and validate against the base design system.
- [x] 5.3 Integrate the handoff: map markup/code to Next components + tokens/styles.
- [ ] 5.4 QA: visual responsive + accessibility pass.
