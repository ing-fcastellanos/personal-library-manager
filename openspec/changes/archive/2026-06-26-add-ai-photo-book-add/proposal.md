## Why

The AI vision layer (#19) can identify a book from a photo but nothing in the app
calls it yet. This change delivers the first user-facing AI feature of M3: take a
photo of a book's cover or spine, let AI identify it, enrich it to canonical
metadata, and save it — with confirmation. It is a new _front door_ to the existing
manual-add pipeline (#14), so duplicate detection, shelf assignment, and intake are
reused rather than rebuilt.

## What Changes

- Add `POST /api/ai/identify` (auth-gated): accepts a base64 image, runs
  `identifyBookFromImage` (#19), **enriches the result server-side** (#13) — by ISBN
  when the AI reads one, otherwise by text search — and returns the AI guess's raw
  confidence plus a `best` enriched candidate and ranked `alternatives`.
- Add a **photo-capture entry point** to "Agregar": a mobile-first
  `<input capture="environment">` that sends the photo to `/api/ai/identify`.
- Add a **confirmation flow** showing the captured photo, the pre-filled `best`
  candidate, and the enrichment `alternatives` to pick from; low AI confidence is
  surfaced. Confirming feeds the existing duplicate pre-check (#16) and intake (#14).
- **The captured photo becomes the cover** (decision): it is uploaded to Storage only
  on confirm (reusing the cover path from #15) — no orphan images for discarded
  photos. Enrichment supplies metadata only, not the cover.
- Claude Design handoff for the capture → analyzing → candidate/low-confidence → error
  states (mobile-first, accessible).

## Capabilities

### New Capabilities

- `ai-photo-add`: Identify a book from a photo and add it — the `/api/ai/identify`
  endpoint (AI identification + server-side enrichment to best + alternatives) and the
  capture → confirm flow that reuses duplicate detection, intake, and cover upload,
  with the captured photo persisted as the cover on confirm.

### Modified Capabilities

<!-- None. Consumes ai-provider, catalog-enrichment, catalog-duplicates, catalog-add
     without changing their requirements. -->

## Impact

- **New endpoint**: `server/routes/ai-identify.ts` (`POST /api/ai/identify`,
  `requireAuth`, base64 image up to 8mb), mounted under `/api`.
- **New service**: `services/ai/identify.ts` — orchestrates `identifyBookFromImage`
  (#19) + enrichment (`enrichByIsbn` / `searchByText`, #13) into `{ best, alternatives,
aiConfidence }`.
- **New UI**: photo capture + AI confirmation flow under `/agregar` (new components),
  pre-filling the existing `AddBookForm` data path; reuses duplicate pre-check and
  `POST /api/books/intake`.
- **Cover**: captured photo uploaded via the existing cover service on confirm; the
  intake/cover path may need to accept a base64 cover for a freshly created book.
- **Depends on**: #19 (AI layer), #13 (enrichment), #16 (duplicates), #14 (intake),
  #6 (design system). Requires AI keys configured (Secret Manager) to function.
