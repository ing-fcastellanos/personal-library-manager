## 1. Scaffolding & types

- [x] 1.1 Create `services/ai/` directory mirroring `services/enrichment/` layout
- [x] 1.2 Extend `EnrichmentSource` (or candidate `source`) additively to include `"ai"` in `services/enrichment/types.ts`
- [x] 1.3 Define `AICandidate` in `services/ai/types.ts` as the `Candidate` shape plus `confidence: number` (0–1) and `sourceProvider: "openai" | "gemini"`
- [x] 1.4 Define the `AIProvider` interface (`identifyBookFromImage`, `identifyBooksFromImage`) and an `AIEngine` id type in `services/ai/types.ts`
- [x] 1.5 Define typed errors: `NoEngineAvailableError` and a per-engine "not configured" signal

## 2. Configuration

- [x] 2.1 Add `getAIConfig()` reading `settings/ai` (`defaultEngine`, `fallbackEnabled`) from Firestore via the Admin SDK
- [x] 2.2 Apply safe defaults when the doc is absent (`defaultEngine: "openai"`, `fallbackEnabled: true`)
- [x] 2.3 Unit-test config defaulting with an injectable Firestore reader (emulator-free)

## 3. Engine implementations

- [x] 3.1 Add OpenAI and Gemini SDK client dependencies to `package.json`
- [x] 3.2 Implement `services/ai/openai.ts`: read `OPENAI_API_KEY` from env, report "not configured" when absent, call vision model, return raw output
- [x] 3.3 Implement `services/ai/gemini.ts`: read `GEMINI_API_KEY` from env, report "not configured" when absent, call vision model, return raw output
- [x] 3.4 Apply a per-call timeout to each engine so a hang becomes a fallback trigger

## 4. Normalization

- [x] 4.1 Implement `services/ai/normalize.ts`: map each engine's raw output to `AICandidate` with `source: "ai"` and `sourceProvider`
- [x] 4.2 Clamp/map engine confidence into `0–1`; assign a neutral default when absent
- [x] 4.3 Ensure the normalized shape is intake-compatible (passes through `toBookCreateInput`)
- [x] 4.4 Unit-test normalization over recorded sample payloads from each engine

## 5. Orchestrator (fallback)

- [x] 5.1 Implement `services/ai/service.ts` exposing `identifyBookFromImage` / `identifyBooksFromImage` that read config and select the default engine
- [x] 5.2 On default-engine error/timeout/not-configured with `fallbackEnabled`, retry the secondary engine
- [x] 5.3 Record `sourceProvider` (engine that answered) on every result
- [x] 5.4 When fallback is disabled, surface the default-engine error without trying the secondary
- [x] 5.5 Throw `NoEngineAvailableError` when neither engine can answer
- [x] 5.6 Make engines injectable via a `deps` parameter (matching `EnrichDeps` pattern)

## 6. Tests

- [x] 6.1 Unit-test orchestrator fallback selection with injected fake engines (success / failure / timeout / not-configured)
- [x] 6.2 Assert `sourceProvider` recording across primary and fallback paths
- [x] 6.3 Assert fallback-disabled and no-engine-available behaviors
- [x] 6.4 Confirm the suite runs with no network access and no real API keys

## 7. Docs & wiring

- [x] 7.1 Document `OPENAI_API_KEY` and `GEMINI_API_KEY` in `.env.example` (server-only, Secret Manager in prod)
- [x] 7.2 Note the `settings/ai` config shape and that it is seeded by the follow-up settings screen (#19b)
- [x] 7.3 Run lint, typecheck, and the test suite green
