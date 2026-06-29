## Why

The AI layer can already identify multiple books from one shelf photo
(`identifyBooksFromImage`, #19) but nothing calls it. #21 turns a whole-shelf photo
into a fast auto-add of the confident books plus a review queue for the doubtful
ones. This change (21a) delivers the backend that the batch UI (21b) builds on: the
vision endpoint and the pure classification logic that decides which books are safe
to auto-add. It is split from the UI so the endpoint and the auto-vs-review decision
are testable on their own.

## What Changes

- Add `POST /api/ai/identify-shelf` (auth-gated): accepts a base64 shelf photo and
  returns the AI-identified books (`AICandidate[]`) and the engine that answered. The
  endpoint does **only** the vision call — per-book enrichment and duplicate checks
  are driven by the client (21b) reusing `/api/enrich` and `/api/books/duplicates`,
  which lets the UI show real "processing N/M" progress.
- Add a pure **classification helper** that decides each book's bucket from its AI
  confidence, whether enrichment found a canonical match, and whether it is a
  duplicate: **auto** only when AI-confident **and** enrichment-matched **and**
  not a duplicate; everything else goes to **review** with a reason
  (`low_confidence` / `no_match` / `duplicate`).
- Map a "no engine available" AI error to a clear status, mirroring
  `/api/ai/identify`.

## Capabilities

### New Capabilities

- `ai-shelf-add`: Add books from a whole-shelf photo. This change introduces the
  shelf identification endpoint and the auto-vs-review classification rule; the
  capture → progress → review-queue UI is added by the follow-up change
  `add-ai-shelf-review`.

### Modified Capabilities

<!-- None. Consumes ai-provider; reuses catalog-enrichment/duplicates/add via the client. -->

## Impact

- **New endpoint**: `server/routes/ai-shelf.ts` (`POST /api/ai/identify-shelf`,
  `requireAuth`, base64 image up to 8mb), mounted under `/api` with the elevated JSON
  limit.
- **New module**: a pure `classifyShelfBook` helper (no I/O, unit-tested) shared with
  the 21b client; lives in a client-importable module.
- **Depends on**: #19 (`identifyBooksFromImage`), and—at the client layer in 21b—#13
  (enrichment), #16 (duplicates), #14 (intake). Requires AI keys configured.
- **No UI** in this change; consumed by `add-ai-shelf-review` (21b).
