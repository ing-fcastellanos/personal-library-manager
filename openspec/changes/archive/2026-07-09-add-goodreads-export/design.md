## Context

ADR-0005 already settled the architecture: no write API, CSV export + manual publish links. `ReadingEvent`'s denormalized snapshot (`bookTitle`, `bookAuthors`, `isbn13`, `rating`, `review`, `dateFinished`) was built with this export in mind (its own doc comment says so) — the CSV needs no joins, no new fetch. `reading-history.tsx` already fetches all events + readers once and filters client-side via `filterEvents`/`HistoryFilters` (`readerId`, `from`, `to`, `rating`) — the export screen reuses that same data and filter shape (minus `rating`, which the issue doesn't ask for on export).

`PATCH /api/reading-events/:id` (→ `readingEventUpdateSchema`) already exists for editing rating/review after the fact — the new "pending to publish" flag rides the same endpoint, no new route.

## Goals / Non-Goals

**Goals:**

- Download a Goodreads/StoryGraph-importable CSV, filtered by reader and/or date range.
- A manual, per-reading "pendiente de publicar" toggle, visible in both the history timeline and the export screen.
- A "Publicar en Goodreads" link per reading (gated on the active reader having `goodreadsUrl` set) and a "Ver en Goodreads" button on the book detail page (ungated) — both a plain domain-wide search, not a per-account URL.

**Non-Goals:**

- Any actual publishing automation (ADR-0005 — explicitly rejected).
- A "mark as published" audit trail/history — this is a single manual boolean, not a log.
- Full backup/restore (that's #36, a separate change).
- Import (#35, separate change) — this change is export-only.

## Decisions

**Decision 1 — `publishPending: boolean`, default `false`, opt-in.**
"Marcado manual" reads as the reader flagging specific readings they intend to publish, not the system assuming everything needs publishing. A finished reading starts unflagged; the reader turns it on as a reminder and off once they've published it manually. Added to `readingEventSchema` and `readingEventUpdateSchema` (optional on update, like `rating`/`review`).

**Decision 2 — Hand-rolled CSV, no library.**
Five-ish columns (Title, Author, ISBN, My Rating, My Review, Date Read), generated client-side as a string and downloaded via `Blob` + a temporary `<a download>` — matches the project's existing lean pattern (no dependency for something this small). One shared `toCsvField(value)` helper handles RFC 4180 escaping (wrap in quotes if the value contains a comma, quote, or newline; double any internal quotes) — the only real correctness risk here (a comma in a title or a quote in a review must not corrupt the file).

**Decision 3 — Export is a third tab on `/leido`, not a new page.**
Matches the proposal's confirmed placement and the existing `ReadPage` tab pattern (`role="tablist"` + `TabButton`, currently Registrar/Historial). Reuses the same `events`/`readers` fetch already happening for Historial — no new data source.

**Decision 4 — Extract a small shared `ReadingFiltersBar` (reader + date range) from `reading-history.tsx`.**
The export tab needs the same reader-select + from/to date inputs Historial already has (minus the rating filter). This is real, non-trivial duplication (a dropdown + two date inputs, not three similar lines) — worth one small shared component over copy-pasting the JSX a second time. Takes `HistoryFilters` (a subset — `readerId`/`from`/`to`) and an `onChange`, no other coupling to either tab.

**Decision 5 — `goodreadsSearchUrl(isbn, title)` shared helper.**
`https://www.goodreads.com/search?q=<isbn or title>` — prefers ISBN when present (more precise), falls back to title. One function, two call sites (history row's "Publicar en Goodreads", book detail's "Ver en Goodreads"), mirroring `scan-url.ts`'s pattern from #31/#33 (one small URL-building helper, no shared component needed since the two buttons look different in context).

**Decision 6 — The publish-link gate only applies to the per-reading link, not the book-detail one.**
"Publicar en Goodreads" implies acting as a specific reader (their account) — gated on `activeReader.goodreadsUrl` being set, same spirit as other reader-attributed write actions (ADR-0006). "Ver en Goodreads" on the book detail is just a lookup, attributable to nobody — always available, no session or `goodreadsUrl` required.

## Risks / Trade-offs

- **[Risk] CSV special characters (commas, quotes, newlines in a review) corrupt the file if unescaped** → Mitigation: `toCsvField` handles RFC 4180 quoting; unit-tested directly against these cases.
- **[Risk] Very large exports (many events) build one big string in memory** → Mitigation: accepted — this app's realistic scale (a personal/household library) is nowhere near where in-memory string building becomes a problem.
- **[Risk] Goodreads' search UX for a title with common words can return many results, not the exact book** → Mitigation: accepted trade-off already implicit in ADR-0005 (manual publish, not automated); ISBN-first search minimizes this when available.

## Migration Plan

- `publishPending` is a new optional field — existing `ReadingEvent` documents without it read as `false`/unset (falsy), no backfill needed.
- No other data model changes; no rollback complexity beyond removing the new UI.

## Open Questions

None outstanding — scope and placement confirmed during exploration.
