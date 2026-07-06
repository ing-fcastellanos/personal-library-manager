## Why

A reader can add books to the library but cannot yet record that they _finished
reading_ one. Registering a finished reading is the foundation of M4 (and later
the dashboard, CSV export, and Goodreads link) — without it there is no reading
history to build on. The backend already supports it (`ReadingEvent` model +
`POST /api/reading-events`); this change delivers the missing UI to create the
event, attributed to the active reader.

## What Changes

- New **"marcar como leído"** flow that lets the active reader record a finished
  reading, creating a `ReadingEvent` with `status: "finished"`.
- Two entry points into the flow:
  - **Dedicated flow** (`/leido`) where the reader **finds the book** first —
    by **searching the catalog** (reuses M2 `GET /api/catalog/search`) or by
    **identifying it from a photo** (reuses M3 `POST /api/ai/identify`).
  - **Book detail button**: activate the currently-disabled "Marcar como leído"
    button in `components/catalog/book-detail.tsx` (book already identified).
- Confirmation step captures the **finish date** (defaults to today, editable),
  optional **start date**, and the **copy** to attribute (when the book has
  physical copies) — then `POST /api/reading-events`.
- Attribution is to the **active reader** (`useAuth().reader`), per ADR-0013
  (explicit attribution in the request body).
- On success: confirmation feedback and the book's reading status reflects the
  new "Leído" state (book detail refreshes its per-reader status).
- **Out of scope (deferred):** rating + review capture and later editing (#25);
  reading history timeline and filters (#26). This change creates the event with
  date/copy/status only.

## Capabilities

### New Capabilities

- `reading-log`: recording a finished reading as a `ReadingEvent` attributed to
  the active reader — the entry flow (find book by search or photo), the
  confirmation (dates + copy), and creation via the existing API. Extended later
  by rating/review (#25) and history (#26).

### Modified Capabilities

<!-- None: the ReadingEvent model, POST/PATCH endpoints, catalog search, and AI
     identify all already exist as specified. This change only adds UI that
     composes them, so no existing spec's requirements change. -->

## Impact

- **New UI**: `/leido` route + page; a mark-as-read flow component (find →
  confirm → create); a confirmation sheet (dates + copy selector). New nav entry
  to reach `/leido`.
- **Modified UI**: `components/catalog/book-detail.tsx` — enable the "Marcar como
  leído" button and wire it to the confirmation sheet; refresh reading status on
  success.
- **Reused (no change)**: `POST /api/reading-events` (create), `useAuth()`
  (active reader), `GET /api/catalog/search` (M2), `POST /api/ai/identify` (M3),
  `GET /api/books/:id/copies` (copy selector), toast/bottom-sheet patterns.
- **No backend changes**: model, service, and routes already exist and validate.
- **Tests**: component tests for the flow + confirmation sheet (find → confirm →
  POST; date/copy handling; error + empty states), following the existing
  vitest + Testing Library conventions.
