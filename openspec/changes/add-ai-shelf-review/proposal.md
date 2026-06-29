## Why

21a shipped the shelf backend: `POST /api/ai/identify-shelf` (vision → books) and the
pure `classifyShelfBook` rule. Nothing drives them yet. This change (21b) is the
user-facing batch flow: photograph a whole shelf, the client enriches and classifies
each book with a real progress bar, then auto-adds the confident ones (after a preview)
and walks the reader through a one-by-one review queue for the doubtful ones. It is the
front door that satisfies #21's acceptance criteria.

## What Changes

- Add a **"Por estante"** entry point (third tab in `/agregar`, alongside Manual and Por
  foto): capture a shelf photo (downscaled to ~2048px so spines stay legible).
- **Client orchestration with progress**: call `/api/ai/identify-shelf`, then for each
  book enrich (`/api/enrich`) + duplicate-check (`/api/books/duplicates`) and classify
  (`classifyShelfBook`), showing "Procesando N/M". The loop is per-book resilient — a
  failed lookup drops that book to review (`no_match`), never aborting the batch.
- **One shelf for the whole batch** — a single shelf picker applied to every saved book.
- **Preview, then persist** (no blind auto-add): the `auto` books are shown as a summary
  and added on one confirmation (intake per book, using the enrichment cover); the
  `review` books go to a queue.
- **One-by-one review queue** (mobile-first), counter "N de M", auto-advance with an
  optional "back": low-confidence → compact candidate card + enrichment alternatives +
  opt-in edit; no-match → editable form; duplicates → **grouped** with a bulk
  skip-all / add-all-as-copy. Confirm/correct/discard per item; sticky actions; the shelf
  photo is not shown per item.
- Claude Design handoff for the batch states (capturing, analyzing, processing N/M,
  results summary, review queue item per reason, done).

## Capabilities

### Modified Capabilities

- `ai-shelf-add`: adds the capture → progress → preview → review-queue flow (the
  client-side orchestration and UI) on top of the endpoint + classification rule from 21a.

## Impact

- **New UI**: `components/books/add-book-by-shelf.tsx` (the batch state machine) + a pure
  `shelf-add.ts` helper module (group review items by reason, build per-book enrichment
  queries, etc.); a third tab wired into `app/agregar/page.tsx`.
- **Reuses (#20/#13/#16/#14)**: `candidateToBookData`, `prepareImage` (with a larger max
  edge for shelves), `intakePayload`, the alternatives-picker/edit pattern, and the
  `/api/enrich` + `/api/books/duplicates` + `/api/books/intake` endpoints.
- **Depends on**: 21a (`/api/ai/identify-shelf`, `classifyShelfBook`), #13, #16, #14, #6.
  Requires AI keys configured.
- No new server endpoints; no schema changes.
