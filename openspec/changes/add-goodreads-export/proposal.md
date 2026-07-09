## Why

Goodreads' write API has been effectively dead since 2020 (ADR-0005) — there's no supported way to publish a reading automatically. The app is the source of truth for the reading log; this change adds the two pieces ADR-0005 already commits to: a Goodreads/StoryGraph-compatible CSV export, and manual-publish links (per reading, and per book) that open a Goodreads search so the reader finishes the job themselves.

## What Changes

- A CSV export, added as a third action alongside Registrar/Historial on `/leido`, reusing the existing history fetch + `filterEvents`/`HistoryFilters` (by reader, by date range) — no new data fetching.
- Columns compatible with Goodreads/StoryGraph's own CSV import (Title, Author, ISBN, My Rating, My Review, Date Read).
- A "Pendiente de publicar" toggle per reading (manual, boolean) — shown both in the history timeline and on the export screen — backed by a new field on `ReadingEvent`.
- A "Publicar en Goodreads" link per reading in the history, and a "Ver en Goodreads" button on the book detail page — both open `https://www.goodreads.com/search?q=<isbn or title>`. The per-reading publish link only shows when the active reader has a `goodreadsUrl` configured (M1); the book-detail button has no such gate (it's a lookup, not a publish action).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `reading-log`: adds CSV export, the "pendiente de publicar" flag + toggle, and the two Goodreads-search links (history row + book detail).

## Impact

- `lib/types/reading-event.ts`: new `publishPending` (or similar) boolean field, default `false`; `readingEventUpdateSchema` gains it.
- `components/reading/reading-history.tsx`: new toggle per row; reuses existing filter state for the export screen.
- New export view/tab under `/leido` (exact component TBD in design.md).
- `components/catalog/book-detail.tsx`: new "Ver en Goodreads" button.
- A small shared `goodreadsSearchUrl(isbn, title)` helper, reused by both links.
- No new dependencies — CSV generation and download are plain client-side string-building + a Blob, matching the project's lean pattern (no CSV library).
