## Context

21a (`add-ai-shelf-identify`) delivered `POST /api/ai/identify-shelf` (vision → books)
and the pure `classifyShelfBook` rule. #20 left reusable client helpers
(`candidateToBookData`, `prepareImage`, `intakePayload`) and the alternatives-picker /
edit pattern in `add-book-by-photo`, plus a tab system in `/agregar`. 21b is the batch UI
that ties these together.

Decisions settled in exploration:

1. **One shelf for the whole batch** — a single shelf picker, not per book.
2. **Preview, then persist** — confident books are added on one confirmation, not blindly.
3. **One-by-one review** with a counter, **auto-advance + optional back**, **shelf photo
   omitted** from the item.
4. **Duplicates grouped** with a bulk skip-all / add-all-as-copy action.
5. **Pure focus** — no overview list for now.
6. **Mobile-compact item**: a candidate card + alternatives, **edit is opt-in**, sticky
   actions.
7. **Third tab** "Por estante".
8. **Downscale to ~2048px** for shelves (legible spines).
9. **Per-book resilient loop** — a failed lookup → review:no_match, never aborts.

## Goals / Non-Goals

**Goals:**

- A batch flow: capture → analyze → process N/M → preview auto + review queue → done.
- Real per-book progress, reusing existing endpoints (no new server work).
- Confident books auto-added after one confirmation; doubtful ones reviewed one-by-one.
- One shelf applied to the whole batch.
- Pure helpers (grouping, query building) unit-tested; the flow component tested in jsdom.

**Non-Goals:**

- No bounding boxes / per-book crops; no per-item shelf photo.
- No new server endpoints (21a's `/api/ai/identify-shelf` + the existing enrich/dedupe/
  intake routes are enough).
- No async job/streaming — synchronous with a client-side progress bar.
- No overview/list view of the queue (revisit if needed).

## Decisions

### D1 — Batch state machine (`add-book-by-shelf.tsx`)

States: `capture → analyzing → processing(N/M) → results → review → done`. `results`
shows the shelf picker, the `auto` summary with "Agregar los N", and a "Revisar →" entry
to the queue. Rationale: mirrors #20's state-machine style; each state is a simple render.

### D2 — Per-book processing loop (client, resilient)

After `/api/ai/identify-shelf` returns `books`, iterate: for each, enrich (ISBN →
`/api/enrich?isbn=`, else `/api/enrich?q=title authors`), duplicate-check
(`/api/books/duplicates`), then `classifyShelfBook({ aiConfidence, enriched: !!best,
duplicate })`. Wrap each book in try/catch → on failure classify as `review:no_match`.
Update "Procesando N/M" as each completes. Store per book: the AI candidate, the
enrichment `best` + `alternatives`, the duplicate (if any), and the classification.

### D3 — Auto bucket: preview then intake-per-book

The `auto` books are listed; "Agregar los N" loops `POST /api/books/intake` per book with
`candidateToBookData(best)` + `coverSourceUrl = best.coverUrl` (enrichment cover, re-hosted
by intake — the Storage fix from #20 makes this viewable). Shelf = the batch picker. A
per-book failure is surfaced but doesn't abort the rest. Rationale: honors "preview, not
blind"; reuses intake unchanged.

### D4 — Review queue, one-by-one, reason-driven

`review` items minus duplicates are walked one at a time (counter "N de M", auto-advance,
optional back):

- `low_confidence` → compact card of the current pick + enrichment **alternatives**
  (tap to swap) + **opt-in edit** (title/authors) → Confirmar / Descartar.
- `no_match` → editable form (title/authors) → Confirmar / Descartar.
  Confirm → intake (with the batch shelf; cover from the chosen candidate when present).
  **Duplicates are grouped** into a single block with **Saltar todos / Agregar todos como
  copia** (the latter loops `POST /api/copies` against each matched book). Rationale: the
  easy, repetitive case (duplicates) is bulk-handled; only genuine judgment goes one-by-one.

### D5 — One shelf for the batch

A single shelf `<select>` on the results screen; its value is passed to every intake/copy
call. Rationale: one physical shelf → one picker; far less tapping than per book.

### D6 — Reuse, with a shelf-tuned downscale

Reuse `prepareImage` but allow a larger max edge (~2048px) for the shelf photo so spine
text survives; reuse `candidateToBookData` / `intakePayload`; reuse the alternatives-picker
and edit affordance from `add-book-by-photo` (extract/share if convenient). Pure helpers
(group-by-reason, build-query) live in `shelf-add.ts` and are unit-tested.

## Risks / Trade-offs

- **Long review queue on a big shelf** → grouped duplicates + auto-advance keep it moving;
  add pagination only if it bites (deferred).
- **Mobile density on low-confidence items** → mitigated by the compact card + opt-in edit
  - sticky actions (explored); validated in QA.
- **Chatty loop (~2×N requests)** → fine on LAN; each call is short; shows real progress.
- **AI over/under-detection** → preview + review absorb it; nothing is saved without a
  confirmation step.
- **Partial-batch failures** → per-book try/catch; failures surface without losing the rest.

## Migration Plan

Additive UI: new component(s) + a third tab + pure helpers + tests. No server, schema, or
data changes. Rollback = remove the tab + components. Needs AI keys for live use (#19).

## Open Questions

- Whether to extract the #20 alternatives-picker into a shared component or duplicate a
  slim version — decide during implementation by how cleanly it factors.
- Final confidence threshold (inherited from 21a's `HIGH_CONFIDENCE`, tuned in QA).
