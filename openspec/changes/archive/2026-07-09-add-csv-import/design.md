## Context

#35 bootstraps a reader's library from a Goodreads or StoryGraph CSV export. The dependent infrastructure already exists and is designed to be reused, not modified:

- `findBookDuplicates` (`services/duplicates/service.ts`, #16) — read-only, returns a `Recommendation` (`add-new | add-copy | add-new-edition | review`) plus matches. It creates nothing; callers execute the action.
- `enrichByIsbn` / `searchByText` (`services/enrichment/service.ts`, #13) — cached lookups against Google Books/Open Library.
- `POST /api/books/intake` (`server/routes/intake.ts`, #14) — creates a `Book` and an optional owned `Copy` in one authenticated call, re-hosting the cover. This is what `add-book-by-shelf.tsx` and `add-book-by-photo.tsx` already call per-item; it always creates a **new** `Book` (it has no "attach to existing book" mode).
- `components/books/import-summary-view.tsx` + `import-summary.ts` (#22) — an existing outcome-grouped summary screen (`added / added_as_copy / skipped_duplicate / failed / discarded`) with per-item undo/retry, currently used by the AI add flows.
- `add-book-by-shelf.tsx` (#21b) — the closest structural analog: capture → analyze-all-with-progress → per-item review (include/exclude) → save.

None of these are changing. This design is entirely about the new orchestration layer on top: CSV → parsed rows → mapped/filtered rows → enriched+deduped rows → reviewed rows → intake + reading-event calls → the existing summary screen.

## Goals / Non-Goals

**Goals:**

- Import finished readings from a Goodreads or StoryGraph CSV export into `Book` (+ optional `Copy`) + `ReadingEvent(status: "finished")`.
- Reuse #13/#16/#14/#22 exactly as they are — this change adds a caller, not new capability to those services.
- Never silently guess: format detection pre-fills the column mapping, it doesn't skip showing it; duplicate matches are surfaced, never silently merged without a visible signal.

**Non-Goals:**

- A generic "any CSV" importer with free-form column mapping for arbitrary schemas — only Goodreads and StoryGraph's known export shapes are detected/supported.
- Importing `currently-reading`, `to-read`, or `did-not-finish` rows — decided during exploration; those statuses don't map to anything in this app's model (no wishlist concept).
- Any new bulk/batch Firestore write path — rows are persisted sequentially through the existing one-at-a-time endpoints, same as `add-book-by-shelf`.
- Automated/ongoing sync with Goodreads — that's ADR-0005 territory (export + manual link) and stays out of scope; this is a one-time bootstrap.

## Decisions

**D1 — Use a small CSV-parsing dependency, not a hand-rolled parser.**
The export direction (`eventsToCsv`) is hand-rolled because it only serializes values the app already controls. Parsing is the opposite: untrusted, real-world files with embedded newlines inside reviews, escaped quotes, CRLF vs LF, and a UTF-8 BOM some exporters add. Hand-rolling a correct RFC 4180 parser for arbitrary input is a meaningfully bigger and riskier surface than the writer was. Pull in a small, well-tested parser (e.g. `papaparse`) for the read direction; keep the existing hand-rolled writer as-is. Alternative considered: hand-roll to stay dependency-free, matching #31/#34's precedent — rejected because those cases fully controlled their input; this one doesn't.

**D2 — Detect format by header signature; always show the mapping screen.**
Goodreads and StoryGraph exports have fixed, known header sets. On upload, compare the parsed header row against both known signatures and pick the closer match (or neither, if it looks like something else). The mapping screen always renders — with the detected format's default mapping pre-selected when a match is found, or blank selects when it isn't — so a misdetection is caught by the reader looking at the screen, not by a silent wrong guess.

**D3 — Filter to finished rows using the mapped status column, before enrichment.**
Once the reader confirms the mapping, rows are filtered immediately: only rows whose mapped status column matches a "finished" literal for the detected format (Goodreads `Exclusive Shelf = "read"`; StoryGraph `Read Status = "read"`) proceed. Everything else (`currently-reading`, `to-read`, `did-not-finish`, and unrecognized values) is dropped before enrichment — this both matches the scope decision and avoids wasting enrichment API calls on rows that will never be imported.

**D4 — Enrich and dedupe every surviving row upfront, sequentially, with a progress indicator.**
Same shape as `add-book-by-shelf`'s "analyzing" phase — and, on inspecting that code directly, its processing loop is a plain sequential `for` loop (`await processBook(...)` one at a time, updating `progress` after each), not a concurrent worker pool. This change follows the same precedent exactly rather than introducing a new concurrency pattern: run `enrichByIsbn` (falling back to `searchByText` when a row has no ISBN) and `findBookDuplicates` for every row, one row at a time, before showing the review list. Simpler to implement and test, and the enrichment cache already absorbs repeated ISBNs across an import. _(Revises the original draft, which proposed a bounded-concurrency worker pool before the existing pattern was inspected.)_

**D5 — Row action defaults by duplicate tier, matching #16's existing semantics.**
`findBookDuplicates`'s `Recommendation` already encodes intent; the review list's default action per row follows it directly rather than inventing new rules:

| Recommendation                                                                                                                                                        | Default row action                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `add-new` (no match)                                                                                                                                                  | Create a new `Book` via intake                                                                                                                                                                                      |
| `add-copy` (exact ISBN match)                                                                                                                                         | Attach to the existing `Book` — skip intake's book-creation, optionally add a `Copy`                                                                                                                                |
| `add-new-edition` (strong match, both have ISBNs)                                                                                                                     | Create a new `Book` (it's a distinct edition)                                                                                                                                                                       |
| `review` (ambiguous strong match)                                                                                                                                     | Create a new `Book` by default — merging into a possibly-wrong existing book silently would be worse than an occasional duplicate; the badge lets the reader manually switch to "use existing" if they recognize it |
| This is a visible per-row default, not a blocking decision — the reader can override any row before confirming, same as toggling include/exclude or physical/digital. |

**D6 — Two persistence paths per row, chosen by the resolved duplicate action.**
`POST /api/books/intake` always creates a _new_ `Book`; it has no "attach to existing" mode. So:

- **New book** (`add-new` / `add-new-edition`, or a `review` row left at its default): call intake with `book` + `copy` (copy included only when the row is marked physical) → get back `bookId` → `POST /api/reading-events` with that `bookId`, the chosen reader, `status: "finished"`, and the mapped rating/review/date.
- **Existing book** (`add-copy`, or any row switched to "use existing"): skip intake's book-creation; if the row is physical, `POST /api/copies` against the matched `bookId`; then `POST /api/reading-events` against that same `bookId`.
  Both paths end at the same `POST /api/reading-events` call. Rows process sequentially (not `Promise.all`) so two rows that would resolve to "the same new book" within one import don't race each other into duplicate `Book` docs.

**D7 — Reader attribution defaults to the active session reader, no separate picker step.**
The CSV has no reader column (a Goodreads/StoryGraph export is single-account), so the import needs exactly one `readerId` for the whole run — but on inspecting how every other write in the app attributes a reading (`confirm-reading-sheet.tsx`'s `readerId: reader.id`, from `useAuth()`), none of them show an explicit reader-picker; they attribute directly to the signed-in session reader. `ReaderPicker` exists in the codebase (`components/readers/reader-picker.tsx`) but is wired into zero production write flows today — only a style-guide showcase. Introducing it here would make this import the one flow in the app that asks "who is this for?" when nothing else does, which is inconsistent rather than reused. The wizard uses `useAuth().reader.id` directly, exactly like every other write path, with no separate step. _(Revises the original draft, which assumed a picker step was needed before checking how reader attribution actually works elsewhere in the app.)_

**D8 — Confirm/summary screen reuses `ImportOutcome` and `import-summary-view.tsx` as-is.**
Its existing buckets (`added / added_as_copy / skipped_duplicate / failed / discarded`) already cover this flow's outcomes almost exactly (`discarded` = rows the reader excluded in review; `use-existing` rows map to `added_as_copy` regardless of whether a `Copy` was actually created, since a digital "use existing" row still means "matched to your existing library" — reusing the bucket rather than adding a new result value for one edge case; `skipped_duplicate` doesn't fire here since duplicates are merged rather than skipped, but the type stays compatible). Per-item undo/retry comes for free, with one known gap: `ImportSummary`'s retry always re-POSTs to `/api/books/intake` — correct for a failed create-new row, but unsafe for the narrow window where intake succeeds and the _following_ reading-event call fails (retrying would create a second book). That specific case is reported as failed with no `retry` rather than reusing the button unsafely.

**D9 — Normalize Goodreads' `="..."` ISBN escaping during column mapping, not enrichment.**
Goodreads wraps `ISBN`/`ISBN13` values as `="9780307474728"` to stop spreadsheet apps from mangling leading zeros. Strip that wrapper as part of applying the confirmed column mapping (before any row reaches enrichment), so `enrichByIsbn` always receives a clean ISBN string.

## Risks / Trade-offs

- **[Risk]** Large exports (300+ rows) make the upfront enrich+dedupe pass slow and could trip external rate limits. → **Mitigation:** bounded concurrency (D4), existing enrichment cache absorbs repeated ISBNs, visible progress so it doesn't read as hung. No hard row-count cap for now — worth watching in QA with a real large export.
- **[Risk]** Sequential per-row persistence (D6) means a mid-import network failure leaves a partially-imported batch. → **Mitigation:** this is exactly what the reused summary screen's `failed` bucket + retry (D8) already handles — nothing is silently lost, the reader sees precisely which rows didn't make it and can retry them.
- **[Risk]** A new parsing dependency (D1) is a real addition, unlike this project's usual "no library for something this small" default. → **Mitigation:** scoped tightly to parsing only (the writer stays hand-rolled); a small, widely-used, dependency-free-of-its-own library keeps the addition low-risk.
- **[Risk]** `review`-tier duplicates defaulting to "create new" (D5) means an ambiguous match that _is_ actually the same book creates a real duplicate unless the reader catches the badge. → **Mitigation:** accepted trade-off — silently merging into a possibly-wrong book is worse than an occasional reader-catchable duplicate; the badge is visible on every such row, not buried.

## Migration Plan

None — purely additive (new route, new components, no schema changes to existing entities). No feature-flagging needed; a normal PR revert is sufficient rollback.

## Open Questions

- Whether a soft warning ("this will take a while") should appear above some row-count threshold — nice-to-have, not blocking.
- Whether the `review`-tier badge should be visually distinct (stronger warning color) from `add-copy`/`add-new-edition` badges — a copy/visual-design detail for the Claude Design handoff prompt, not an architectural one.
