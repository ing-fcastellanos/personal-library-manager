## Why

Setting up the library by hand is the biggest barrier to actually using this app day one. Most readers already have years of reading history in Goodreads or StoryGraph; letting them bootstrap from an export gets the catalog and reading log populated in minutes instead of book-by-book manual entry (#35).

## What Changes

- A CSV import wizard, added as a 5th mode in the existing `/agregar` mode-switcher, that accepts a Goodreads or StoryGraph export.
- Format auto-detection by header signature, with a column-mapping screen pre-filled from the detected format and editable by the reader.
- Only rows with a **finished** reading status import (Goodreads "read" shelf / StoryGraph "read" status); `currently-reading`, `to-read`, and `did-not-finish` rows are dropped before the row count reaches the reader.
- Reuses `enrichByIsbn` (M2/#13) to fill in book metadata for every surviving row, running upfront with a progress indicator before the review step.
- Reuses `findBookDuplicates` (#16) to flag likely-duplicate rows inline (a badge, not a blocking modal) in the review list.
- A per-row review list (structurally modeled on `add-book-by-shelf.tsx`'s per-item results): include/exclude toggle, physical-vs-digital choice (controls whether a `Copy` is created alongside the `Book`), and the duplicate badge.
- Every imported `ReadingEvent` is attributed to the active signed-in reader (no separate reader-picker step — consistent with how every other reading gets attributed in this app).
- A confirm step that saves everything and shows a summary (reusing the shape of `import-summary-view.tsx`'s outcome grouping: added / added as copy / skipped duplicate / failed).

## Capabilities

### New Capabilities

- `csv-import`: uploading a Goodreads/StoryGraph CSV export, mapping its columns, filtering to finished readings, enriching and de-duplicating each row, and confirming a bulk creation of `Book`/`Copy`/`ReadingEvent` records attributed to a chosen reader.

### Modified Capabilities

(none — this change is a new consumer of the existing `catalog-duplicates` and `catalog-enrichment` capabilities; it does not change their requirements)

## Impact

- New mode in `app/agregar/page.tsx`'s existing mode-switcher for the import wizard (no new route — matches how every other add flow already works).
- New CSV-parsing code (no parsing library exists in the repo today — `components/reading/goodreads.ts` only serializes CSV, it doesn't parse it).
- New service-layer code to map parsed rows to `Book`/`Copy`/`ReadingEvent` creation calls, reusing `services/books`, `services/copies`, `services/reading-events`, `services/duplicates`, and `services/enrichment` — no changes to those services themselves.
- No new backend endpoints beyond what bulk-creating via the existing one-at-a-time repository functions requires (no Firestore batch-write API is introduced; each row is created sequentially, matching the existing `add-book-by-shelf` pattern).
