## Context

#19 shipped `services/ai` with `identifyBookFromImage` (default engine + fallback,
output normalized to the enrichment `Candidate` shape + `confidence`). It has **no
HTTP route** — this change adds the first caller. The manual-add pipeline (#14) already
wires a presentational form to enrichment (#13), duplicate pre-check (#16), and
`POST /api/books/intake`; #20 is a new photo entry point into that same pipeline.

Decisions settled in exploration:

1. **Enrich on the server** — `/api/ai/identify` returns canonical candidates, not raw AI text.
2. **Capture via `<input capture="environment">`** — native camera, no live `getUserMedia` stream.
3. **Return the AI guess + enrichment alternatives** — the reader picks when uncertain.
4. **The captured photo is the cover** — enrichment supplies metadata only.
5. **Persist the photo on confirm (Option B)** — no Storage orphans for discarded photos.
6. Single change (not split).

## Goals / Non-Goals

**Goals:**

- One round-trip `POST /api/ai/identify` that turns a photo into `{ best, alternatives, aiConfidence }`.
- A mobile-first capture → confirm flow that reuses dedupe + intake.
- The reader's photo stored as the cover, only when they save.
- Server orchestration unit-tested with injected AI + enrichment fakes (no network/keys).

**Non-Goals:**

- No batch / whole-shelf photo analysis (that is #21).
- No barcode/ISBN scanning (#23) — though an AI-read ISBN is used when present.
- No live camera preview (`getUserMedia`); revisit as polish.
- No changes to the `ai-provider` / enrichment / intake requirements.

## Decisions

### D1 — `POST /api/ai/identify` shape

Request: `{ imageBase64, contentType }` (auth-gated, ≤8mb, mirroring the cover route's
high-limit JSON path). Response:

```
{
  aiConfidence: number,            // 0–1 from the AI guess (drives low-confidence UI)
  sourceProvider: "openai"|"gemini",
  best: Candidate | null,          // top enriched match (or the raw AI candidate if none)
  alternatives: Candidate[]        // other ranked enrichment matches
}
```

Rationale: one call does identify + enrich so the client gets ready-to-confirm data.

### D2 — Identification → enrichment bridge (`services/ai/identify.ts`)

1. `identifyBookFromImage(image)` → AI candidate (title, authors, maybe isbn, confidence).
2. If the AI candidate has an ISBN → `enrichByIsbn` → `best`.
   Else → `searchByText("title authors")` → ranked list; `best` = top, `alternatives` = rest.
3. If enrichment yields nothing → `best` = the raw AI candidate (so the reader can still
   edit/save), `alternatives` = []. Engines/enrichment are injected for tests.
   Rationale: AI reads low-fidelity text off a cover; enrichment is what makes it canonical.

### D3 — The captured photo is the cover, persisted on confirm

The browser holds the base64 photo through the confirm step. On save, intake creates the
book/copy, then the photo is uploaded via the existing cover service (#15,
base64→Storage). The enrichment cover is ignored (decision 4). To avoid a brittle
two-request dance, intake may accept an optional base64 cover and perform the upload
server-side after creating the book. No image is written for a cancelled/discarded photo.
Rationale: it is the reader's actual copy; storing on confirm avoids Storage orphans.

### D4 — Reuse the manual-add data path, new capture/confirm UI

The confirmation maps a chosen candidate into the same `BookData` the manual `AddBookForm`
consumes, so duplicate pre-check (#16) and intake (#14) are reused unchanged. The capture
and photo-confirmation surface is new (mobile-first, photo-led), per the Claude Design
handoff. Rationale: maximal reuse, consistent catalog writes.

### D5 — Confidence-driven states

`aiConfidence` and whether enrichment matched drive the UI: high confidence + a match →
show `best` pre-filled; low confidence or no match → emphasize editing and the
`alternatives` picker. The captured photo is always shown as the cover preview.

## Risks / Trade-offs

- **AI mis-identifies the book** → Always confirm; `alternatives` + a fully editable form
  let the reader correct it; never auto-save.
- **Spine photos make poor covers** → Accepted per decision 4 (it is the reader's copy);
  the reader can replace the cover later via edit (#15).
- **Cost of an AI call per photo** → Identify is an explicit, auth-gated user action, not
  automatic; one call also covers enrichment.
- **Large base64 uploads on mobile** → Reuse the 8mb cap and content-type validation from
  the cover route; consider client-side downscale before upload (nice-to-have).
- **Enrichment finds nothing** → Degrade to the raw AI candidate so the flow still
  completes with manual edits.

## Migration Plan

Additive: new route + service + UI. No data migration. Requires `OPENAI_API_KEY` /
`GEMINI_API_KEY` for live use (already documented, #19); without keys the endpoint
surfaces the AI layer's "no engine available" error. Rollback = remove the new route/UI;
nothing else depends on them.

## Open Questions

- Whether to downscale/compress the photo client-side before upload (latency/cost) — can
  be a follow-up.
- Exact "low confidence" threshold for emphasizing the alternatives picker — tuned during
  implementation against real photos.
