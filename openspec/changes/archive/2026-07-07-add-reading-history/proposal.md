## Why

Readings are now recorded (#24) with rating/review (#25), but there is no way to
_see_ them over time. #26 adds the **reading history**: a chronological view of
`ReadingEvent`s by book and by reader, supporting multiple readings of the same
book. It is the base the dashboard (M5) builds stats on. The backend already
exposes everything needed — `GET /reading-events` returns all events newest-first
with a denormalized book snapshot (title/authors/cover) precisely so history
needs no joins — so this change is UI only.

## What Changes

- **`/leido` gains two tabs**: **Registrar** (the existing mark-as-read flow,
  #24/#25) and **Historial** (new). The "Leído" nav section becomes the home for
  everything about finished readings.
- **Global timeline** under the Historial tab: all readings, newest-first, each
  card showing the book (cover/title/authors from the snapshot), the reader, the
  status/rating, the date, and a review snippet — fed by `GET /reading-events`.
- **Filters** (client-side over the fetched events): by **reader**, by **rating**,
  and by **date range**. Multiple readings of the same book by either reader are
  shown as distinct entries.
- **Per-book history on the book detail**: a "Historial" section listing _all_ of
  that book's readings (both readers, multiple readings), below the existing
  per-reader summary — fed by `GET /books/:id/reading-events`.
- **Edit from the timeline**: the active reader can edit their own event inline,
  reusing the #25 dual-mode `ConfirmReadingSheet` (edit → PATCH). Other readers'
  entries are read-only.
- **Out of scope (deferred):** aggregate stats / KPIs / charts (M5 — this only
  surfaces and filters the raw history); CSV export and Goodreads (M7).

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `reading-log`: extends the capability with a reading-history view — a global,
  filterable timeline of events and a per-book history on the detail — plus
  editing an event from the timeline. (Adds requirements; existing #24/#25
  requirements are unchanged.)

## Impact

- **Modified UI**: `app/leido/page.tsx` (Registrar | Historial tabs),
  `components/catalog/book-detail.tsx` (per-book "Historial" section).
- **New UI**: a reading-history timeline component + an event card + the filter
  controls (likely `components/reading/reading-history.tsx`, `reading-event-card.tsx`),
  and small pure filter helpers in `components/reading/history.ts`.
- **Reused (no change)**: `GET /reading-events`, `GET /books/:id/reading-events`
  (both already denormalized), `StarRating` (read-only), the dual-mode
  `ConfirmReadingSheet` (edit), `useAuth()`.
- **No backend changes**: listing endpoints already return the data newest-first
  with the snapshot; filtering is client-side.
- **Tests**: filter helpers; timeline render + filtering + empty/loading; per-book
  history on the detail; edit-from-timeline path.
