## Why

The AI add flows end abruptly: single-photo (#20) jumps straight to the saved book,
and the shelf batch (#21) shows two bare counters ("X agregados · Y saltados"). #22
replaces both endings with one clear **import summary**: what was added, added as a
copy, skipped as a duplicate, discarded, or failed — with quick per-item actions
(edit, undo, retry) — and persists it for the session so it survives navigating away
to edit a book and coming back.

## What Changes

- Introduce a shared **`ImportOutcome`** model and an **`<ImportSummary>`** view that
  groups results into: **added**, **added as copy**, **skipped (duplicate)**,
  **discarded**, and **failed**, with counts and a per-item list.
- Per-item quick actions by result: **added** → edit + undo; **added as copy** → undo;
  **failed** → retry; skipped/discarded are informational.
- Persist the outcome list in **`sessionStorage`** and render the summary at a new
  route **`/agregar/resumen`**, so it survives a reload and a round-trip to
  `/libros/:id/editar`.
- Wire the AI add flows to emit `ImportOutcome[]` and navigate to the summary instead
  of their current endings: the shelf batch (#21) and the single photo add (#20).
- Claude Design handoff for the summary screen (groupings, per-item actions, empty
  states, mobile-first, accessible).

## Capabilities

### New Capabilities

- `ai-import-summary`: A shared end-of-import summary for the AI add flows — outcome
  categories with counts, a per-item list, per-item edit/undo/retry actions, and
  session persistence so the summary survives navigation.

### Modified Capabilities

<!-- ai-photo-add / ai-shelf-add change their *ending* (navigate to the summary) but
     not their core add requirements; captured here as wiring, not a spec rewrite. -->

## Impact

- **New UI**: `components/books/import-summary.ts` (pure `ImportOutcome` model + grouping
  helpers), an `<ImportSummary>` component, and `app/agregar/resumen/page.tsx` reading
  `sessionStorage`.
- **Wiring**: `add-book-by-shelf` and `add-book-by-photo` collect outcomes (retaining
  `bookId`+`copyId` for added, `copyId` for copies, and the candidate for failed) and
  `router.push("/agregar/resumen")`.
- **Undo**: reuses `DELETE /api/copies/:id` then `DELETE /api/books/:id` (a book can't be
  deleted while it has a copy — #12 D3). Edit reuses `/libros/:id/editar`. Retry re-calls
  `POST /api/books/intake`.
- **No new endpoints, no schema changes.** Orphaned cover files in Storage on undo are
  accepted (cleanup out of scope).
