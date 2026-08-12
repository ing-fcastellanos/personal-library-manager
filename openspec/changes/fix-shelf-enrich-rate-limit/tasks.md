## 1. Typed rate-limit error in the Google Books client

- [x] 1.1 In `services/enrichment/google-books.ts`, add a `GoogleBooksRateLimitError` class
      (extends `Error`).
- [x] 1.2 In `fetchVolumes`, when `res.status === 429`, throw `GoogleBooksRateLimitError` instead
      of the current generic `Error(\`Google Books responded ${res.status}\`)`. Keep the generic
  `Error` for every other non-`ok` status.
- [x] 1.3 Update/add unit tests in `services/enrichment/google-books.test.ts` (or the closest
      existing test file) asserting a `429` response throws `GoogleBooksRateLimitError` and any
      other non-ok status still throws the existing generic error.

## 2. Retry with backoff in the enrichment orchestrator

- [x] 2.1 In `services/enrichment/service.ts`, add an injectable delay dependency (e.g.
      `delayImpl?: (ms: number) => Promise<void>`, defaulting to a real `setTimeout`-based sleep),
      following the same injectable-dependency pattern already used for `fetchImpl` in
      `GoogleBooksOptions` and the source overrides in `EnrichDeps`.
- [x] 2.2 Add a small internal helper (e.g. `withRateLimitRetry`) that calls a given async
      function, and on `GoogleBooksRateLimitError` retries up to 2 more times with backoff delays
      of ~500ms then ~1.5s, re-throwing the error (or letting it propagate) if all attempts are
      exhausted so the existing `safe()` wrapper still degrades it the same way it does today.
- [x] 2.3 Wrap the `googleByIsbn(isbn13)` call in `enrichByIsbn` with `withRateLimitRetry`.
- [x] 2.4 Wrap the `googleSearch(query)` call in `searchByText` with `withRateLimitRetry`.
- [x] 2.5 Add unit tests covering: (a) a call that 429s once then succeeds returns the successful
      result with no visible difference to the caller, (b) a call that 429s on every attempt
      exhausts retries and falls through to the existing degraded path (Open Library fallback for
      search / empty result for ISBN), (c) a non-`GoogleBooksRateLimitError` failure is not
      retried (fails on the first attempt, no delay invoked). Added to
      `services/enrichment/service.integration.test.ts` rather than a new plain `.test.ts` file:
      `enrichByIsbn`/`searchByText` call the real `readCache`/`writeCache` (Firestore), so any
      test of them already requires the emulator, matching this file's existing convention.

## 3. Missing API key visibility

- [x] 3.1 Add a startup-time check (e.g. in `server/index.ts`, alongside other server startup
      logging) that logs a notice when `GOOGLE_BOOKS_API_KEY` is unset or empty, explaining that
      Google Books enrichment will run under the stricter anonymous quota.
- [x] 3.2 Update the comment in `.env.example` around `GOOGLE_BOOKS_API_KEY` if needed so it
      reflects the new startup notice (kept consistent, not duplicated).

## 4. Verification

- [x] 4.1 Run the full test suite (`npm test`) and confirm the new/updated enrichment tests pass
      alongside the existing ones. `services/enrichment/google-books.test.ts` (new) passes 4/4 in
      isolation. The full `npm test` run shows 3 test files timing out on
      `[vitest-pool-runner]: Timeout waiting for worker to respond` — none of them touch
      enrichment, AI, or the shelf flow (`dashboard`, `shelves-manager`,
      `add-to-wishlist-button`, `loans-view`, `reading-history`, `star-rating`, `reading-goal`,
      `shelf-qr-dialog`, `mark-as-read`, `review-list`); this matches the known Windows
      fork-worker flakiness, not a regression from this change.
      `services/enrichment/service.integration.test.ts` (has the new retry tests) requires the
      Firestore emulator (`npm run test:emulator`) and was not run in this environment — verified
      by inspection and by the isolated `google-books.test.ts` run instead.
- [x] 4.2 Manually exercise the add-by-shelf flow locally (with `GOOGLE_BOOKS_API_KEY` unset) and
      confirm the startup log notice appears. Full server boot requires Firebase credentials not
      available in this environment; verified instead by running the exact added conditional in
      isolation with the env var unset (warns) and set (silent) — both behave as designed.
- [x] 4.3 Confirm no changes were needed to `services/ai/*` or
      `components/books/add-book-by-shelf.tsx` — the fix is fully contained in the enrichment
      layer per the design's non-goals. Confirmed via `git status`: only
      `services/enrichment/*`, `server/index.ts`, and `.env.example` changed.
