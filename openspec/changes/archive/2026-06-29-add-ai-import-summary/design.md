## Context

The M3 AI add flows are built: #20 (single photo → `/api/ai/identify` → confirm →
intake, then navigates to the book) and #21 (shelf batch → process → auto preview +
review queue + duplicates, ending in a bare "X agregados · Y saltados"). #22 unifies
their endings into one rich, session-persisted summary.

Settled in exploration:

1. **Persistence = `sessionStorage`** (survives navigation/reload within the session),
   not a Firestore import-history.
2. **Undo is per-item** while the summary is visible; no "undo all".
3. **Both #20 and #21** route through the shared summary.
4. **Failed intakes retain the candidate** so they can be retried.

A constraint found while grounding: `DELETE /api/books/:id` returns `409` when the book
still has a copy or reading events (#12 D3). Intake creates a book **and** a copy, so
undoing an added book means deleting the copy first, then the book — hence both ids are
retained per added outcome.

## Goals / Non-Goals

**Goals:**

- A shared `ImportOutcome` model + `<ImportSummary>` grouping results into added / added
  as copy / skipped-duplicate / discarded / failed.
- Per-item actions: edit + undo (added), undo (copy), retry (failed).
- Session persistence via `sessionStorage` + a `/agregar/resumen` route.
- Both AI add flows emit outcomes and land on the summary.
- Pure grouping/persistence helpers unit-tested; the summary tested in jsdom.

**Non-Goals:**

- No Firestore import history / permanent log (revisit later if wanted).
- No new HTTP endpoints or schema changes.
- No "undo all"; no Storage cover cleanup on undo.
- No changes to how books are identified/enriched/saved (only the ending).

## Decisions

### D1 — `ImportOutcome` model

```
type ImportResult =
  | "added" | "added_as_copy" | "skipped_duplicate" | "discarded" | "failed";

interface ImportOutcome {
  title: string;
  coverUrl?: string | null;
  result: ImportResult;
  bookId?: string;   // added → edit + (with copyId) undo
  copyId?: string;   // added / added_as_copy → undo
  retry?: { book: BookData; coverSourceUrl: string | null }; // failed → re-intake
}
```

Pure helpers in `import-summary.ts`: `groupOutcomes(list)` → counts + per-group arrays;
`saveImport(list)` / `loadImport()` over `sessionStorage` (key `plm:lastImport`).

### D2 — Render at `/agregar/resumen`, fed by `sessionStorage`

The add flows write `saveImport(outcomes)` and `router.push("/agregar/resumen")`. The
route reads `loadImport()` on mount into state. Rationale: a route (not an in-flow
phase) makes the summary survive a reload and a round-trip to edit a book; the
sessionStorage read re-hydrates it. An empty/absent import shows a gentle "nada que
mostrar" with a link back to "Agregar".

### D3 — Undo

- **added** → `DELETE /api/copies/:copyId` then `DELETE /api/books/:bookId` (order matters
  per the 409 rule). On success, mark the item undone (struck/removed) and decrement the
  group count.
- **added_as_copy** → `DELETE /api/copies/:copyId` (the existing book stays).
- Undone state is reflected in `sessionStorage` too, so a reload doesn't resurrect it.
- Orphaned cover files are accepted (no Storage delete from the client).

### D4 — Retry failed

A `failed` outcome keeps `retry = { book, coverSourceUrl }`. "Reintentar" re-calls
`POST /api/books/intake`; on success the item flips to `added` (capturing the new
book/copy ids) and moves to that group; on failure it stays `failed`.

### D5 — Flow wiring

- **#21 (shelf)**: the flow already tracks per-book results — map them to outcomes:
  auto/review intake success → `added`; "agregar como copia" → `added_as_copy`; "saltar
  duplicados" → `skipped_duplicate`; review discard → `discarded`; intake failure (today
  silently dropped) → `failed` with the candidate. Replace the `DoneView` with
  `saveImport(...) + router.push("/agregar/resumen")`.
- **#20 (single)**: the one saved book → one `added` outcome (or `added_as_copy` on the
  dup→copy path, or `failed`); navigate to the summary instead of straight to the book.
- The `intake` calls must capture `{ book, copy }` ids (the route already returns them).

### D6 — Shared, pure, testable

The model + grouping + sessionStorage helpers are pure and unit-tested. `<ImportSummary>`
takes outcomes + action callbacks (so it is testable with mocked fetch). The route is a
thin shell wiring `loadImport()` + the undo/retry fetches.

## Risks / Trade-offs

- **Undo order (copy → book)** → enforced in the undo helper; a failed copy-delete aborts
  the book-delete and surfaces a toast, leaving the item intact.
- **sessionStorage is per-tab and cleared on close** → acceptable per decision 1; the
  summary is a session artifact, not history.
- **Stale ids after manual edits/deletes elsewhere** → undo/retry are best-effort; a
  404/409 surfaces a toast and the item is left as-is.
- **#20 losing its direct "go to book"** → the summary's per-item "edit"/title links to the
  book, so the destination is one tap away; net better (adds undo).
- **Orphan covers on undo** → accepted; a future Storage cleanup is out of scope.

## Migration Plan

Additive UI: a model module, a component, a route, and wiring in the two add flows. No
server/schema/data changes. Rollback = revert the flow endings to their previous
navigation. No keys needed beyond what the add flows already require.

## Open Questions

- Whether `discarded` items deserve an "add anyway" action (kept informational for now).
- Whether to badge the summary with the engine used (`sourceProvider`) — nice-to-have,
  deferred.
