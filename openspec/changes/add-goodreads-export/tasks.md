## 1. Data model

- [x] 1.1 Add `publishPending: z.boolean().default(false)` to `readingEventSchema`, and `publishPending: z.boolean().optional()` to `readingEventUpdateSchema` in `lib/types/reading-event.ts`.
- [x] 1.2 Confirm `server/routes/reading-events.ts`'s existing `PATCH` handler persists `publishPending` through `readingEventUpdateSchema` with no other changes needed.

## 2. Helpers

- [x] 2.1 Create `components/reading/goodreads.ts`: `goodreadsSearchUrl(isbn, title)` → `https://www.goodreads.com/search?q=<...>` (ISBN when present, else title, URL-encoded); `toCsvField(value)` (RFC 4180 escaping) and `eventsToCsv(events)` (builds the full CSV string: header row + Title/Author/ISBN/My Rating/My Review/Date Read per event).
- [x] 2.2 Unit tests: `goodreadsSearchUrl` (ISBN preferred, title fallback, encoding); `toCsvField` (plain value, comma, quote, newline, combination); `eventsToCsv` (header + rows, multiple authors joined, empty rating/review).

## 3. Shared filters bar

- [x] 3.1 Extract `components/reading/reading-filters-bar.tsx` from `reading-history.tsx`'s existing reader-select + from/to date inputs (a subset of `HistoryFilters`: `readerId`, `from`, `to` — no rating), taking `readers`, `value`, and `onChange`.
- [x] 3.2 Update `reading-history.tsx` to use the extracted bar for its reader/date filters (rating filter stays local to Historial).
- [x] 3.3 Confirm `reading-history.test.tsx` still passes unmodified (or update only what the extraction's markup changes require).

## 4. Pending-to-publish toggle + publish link (history)

- [x] 4.1 In `components/reading/reading-event-card.tsx` (or the history row, whichever renders each event), add a "Pendiente de publicar" toggle — visible/editable only on the active reader's own events (same ownership pattern as the existing rating/review edit) — PATCHing `publishPending` via `/api/reading-events/:id`.
- [x] 4.2 Add a "Publicar en Goodreads" link next to it, shown only when `useAuth().reader?.goodreadsUrl` is set, using `goodreadsSearchUrl(event.isbn13, event.bookTitle)`, `target="_blank"` + `rel="noreferrer"`.
- [x] 4.3 Component tests: toggle PATCHes and reflects state; link present/absent based on `goodreadsUrl`; link href is correct for an event with and without an ISBN.

## 5. Export tab on /leido

- [x] 5.1 Add a third tab ("Exportar") to `app/leido/page.tsx`'s existing tablist, alongside Registrar/Historial.
- [x] 5.2 Create `components/reading/reading-export.tsx`: reuses the events/readers fetch pattern from `reading-history.tsx`, the shared `ReadingFiltersBar`, a "Descargar CSV" button (`eventsToCsv` → `Blob` → temporary `<a download>` click), and shows each filtered event with its own pending-to-publish toggle (reusing the same PATCH as task 4.1).
- [x] 5.3 Component tests: download button triggers a CSV built from the currently-filtered events (assert `eventsToCsv` is called with the right filtered set, or assert the Blob content directly); filters narrow the set consistently with Historial's own filtering.

## 6. Book detail

- [x] 6.1 Add a "Ver en Goodreads" button to `components/catalog/book-detail.tsx`'s action area (alongside Editar), linking to `goodreadsSearchUrl(book.isbn13, book.title)`, always visible.
- [x] 6.2 Component test: button renders with the correct href for a book with an ISBN and for one without.

## 7. Verify

- [x] 7.1 Run `npm test` (jsdom + node) green; typecheck + lint clean.

## 8. Claude Design handoff (#34)

- [x] 8.1 Generate the specific Claude Design prompt for: the Exportar tab (filters + download + per-row pending toggle), the pending-to-publish toggle and publish link as they appear in Historial, and the "Ver en Goodreads" button on the book detail page — states, responsive, accessibility, M0 tokens.
- [x] 8.2 Produce the design in Claude Design and validate against the base design system.
- [x] 8.3 Integrate the handoff: map markup/code to Next components + tokens/styles.
- [ ] 8.4 QA: visual responsive + accessibility pass, plus a real CSV download opened in a spreadsheet app to confirm Goodreads/StoryGraph would accept it.
