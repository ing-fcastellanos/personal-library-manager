## 1. Filter helpers

- [x] 1.1 Create `components/reading/history.ts`: pure helpers — `eventDate(ev)` (dateFinished ?? createdAt), and `filterEvents(events, { readerId?, rating?, from?, to? })` applying all active filters (AND).
- [x] 1.2 `history.test.ts`: reader/rating/date-range filters individually and combined; empty result; undated events fall back to createdAt.

## 2. Event card

- [x] 2.1 Create `components/reading/reading-event-card.tsx`: renders one event (cover/title/authors from snapshot, reader name, status badge + `StarRating` read-only, date, review), with an optional "Editar" affordance shown only when `editable`.
- [x] 2.2 `reading-event-card.test.tsx`: renders snapshot fields + rating + review; edit control shows only when editable; read-only otherwise.

## 3. Global timeline (Historial tab)

- [x] 3.1 Create `components/reading/reading-history.tsx`: fetch `GET /reading-events`, render newest-first cards; loading + empty states.
- [x] 3.2 Filter controls: reader (from `/api/readers`), rating, date range; apply via `filterEvents`; "no matches" empty state + clear.
- [x] 3.3 Edit: an own entry opens the dual-mode `ConfirmReadingSheet` in `edit` mode; optimistic update (replace by id) on save.
- [x] 3.4 `reading-history.test.tsx`: renders events; filter narrows the list; empty + no-match states; edit an own entry → PATCH → updated.

## 4. `/leido` tabs

- [x] 4.1 Add a Registrar | Historial tab switch to `app/leido/page.tsx` (signed-in view); Registrar keeps `MarkAsRead`, Historial renders `ReadingHistory`. Accessible tabs (roles/keyboard).
- [x] 4.2 Update `app/leido` test (or add one) for tab switching.

## 5. Per-book history on the detail

- [x] 5.1 Add a "Historial" section to `components/catalog/book-detail.tsx` listing all of the book's events (reuse `ReadingEventCard`), below the per-reader summary; empty hint when none.
- [x] 5.2 Update `book-detail.test.tsx`: multiple readings render in the history section.

## 6. Verify

- [x] 6.1 Run `npm test` (jsdom + node) green; typecheck + lint clean.

## 7. Claude Design handoff (#26)

- [x] 7.1 Generate the specific Claude Design prompt for the history/timeline: tabs, event card, filters, empty/loading states, per-book history, mobile-first, accessibility, M0 tokens.
- [x] 7.2 Produce the design in Claude Design and validate against the base design system.
- [x] 7.3 Integrate the handoff: map markup/code to Next components + tokens/styles.
- [ ] 7.4 QA: visual responsive + accessibility pass.
