## Why

In the "Por estante" AI flow (#21), a scanned book is enriched with a metadata
query that joins the AI-read **title + all authors**. When the AI is confident
about a spine (read-confidence ≥ 0.8) but misreads the author, the author-polluted
query returns zero candidates from Google Books and Open Library, so the book is
classified `no_match` and the reviewer sees only a blank manual form — no
recommendations — even when the real book is trivially findable by title alone.

## What Changes

- Add a **title-only enrichment fallback** to the shelf per-book processing: when
  the combined `title + authors` text search returns zero candidates (and there
  was no ISBN hit), retry enrichment with the **title only** and use those results
  as the book's `best` + alternatives.
- This turns many `no_match` outcomes into `low_confidence`, so the reviewer is
  offered the real book as a tappable recommendation ("¿Es alguno de estos?")
  instead of an empty form.
- Add a pure helper to build the title-only enrichment URL alongside the existing
  `shelfEnrichUrl`.
- No server change: enrichment stays generic (it only receives a flat `q`); the
  title/author split lives client-side where the structured fields exist.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `ai-shelf-add`: the shelf photo processing requirement gains a title-only
  enrichment retry when the author-included query yields nothing, before a book is
  classified `no_match`.

## Impact

- `components/books/shelf-add.ts` — new pure helper (e.g. `shelfEnrichTitleUrl`).
- `components/books/add-book-by-shelf.tsx` — `processBook` performs the fallback
  fetch when the first text search returns no candidates.
- Tests: `components/books/shelf-add.test.ts` (helper) and
  `components/books/add-book-by-shelf.test.tsx` (fallback path → `low_confidence`).
- No change to `server/`, the enrichment service, or the single-photo flow (#20),
  which uses `/api/ai/identify` directly.
