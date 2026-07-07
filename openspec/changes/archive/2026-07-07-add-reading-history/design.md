## Context

#24 records finished readings and #25 adds rating/review + a dual-mode
`ConfirmReadingSheet` (create/edit). What's missing is a way to _see_ readings over
time. The `ReadingEvent` model carries a denormalized book snapshot (`bookTitle`,
`bookAuthors`, `isbn13`, `coverUrl`) specifically so history renders without joins
(model comment cites #26), and the listing endpoints already return events
newest-first:

- `GET /reading-events` — all events (global timeline).
- `GET /books/:bookId/reading-events` — one book's readings (per-book history).
- `GET /readers/:readerId/reading-events` — one reader's readings (not needed if we
  filter the global list client-side).

`/leido` today renders `MarkAsRead` behind an auth gate; the "Leído" nav item points
there. `StarRating` (read-only) and the dual-mode edit sheet already exist.

## Goals / Non-Goals

**Goals:**

- A **Historial** tab on `/leido` beside **Registrar**, showing a global,
  newest-first timeline fed by `GET /reading-events`.
- Client-side filters: reader, rating, date range — combined (AND).
- A per-book **Historial** section on the book detail (all readings of the book).
- Edit an own entry from the timeline via the existing edit sheet.

**Non-Goals:**

- Aggregate stats / KPIs / charts → M5 (this is the raw, browsable history).
- CSV / Goodreads → M7.
- Server-side filtering or pagination (data is small; client-side over the loaded list).
- Backend changes (endpoints already return snapshot data newest-first).

## Decisions

- **`/leido` becomes tabbed: Registrar | Historial (Decision 1 → A).** A tab
  switch at the top of the signed-in view; Registrar keeps `MarkAsRead`, Historial
  renders the new timeline. Keeps the 5-item shell intact and makes "Leído" the
  home for finished-reading concerns. _Alternative:_ a new `/historial` route +
  nav item — rejected (breaks the fixed 5-item nav).

- **Global timeline from `GET /reading-events` (Decision, snapshot).** Render cards
  straight from the denormalized events — no per-book/reader fetches, no joins.
  _Alternative:_ compose per-reader endpoints — rejected; the global list is exactly
  what the snapshot was designed for.

- **Client-side filters (Decision 2).** Reader (select/chips of known readers),
  rating (exact 1–5 or "con reseña"?), and a date range over `dateFinished`
  (falling back to `createdAt`). Pure filter helpers in `history.ts` keep it
  unit-testable. _Alternative:_ query params to the API — rejected; unnecessary for
  the data size and adds backend surface.

- **Keep the per-reader summary, add a per-book history (Decision 3).** The book
  detail's "Lectura" section (latest per reader + #25 edit) stays; a new "Historial"
  section below lists _all_ of the book's events. _Alternative:_ replace the summary
  with the full list — rejected; the summary is the at-a-glance state, history is the
  log.

- **Reuse the dual-mode sheet for timeline edits (Decision 6).** An own entry's
  "Editar" opens `ConfirmReadingSheet` in `edit` mode with that event; on save the
  timeline updates optimistically (replace by id). _Alternative:_ a separate edit —
  rejected; the sheet already does this.

- **Event card is a shared component.** `reading-event-card.tsx` renders one event
  (cover/title/authors, reader, status/`StarRating` read-only, date, review) and is
  reused by the global timeline and the per-book history, with an optional edit
  affordance when the entry belongs to the active reader.

## Risks / Trade-offs

- **Global list growth** → For a personal library the event count is small;
  client-side load/filter is fine. If it ever grows, add server paging (out of
  scope now) — `log()` nothing is truncated today because we load all.
- **Date basis ambiguity** → Timeline orders by the endpoint's `createdAt desc`;
  the date _shown_ and the date-range _filter_ use `dateFinished` when present,
  falling back to `createdAt`, so undated events still appear.
- **Edit visibility** → Only entries whose `readerId === useAuth().reader?.id` get
  an edit control; everything else is read-only, consistent with #25.
- **Duplicate rendering vs. book detail** → The event card is shared so the global
  timeline and per-book history stay visually consistent.

## Migration Plan

Additive UI. `/leido` gains a tab switch; new timeline/card/filter components;
the book detail gains a history section. No data migration; pre-existing events
render from their snapshot. Ships on `feat/reading-history` → PR → deploy.

## Open Questions

- Exact rating filter shape (exact value vs. "≥ N" vs. "con reseña") — resolve
  against the Claude Design handoff.
- Whether the date filter is a preset set ("este año", "2025", custom) or a raw
  range — decide during design; the helper can support a range either way.
