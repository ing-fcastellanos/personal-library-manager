## Context

The shelf flow's `processBook` (`components/books/add-book-by-shelf.tsx`) enriches each
AI-identified book by calling `/api/enrich`. The URL is built by `shelfEnrichUrl(ai)` in
`components/books/shelf-add.ts`:

- ISBN present → `?isbn=...` (canonical lookup, no text fallback)
- otherwise → `?q="<title> <author1> <author2> ..."`

The server's `searchByText` runs Google Books, falls back to Open Library, then
deterministically ranks (`services/enrichment/rank.ts`). Ranking does **not** drop
candidates by score, so zero candidates means the providers genuinely returned nothing for
the query string. A confident-but-wrong author (read-confidence ≥ 0.8) poisons the query
enough that both providers return nothing → `best = null` → `classifyShelfBook` →
`no_match`. The reviewer then gets only the manual form, with no recovery path for a book
that a title-only search would have found immediately.

The single-photo flow (#20) does not share this path — it uses `/api/ai/identify` whose
vision layer returns best + alternatives directly.

## Goals / Non-Goals

**Goals:**

- Recover real books from `no_match` when only the author was misread, by retrying
  enrichment with the title alone.
- Surface the recovered book as a pickable alternative in the existing `low_confidence`
  review UI (no new screen).
- Keep the change pure-helper + container-fetch, fully unit-testable, no server change.

**Non-Goals:**

- ISBN-miss fallback (when an AI-read ISBN matches nothing). Separate concern.
- Per-field author confidence from the AI (the model returns one confidence per book, not
  per field), so the trigger is "combined query found nothing", not "author looks wrong".
- Changing the enrichment service, ranking, or the `classifyShelfBook` rule.
- Touching the single-photo flow (#20).

## Decisions

### D1 — Fallback lives client-side in `processBook`, not in the server

The server's `/api/enrich?q=` receives a single flat string and cannot reliably split title
from author. The client has the structured `ai.title` and `ai.authors`, so it owns the
decision. The enrichment service stays generic. _Alternative considered:_ a server-side
"strip trailing author tokens and retry" heuristic — rejected as fragile (no reliable
title/author boundary in a flat query) and as scope-creep into a shared endpoint.

### D2 — Trigger is "combined text query returned zero candidates", gated on no-ISBN

The retry runs only when: there was no ISBN path, the combined query produced `best == null`,
and the book actually had authors in the query (nothing to strip otherwise). This guarantees
the fallback never changes a case that already matched, and never doubles requests for books
that resolved on the first try. _Alternative considered:_ always issue title-only in parallel
and merge — rejected as it doubles enrichment load for every book and can demote a correct
author-ranked edition.

### D3 — New pure helper `shelfEnrichTitleUrl(ai)` beside `shelfEnrichUrl`

Mirrors the existing helper but builds `?q=<title only>`, keeping URL construction pure and
unit-testable and out of the React container. The container performs the second fetch and
reuses the existing candidate-shaping code path (first → best, rest → alternatives).

### D4 — Recovered candidates flow through the existing classification unchanged

Once the fallback populates `best` + `alternatives`, `classifyProcessed` runs as today: a
confident book with an enrichment match and no duplicate would normally be `auto`. To keep
the reviewer in the loop for a book whose author we know was misread, the recovered book is
routed to **review / `low_confidence`** rather than silently auto-added. This is the only
behavioral nuance and is captured as a spec scenario.

## Risks / Trade-offs

- **[Extra request per no-match book]** → Only fires on the zero-candidate path, which is a
  minority of books; bounded to one additional request each, and `/api/enrich` is cached.
- **[Title-only can return a wrong-but-plausible book]** → Mitigated by routing recovered
  books to `low_confidence` review (the reader confirms or picks an alternative), never a
  blind auto-add.
- **[Very generic titles (e.g. "Cuentos") return noise]** → Acceptable: the reader still
  reviews; this is strictly better than today's empty form, and the existing manual-edit
  path remains available.
