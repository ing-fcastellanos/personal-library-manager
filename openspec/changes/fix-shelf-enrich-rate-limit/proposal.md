## Why

Add-by-shelf identifies a full shelf in one AI call, then enriches every identified book
individually against Google Books (`GET /api/enrich`, 1-2 calls per book, fired back-to-back in
`processBook`'s sequential loop). A shelf of a dozen-plus books can trigger 20-30 Google Books
requests within seconds. Without `GOOGLE_BOOKS_API_KEY` configured, those requests hit Google's
anonymous quota, which is undocumented in exact numbers but confirmed strict (Google's own docs
now say public requests "must be accompanied by an identifier"). Today a 429 from that quota is
swallowed by `safe()` in `services/enrichment/service.ts` and is indistinguishable from a
genuine "book not found" — the book silently lands in the manual-review bucket, and the reader
has no idea it was actually a rate limit, not a bad AI read.

## What Changes

- `googleBooksSearch`/`googleBooksByIsbn` (`services/enrichment/google-books.ts`) throw a typed
  `GoogleBooksRateLimitError` on a `429` response instead of the current generic `Error`, so
  callers can tell "rate limited" apart from "no results" or other failures.
- `enrichByIsbn`/`searchByText` (`services/enrichment/service.ts`) retry a Google Books call that
  fails with `GoogleBooksRateLimitError` up to 2 additional times with exponential backoff
  (~500ms, 1.5s) before giving up and falling back the same way an exhausted/unavailable source
  already does today (cache the negative result, let Open Library fill in for search). No other
  failure type is retried.
- Document `GOOGLE_BOOKS_API_KEY` as the primary mitigation: confirm the key is honored end to
  end (it already is, in the URL-building code) and make its absence visible — a startup log line
  and/or `.env.example` note — since running the shelf-import batch flow without it is what makes
  the retries necessary in the first place.
- No UI changes: the existing per-book progress bar in `add-book-by-shelf.tsx` already reflects
  the slower pace during a retry; no new messaging is added.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `catalog-enrichment`: Google Books failures are no longer uniformly opaque — a `429` is
  retried with backoff before degrading, instead of being treated identically to "not found" or
  any other error on the first attempt.

## Impact

- `services/enrichment/google-books.ts`: distinguish HTTP 429 and throw a typed error instead of
  a generic one.
- `services/enrichment/service.ts`: add bounded retry-with-backoff around Google Books calls in
  `enrichByIsbn` and `searchByText`, scoped to the new rate-limit error type only.
- `.env.example` / startup logging: make the missing-`GOOGLE_BOOKS_API_KEY` degraded state
  explicit rather than silent.
- No changes to `services/ai/*` (Gemini/OpenAI shelf identification) — confirmed not the source
  of the bursts.
- No changes to `components/books/add-book-by-shelf.tsx` — the sequential per-book loop and its
  progress bar are unchanged; the fix lives entirely in the enrichment layer it calls.
