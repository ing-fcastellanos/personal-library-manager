## Why

The M3 epic ("IA: agregar libros") needs to identify books from photos (cover/spine
and whole-shelf batches). Before any of those flows (#20, #21, #22) can be built,
the app needs an interchangeable AI layer so it is not coupled to a single vendor:
OpenAI as the default engine with automatic fallback to Gemini when the primary
fails. This change delivers that backend layer — pure infrastructure with no
user-facing flow of its own — so the photo-intake features can stand on top of it.

## What Changes

- Introduce an `AIProvider` interface for vision-based book identification with two
  methods: `identifyBookFromImage` (single cover/spine) and `identifyBooksFromImage`
  (multiple books in one shelf photo).
- Add two implementations: **OpenAI** (default) and **Gemini** (secondary), each
  reading its API key from **Secret Manager** server-side (keys never reach the
  browser; the app does not write them).
- Add an orchestrator that runs the configured default engine first and, on
  failure/timeout/error, automatically retries with the secondary when fallback is
  enabled, recording which provider answered.
- Normalize every provider's raw output to a common shape: the existing enrichment
  `Candidate` extended with `confidence` and `sourceProvider`, so AI results flow
  into the existing `intake` path without translation.
- Read engine configuration (default engine + fallback toggle) from a Firestore
  `settings/ai` document. This change consumes that config; the UI to edit it ships
  in the follow-up change `add-ai-settings-screen`.

## Capabilities

### New Capabilities

- `ai-provider`: Vendor-agnostic AI vision layer for identifying books from images,
  with a default engine, automatic fallback to a secondary engine, output
  normalization to scored candidates, and config-driven engine selection.

### Modified Capabilities

<!-- None. The enrichment Candidate type is extended additively, not a requirement change. -->

## Impact

- **New code**: `services/ai/` (interface/types, `openai.ts`, `gemini.ts`,
  orchestrator/service, normalization), mirroring the structure of
  `services/enrichment/`.
- **Config source**: reads `settings/ai` from Firestore (default engine, fallback
  toggle); written out-of-band until `add-ai-settings-screen` lands.
- **Secrets**: requires `OPENAI_API_KEY` and `GEMINI_API_KEY` available to the server
  via Secret Manager / env; documented in `.env.example`.
- **Types**: extends the enrichment `Candidate` (additive: `confidence`,
  `sourceProvider`).
- **Dependencies**: adds the OpenAI and Gemini SDK client libraries.
- **No UI, no new HTTP routes** in this change — consumed by M3 features (#20/#21/#22)
  and the settings screen (#19b) that follow.
