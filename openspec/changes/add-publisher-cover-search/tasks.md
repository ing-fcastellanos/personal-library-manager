## 1. Enrichment: field-restricted Google Books query

- [x] 1.1 Add a `fieldRestrictedQuery({ title, author, publisher })` builder in
      `services/enrichment/google-books.ts` (quotes each given part, escapes embedded `"`,
      omits absent parts) and a `googleBooksSearchByPublisher(title, authors, publisher, options?)`
      function that calls `fetchVolumes` with it and normalizes every returned volume (not just
      the first) into `Candidate[]`, reusing the existing `GoogleBooksRateLimitError` path
      unchanged. Verify with unit tests in `services/enrichment/google-books.test.ts` covering:
      query string shape for title+author+publisher, `"` in a publisher value is escaped rather
      than breaking the query, and a 429 is retried the same way as the existing ISBN/search
      paths.
- [x] 1.2 Add `searchCoverByPublisher(title, authors, publisher, options?)` in
      `services/enrichment/service.ts` that calls the new Google Books function, ranks/truncates
      to 5 results (reuse `rank.ts` if it fits, or a simple year-desc/relevance sort otherwise),
      and builds each candidate's caption as `` `${year} · ${publisher}` `` (year omitted if
      unknown, publisher omitted if unknown — never fabricate a "tapa blanda"-style format
      segment per design.md). Verify with a unit test in `services/enrichment/service.test.ts`
      covering: multiple candidates ranked and capped at 5, an empty result set (not a thrown
      error) when nothing matches, and correct caption formatting including the missing-year and
      missing-publisher edge cases.

## 2. API route

- [x] 2.1 Add `GET /api/enrich/cover-by-publisher` in `server/routes/enrich.ts`: validates
      `title` and `publisher` are present (`400` otherwise), `authors` is optional/repeatable,
      calls `searchCoverByPublisher`, responds `200` with `{ candidates: [...] }` (empty array
      when nothing matches — never `404`). Verify with a route test (mirroring the existing
      `enrich.test.ts` pattern) covering: `400` on missing `title`/`publisher`, `200` with a
      populated list, `200` with an empty list on no matches, and that a `GoogleBooksRateLimitError`
      surfaces as the same degraded/retry behavior the existing `/api/enrich` route already has.

## 3. Shared search hook

- [x] 3.1 Add `components/books/use-publisher-cover-search.ts`: given a `(publisher, title,
    authors)` tuple, debounces publisher changes 500ms, calls
      `GET /api/enrich/cover-by-publisher`, and exposes `{ phase, options, selectedId, pick(id),
    reset() }` per design.md's phase state machine (`idle | searching | multi | single | none`).
      Discards a response that no longer matches the current debounced publisher value (stale-
      request guard). Verify with a unit test (fake timers + a mocked fetch) covering: debounce
      timing, phase transitions for 0/1/many results, a stale response arriving after a newer
      request is ignored, and `pick(id)` moving phase to `single`-equivalent applied state.

## 4. Presentational widget

- [x] 4.1 Add `components/books/publisher-cover-search.tsx` implementing the
      `PublisherCoverSearchProps` contract from design.md (publisher input, phase-driven
      searching/multi/single/none states, horizontal cover picker, "Listo" to collapse/reset),
      porting layout, copy (Spanish), and states directly from the handed-off
      `Editorial Cover Panel.dc.html` — reuse existing primitives (`Input`, `Label`, `Button`)
      and the app's icon set (lucide-react) rather than the mockup's raw inline SVG/CSS. Verify
      by rendering each phase in isolation (component test or a quick manual pass in the running
      app) and confirming it matches the prototype's states, in both light and dark mode.

## 5. Wire into shelf-capture auto bucket

- [x] 5.1 In `components/books/add-book-by-shelf.tsx`, add per-row expand state (only one row
      expanded at a time), a pencil icon-button on each auto-bucket row (shrinking that row's
      three icon buttons from 36px to 32px per design.md), and render
      `PublisherCoverSearch`/`use-publisher-cover-search` inline (accordion-style) when a row is
      expanded. On a resolved cover (single-match or picked), update that row's
      `ProcessedBook.best` (publisher + coverUrl) in place so unchanged downstream intake logic
      picks it up. Verify with a unit/component test covering: only one row expands at a time,
      the icon size changes only while a pencil button is present, and a resolved cover updates
      the row's `best` candidate without touching other rows.
- [x] 5.2 Confirm end-to-end that a corrected row's publisher/cover survives into
      `POST /api/books/intake` unchanged from today's payload shape (no new fields needed per
      design.md) — verify with an existing or extended intake-path test asserting the corrected
      `coverSourceUrl`/publisher reach the created `Book`.

## 6. Wire into Edit Book form

- [x] 6.1 In `components/books/book-fields.tsx`, attach `PublisherCoverSearch` directly under the
      Editorial input (`showHeader={false}`, always visible, no accordion) and thread a resolved
      cover into the form's existing cover state the same way `CoverField`'s "Usar portada de
      Google" path does today, respecting `coverSource` handling described in the `catalog-edit`
      spec delta (applied cover is unsaved until the reader saves the form). Verify with a
      component test covering: editing Editorial triggers the search, picking/auto-applying a
      cover updates the form's in-memory cover value, and nothing is persisted before Save.

## 7. Manual QA

- [x] 7.1 Run the app locally (per this project's `run` skill/dev server) and manually exercise
      both surfaces: a shelf capture with a wrong publisher (single-match and multi-match real
      publishers, and one obscure enough to hit the no-results state), and the Edit Book form's
      Editorial field the same way. Confirm mobile-width layout, 36px→32px icon shrink, light and
      dark mode, and that a no-results search never alters the existing cover.
