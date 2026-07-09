## 1. CSV parsing

- [x] 1.1 Add a small CSV-parsing dependency (design D1) and create a `parseCsv(file)` helper returning `{ headers: string[], rows: Record<string,string>[] }`.
- [x] 1.2 Unit tests: quoted fields with embedded commas/newlines parse correctly, CRLF and LF line endings both work, a leading UTF-8 BOM doesn't corrupt the first header.

## 2. Format detection

- [x] 2.1 Define the known Goodreads and StoryGraph header signatures and each format's default column mapping (target field → source header); add `detectFormat(headers)` returning `"goodreads" | "storygraph" | "unknown"`.
- [x] 2.2 Unit tests: detects a Goodreads header row, detects a StoryGraph header row, returns `"unknown"` for neither.

## 3. Column mapping step

- [x] 3.1 Build the mapping screen: one row per target field (title, author, ISBN, rating, review, date finished, status), each bound to a `<select>` of the parsed headers, pre-selected from `detectFormat`'s default mapping (blank selects when unknown).
- [x] 3.2 Component tests: default mapping is pre-selected for a detected format; the reader can change a field's mapped column before confirming; nothing downstream runs until the mapping is confirmed.

## 4. Status filter + ISBN normalization

- [x] 4.1 Create `filterFinishedRows(rows, mapping)`: applies the confirmed mapping, strips Goodreads' `="..."` ISBN wrapper (design D9), and keeps only rows whose mapped status is `"read"` (case-insensitive — shared literal across both formats since they coincide, not format-keyed).
- [x] 4.2 Unit tests: keeps `read` rows; drops `to-read`, `currently-reading`, and `did-not-finish` rows for both formats; strips the Goodreads ISBN escape into a clean ISBN string.

## 5. Enrichment + duplicate pre-pass

- [x] 5.1 Build the processing step: for every surviving row, sequentially call `/api/enrich` (ISBN, falling back to title/author text search) and `/api/books/duplicates`, one row at a time (design D4, matching `add-book-by-shelf`'s loop), with a visible progress indicator.
- [x] 5.2 Build the per-row processed shape combining the CSV fields, enrichment result, duplicate result, and default `include`/`physical`/`action` (design D5's table: `add-new`→create-new, `add-copy`→use-existing, `add-new-edition`→create-new, `review`→create-new).
- [x] 5.3 Unit tests: default `action` matches design D5's table for each `Recommendation` value; a row with no ISBN falls back to text-search enrichment; a row where enrichment finds nothing still produces a valid processed row using only the CSV's own title/author.

## 6. Review list

- [x] 6.1 Build the review-list component: one row per processed item with an include/exclude toggle, a physical/digital toggle, and a non-blocking duplicate badge (showing the matched book) with a control to override the row's action to "use existing" (or back to "create new").
- [x] 6.2 Component tests: excluding a row removes it from what gets confirmed; marking a row digital means no `Copy` request is built for it later; overriding a duplicate row's action switches it between create-new and use-existing.

## 7. Reader attribution

- [x] 7.1 Confirm the wizard reads `readerId` from `useAuth().reader.id` (no separate picker step, design D7) and use it for every `ReadingEvent` created during the run.

## 8. Persistence + summary

- [x] 8.1 Build the confirm step: for each included row, sequentially call either `POST /api/books/intake` (create-new action, with `copy` included only when physical) or `POST /api/copies` against the matched book (use-existing action, physical only), then `POST /api/reading-events` with the chosen reader, `status: "finished"`, and the row's mapped rating/review/date (design D6).
- [x] 8.2 Map each row's outcome to the existing `ImportOutcome` shape and render `components/books/import-summary-view.tsx`, reusing its per-item retry for failed rows (design D8). _(A known edge case documented in code: if intake succeeds but the reading-event call fails, the row is marked failed with no `retry` — retrying via intake again would create a second book, since one was already made.)_
- [x] 8.3 Component/integration tests: a create-new row produces `Book` + `Copy` (if physical) + `ReadingEvent`; a use-existing row produces only `Copy` (if physical) + `ReadingEvent` against the matched book id; a row whose calls fail surfaces in the failed bucket and the rest of the import completes unaffected.

## 9. Wizard mode tile

- [x] 9.1 Add the CSV-import entry point as a 5th mode in the existing `/agregar` mode-switcher (not a separate route — matches how `AddBookByPhoto`/`Shelf`/`Code`/manual already work; no other add-flow has its own top-level route) wiring the steps in sequence: upload → mapping → filter+enrich progress → review → confirm/save progress → summary.
- [x] 9.2 Component test: the wizard renders its upload step and, with a small fixture CSV mocked through each step, reaches the summary screen.

## 10. Verify

- [x] 10.1 Run `npm test` (jsdom + node) green; typecheck + lint clean.

## 11. Claude Design handoff (#35)

- [x] 11.1 Generate the specific Claude Design prompt for the import wizard (upload, column mapping, enrichment progress, review list with duplicate badges and physical/digital toggle, confirm/summary): states, responsive, accessibility, M0 tokens.
- [x] 11.2 Produce the design in Claude Design and validate against the base design system.
- [x] 11.3 Integrate the handoff: map markup/code to Next components + tokens/styles.
- [ ] 11.4 QA: visual responsive + accessibility pass, plus a real Goodreads export and a real StoryGraph export each run through the wizard end-to-end.
