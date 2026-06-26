## Context

M3 ("IA: agregar libros") needs to identify books from photos. Issue #19 was split
into two changes; this one (`add-ai-provider-layer`) delivers the backend AI layer
and `add-ai-settings-screen` (#19b) delivers the settings UI on top of it.

The codebase already has a strong precedent to mirror: `services/enrichment/`
implements a multi-source lookup (Google Books + Open Library) with graceful
degradation (a `safe()` wrapper turning any source failure into "no result"),
injectable dependencies for network-free tests, and normalization to a shared
`Candidate` type that flows into `services/intake/`. This change reuses that mental
model, with one structural difference: enrichment runs sources **in parallel and
merges**, whereas the AI layer runs engines **in sequence and falls back**.

Decisions already settled in exploration:

- API keys live in **Secret Manager** (server-only, never sent to the browser); the
  app never writes them.
- Engine config (default engine + fallback toggle) lives in a Firestore
  `settings/ai` document, editable later from the settings screen.
- The full vision contract is defined now (not just a skeleton).
- AI output is the enrichment `Candidate` extended with `confidence` and
  `sourceProvider`.

## Goals / Non-Goals

**Goals:**

- A vendor-agnostic `AIProvider` interface for vision-based book identification.
- OpenAI (default) and Gemini (secondary) implementations behind that interface.
- An orchestrator that selects the default engine from config, falls back to the
  secondary on failure when fallback is enabled, and records which engine answered.
- Normalize each engine's raw output to a common, scored candidate shape.
- Full unit-test coverage of the orchestrator and normalization with injectable,
  network-free provider fakes (matching the enrichment test approach).

**Non-Goals:**

- No UI, no HTTP routes, no Claude Design handoff (those are `add-ai-settings-screen`).
- No photo-capture/upload flow and no human-in-the-loop review (those are #20/#21).
- No writing of API keys from the app; keys are provisioned out-of-band.
- No new AI-specific caching layer in this change (revisit if cost/latency warrants).

## Decisions

### D1 — Mirror the enrichment service shape under `services/ai/`

Structure: `types.ts` (interface + `AICandidate`), `openai.ts`, `gemini.ts`,
`normalize.ts`, `service.ts` (orchestrator), plus `*.test.ts`. Rationale: the team
already knows this layout from enrichment; injectable deps make it testable without
network or real keys. Alternative considered: a single class with strategy methods —
rejected as less consistent with the existing functional/di style.

### D2 — Sequential fallback, not parallel merge

The orchestrator calls the configured default engine; on failure/timeout/error and
when `fallbackEnabled`, it calls the secondary. It does **not** call both in
parallel. Rationale: AI calls are slow and costly; the goal is resilience, not
consensus. Each attempt is wrapped so a thrown error or timeout becomes a fallback
trigger, and the result records `sourceProvider` (which engine answered). If both
fail, the orchestrator throws a typed error the caller (#20/#21) surfaces.

### D3 — Output is `AICandidate = Candidate-shaped identification + confidence + sourceProvider`

AI vision yields an _identification_ (title, authors, and sometimes ISBN read off a
cover/spine), not authoritative metadata. We normalize it into the enrichment
`Candidate` field shape so it can flow downstream, and extend it with:

- `confidence: number` (0–1, normalized across engines), and
- `sourceProvider: "openai" | "gemini"`.

The `Candidate.source` field is set to a new `"ai"` provenance value (additive to
`EnrichmentSource`). Rationale: keeping the same field shape lets AI candidates pass
through `toBookCreateInput`/intake unchanged. Alternative considered: a distinct
slim `AIBookGuess` type — rejected because it would force a translation layer that
the common shape avoids. Downstream features (#20) may still pass the identification
through enrichment to resolve canonical metadata; that is their concern, not this
layer's.

### D4 — Config read from Firestore `settings/ai`, with safe defaults

The orchestrator reads `{ defaultEngine, fallbackEnabled }` from `settings/ai`. When
the document is absent (true until #19b seeds it), it defaults to
`defaultEngine: "openai"`, `fallbackEnabled: true`. Rationale: the layer must work
before the settings UI exists. Config is non-sensitive and may be client-readable.

### D5 — Keys from Secret Manager / env, validated lazily

Each implementation reads its key from the server environment (populated from Secret
Manager on Cloud Run, or `.env` locally). A missing key for an engine makes that
engine report "not configured": if it is the default, the orchestrator falls back; if
neither engine is configured, it throws a typed "no engine available" error. Keys are
never returned to the browser. Rationale: aligns with ADR-0001 (server uses ADC /
injected secrets) and the decision not to manage secrets from the app.

### D6 — Normalized confidence

Providers report confidence differently (OpenAI via prompt-structured score, Gemini
similarly). `normalize.ts` clamps/maps each engine's signal to a `0–1` `confidence`,
defaulting to a neutral mid value when an engine returns none. Rationale: downstream
ranking/human-in-the-loop (#21) needs a comparable score regardless of engine.

## Risks / Trade-offs

- **AI output is unreliable / hallucinated** → Treat results as _suggestions_ with a
  `confidence` score; never auto-persist. Downstream features keep human-in-the-loop
  and may cross-check via enrichment (ISBN/text lookup) before saving.
- **Cost/latency of two sequential calls on fallback** → Fallback only triggers on
  primary failure, not routinely; a per-call timeout bounds the wait. No parallel
  double-spend.
- **Vendor SDK/response drift** → Each engine's raw→`AICandidate` mapping is isolated
  in its own module with unit tests over recorded sample payloads; the orchestrator
  depends only on the `AIProvider` interface.
- **Missing/invalid key in production** → Engine self-reports "not configured" and the
  orchestrator falls back; a clear typed error when no engine is available. The
  settings screen (#19b) surfaces connection status to make this visible.
- **`source: "ai"` provenance leaking low-quality metadata into the catalog** →
  Provenance is explicit on each candidate so downstream flows can require enrichment
  confirmation before persisting AI-only data.

## Migration Plan

Additive backend-only change. Steps: add the `services/ai/` modules, extend
`EnrichmentSource`/`Candidate` additively, document `OPENAI_API_KEY` /
`GEMINI_API_KEY` in `.env.example`, add the SDK dependencies. No data migration; no
runtime behavior changes until a consumer (#20/#21) calls the layer. Rollback is
removal of the new modules — nothing else depends on them yet.

## Open Questions

- Exact prompt design per engine (the structured instruction that yields
  title/authors/isbn/confidence) — refined during implementation against real images.
- Whether to add an AI result cache later if #21 batch shelf scans prove costly
  (out of scope here).
