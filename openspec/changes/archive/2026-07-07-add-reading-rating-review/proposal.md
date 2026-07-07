## Why

Marking a book as read (#24) records the fact of a finished reading but not what
the reader _thought_ of it. #25 lets the reader attach a **rating** and an
optional **review** to their reading — captured when marking, and editable later
— which also seeds the data for CSV export and the Goodreads link (M7). The
backend already supports it (`ReadingEvent.rating`/`review` + `PATCH
/api/reading-events/:id`); this change is UI only.

## What Changes

- **Capture at mark time**: the `ConfirmReadingSheet` (#24) gains an optional
  **rating** (1–5 stars) and an optional **review** (textarea). Both flow into the
  existing `POST /api/reading-events`.
- **Edit later**: the confirm sheet becomes **dual-mode** (`create` | `edit`). In
  `edit` mode it preloads an existing event's values and saves via `PATCH
/api/reading-events/:id` instead of creating a new one.
- **Display on book detail**: each reader's row in the "Lectura" section shows
  their rating (stars) and review; the **active reader** gets an **"Editar"**
  affordance that opens the sheet in `edit` mode for their latest event on the
  book. Other readers' ratings/reviews are read-only.
- **Star rating widget**: an accessible 1–5 star control (keyboard + `radiogroup`
  semantics), fixed integer scale.
- **Scope simplification**: rating scale is fixed at **1–5** (the model enforces
  it; no per-reader scale setting exists) — the issue's "configurable scale" is
  noted as a future concern, not built here.
- **Out of scope (deferred):** editing arbitrary past events / re-reads and the
  full reading history timeline (#26); CSV export and Goodreads linking (M7) —
  this change only ensures the data is captured.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `reading-log`: extends the finished-reading capability with optional
  rating/review capture at mark time, later editing of the active reader's latest
  event, and display of rating/review on the book detail. (Adds requirements; the
  existing #24 requirements are unchanged.)

## Impact

- **Modified UI**: `components/reading/confirm-reading-sheet.tsx` (star + review
  fields; `mode` prop; PATCH path), `components/reading/mark-read.ts` (payload
  helpers for rating/review + an update-body helper), `components/catalog/book-detail.tsx`
  (show rating/review per reader; "Editar" opens edit mode).
- **New UI**: a small accessible star-rating component (likely
  `components/reading/star-rating.tsx`).
- **Reused (no change)**: `POST /api/reading-events` (already accepts
  rating/review), `PATCH /api/reading-events/:id` (edit), `useAuth()` (active
  reader), the reading-events list on book detail.
- **No backend changes**: model, service, and routes already validate rating
  (1–5 int) and review.
- **Tests**: star-rating component; confirm sheet create-with-rating and
  edit-mode PATCH; book-detail display + edit entry; payload helpers.
