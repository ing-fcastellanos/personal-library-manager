## Context

#19 shipped `identifyBooksFromImage` (multi-book vision → `AICandidate[]`, each with a
`confidence`). #20 shipped the single-photo flow (`/api/ai/identify`, capture→confirm,
photo-as-cover) and the enrichment resilience + Storage fixes. #21 ("batch shelf photo,
human-in-the-loop") reuses all of it. This change is the backend half (21a); the UI is
`add-ai-shelf-review` (21b).

Decisions settled in exploration:

1. **Auto bucket = AI-confident AND enrichment-matched AND not a duplicate**; anything
   else → review queue (with a reason).
2. **Preview summary, not blind auto-persist** — the confident books are shown and added
   on one confirmation (handled in 21b).
3. **No bounding boxes / per-book crops** — the full shelf photo is the context; crops are
   deferred to the polish milestone.
4. **Each book uses the enrichment cover** (not a spine crop) — unlike #20's photo cover.
5. **Synchronous with a real progress bar** — achieved by the _client orchestration_
   pattern below, not a single server round-trip.
6. **Split in two** (this is 21a).

## Goals / Non-Goals

**Goals:**

- A thin `POST /api/ai/identify-shelf` that returns the AI books for a shelf photo.
- A pure, unit-tested classification rule (auto vs review + reason) usable by the client.
- Network-free tests for both the route (mocked service) and the classifier.

**Non-Goals:**

- No per-book enrichment/duplicate calls server-side — the client drives those (21b) to
  show real progress and to reuse `/api/enrich` + `/api/books/duplicates`.
- No UI, capture, progress, or review queue (those are 21b).
- No bounding boxes / crops; no async job/streaming.
- No changes to the `ai-provider` / enrichment / duplicates / intake requirements.

## Decisions

### D1 — `POST /api/ai/identify-shelf` returns vision results only

Request `{ imageBase64, contentType }` (auth, ≤8mb, same elevated JSON limit as the
cover/identify paths). Response `{ books: AICandidate[], sourceProvider }`. It calls
`identifyBooksFromImage` and nothing else. Rationale: keeping enrichment/dedupe on the
client lets the UI show genuine "processing N/M" progress and reuse existing endpoints
per book, instead of a long opaque server request.

### D2 — Client-orchestrated enrichment is intentional

Per book, the client (21b) calls `/api/enrich` (ISBN when present, else text) and
`/api/books/duplicates`, then classifies. Trade-off: ~2×N browser round-trips for N
books — acceptable on localhost/LAN for a 2-reader app, and it buys a real progress bar
plus maximal reuse. Alternative considered: one server endpoint that does vision +
enrich + dedupe and returns classified buckets — rejected because it can only show a
spinner, not progress, and would duplicate enrichment/dedupe already exposed as routes.

### D3 — Pure `classifyShelfBook` helper

Signature (no I/O):

```
classifyShelfBook(
  { aiConfidence: number | null, enriched: boolean, duplicate: boolean },
  threshold = 0.8,
) => { bucket: "auto" | "review", reason: "ok" | "low_confidence" | "no_match" | "duplicate" }
```

`auto` iff `aiConfidence >= threshold && enriched && !duplicate`. Otherwise `review`
with the first failing reason (low confidence → no match → duplicate). Pure and
unit-tested; shared with 21b. Rationale: the auto-vs-review rule is the heart of #21 and
must be verifiable independent of the UI.

### D4 — Threshold default and tuning

Default high-confidence threshold `0.8`, exported as a constant so it can be tuned
against real shelves during 21b QA. Rationale: a conservative bar keeps the auto bucket
trustworthy; doubtful books are cheap to review.

## Risks / Trade-offs

- **Multi-spine vision reliability** → `identifyBooksFromImage` is unproven on a real
  20-spine shelf; it may miss or invent books. The review queue + preview summary (21b)
  absorb this; validated in QA. The endpoint degrades to `[]` when nothing is read.
- **Large shelf photos / legible spines** → the client should downscale less
  aggressively than #20 (e.g. ~2048px) so spine text survives; an implementation detail
  of 21b, but the endpoint keeps the 8mb cap.
- **Chatty client orchestration** → ~2×N round-trips; fine on LAN, and each call is
  short. Reconsider a batched endpoint only if it becomes a problem.
- **Engine fallback** → inherited from #19 (`identifyBooksFromImage` runs default then
  secondary); a "no engine available" error maps to a clear status like `/api/ai/identify`.

## Migration Plan

Additive: one new route + one pure helper + tests. No data migration. Requires
`OPENAI_API_KEY` / `GEMINI_API_KEY` for live use (documented, #19). Rollback = remove the
route/helper; nothing depends on them until 21b.

## Open Questions

- Final confidence threshold (start at 0.8, tune in 21b QA).
- Whether very large shelves need pagination of the review queue (defer to 21b).
