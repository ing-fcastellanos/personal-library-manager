## 1. Outcome model + helpers

- [x] 1.1 Add `components/books/import-summary.ts`: `ImportResult`, `ImportOutcome` (title, coverUrl?, result, bookId?, copyId?, retry?)
- [x] 1.2 `groupOutcomes(list)` → counts + per-group arrays (added / added_as_copy / skipped_duplicate / discarded / failed)
- [x] 1.3 `saveImport(list)` / `loadImport()` over `sessionStorage` (key `plm:lastImport`), resilient to absent/corrupt data
- [x] 1.4 `markUndone(list, index)` / `markRetried(list, index, ids)` pure updaters that also re-persist
- [x] 1.5 Unit-test the helpers (grouping, persistence round-trip, updaters)

## 2. Summary view + route

- [x] 2.1 Add `<ImportSummary>`: grouped counts header + per-item list with result-specific actions; empty state with a link to "Agregar"
- [x] 2.2 Undo: `DELETE /api/copies/:copyId` then (for `added`) `DELETE /api/books/:bookId`; reflect undone in state + sessionStorage; toast on failure
- [x] 2.3 Retry: re-`POST /api/books/intake` with the retained candidate; on success flip the item to `added` with new ids; toast on failure
- [x] 2.4 Edit: link each added book to `/libros/:id/editar`
- [x] 2.5 Add `app/agregar/resumen/page.tsx` reading `loadImport()` into state and rendering `<ImportSummary>` (write-gated like `/agregar`)

## 3. Wire the AI add flows

- [x] 3.1 Shelf (#21): collect `ImportOutcome[]` across auto-add, review confirm/discard, duplicates, and intake failures (capture `{book,copy}` ids; failures keep the candidate)
- [x] 3.2 Shelf: replace the in-flow `DoneView` with `saveImport(outcomes) + router.push("/agregar/resumen")`
- [x] 3.3 Photo (#20): map the saved book to one outcome (added / added_as_copy / failed) and navigate to the summary instead of straight to the book
- [x] 3.4 Ensure both flows capture intake `{ book, copy }` ids for undo

## 4. Tests

- [x] 4.1 Component test: summary renders groups + counts from a mixed outcome list
- [x] 4.2 Undo added → calls copy then book delete and marks undone; undo copy → deletes only the copy
- [x] 4.3 Retry failed → re-intake then moves to added
- [x] 4.4 Route test: `/agregar/resumen` hydrates from sessionStorage; empty state when none

## 5. Claude Design handoff

- [x] 5.1 Generate the Claude Design prompt: groupings, per-item actions/states, empty state, mobile-first, a11y, design tokens (M0)
- [x] 5.2 Produce the design in Claude Design and validate against the base design system
- [x] 5.3 Integrate the handoff: map markup to Next components + tokens/styles
- [ ] 5.4 QA visual responsive + accessibility

## 6. Verify

- [x] 6.1 Run lint, typecheck, and the test suite green
- [ ] 6.2 Manual check: run a shelf import → summary shows correct groups; undo/edit/retry work; survives editing + reload
