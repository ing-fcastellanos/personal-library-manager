## ADDED Requirements

### Requirement: AIProvider vision interface

The system SHALL define an `AIProvider` interface for vision-based book
identification with two methods: `identifyBookFromImage` (a single cover/spine image
→ at most one identification candidate) and `identifyBooksFromImage` (one shelf photo
containing multiple books → a list of identification candidates). Both OpenAI and
Gemini SHALL implement this interface, so callers depend only on the interface and
never on a concrete vendor.

#### Scenario: Single-book identification returns one candidate

- **WHEN** `identifyBookFromImage` is called with a cover/spine image the engine can read
- **THEN** it returns at most one normalized candidate carrying the recognized title and
  authors and a `confidence` score

#### Scenario: Shelf identification returns multiple candidates

- **WHEN** `identifyBooksFromImage` is called with a photo containing several books
- **THEN** it returns a list of normalized candidates, one per recognized book, each with
  its own `confidence` score

#### Scenario: Both engines satisfy the same interface

- **WHEN** either the OpenAI or the Gemini implementation is used through the `AIProvider`
  interface
- **THEN** the caller obtains identically shaped normalized candidates regardless of which
  engine produced them

### Requirement: Engine selection from configuration

The system SHALL read the active engine configuration from a Firestore `settings/ai`
document containing `defaultEngine` (`"openai"` or `"gemini"`) and `fallbackEnabled`
(boolean). When the document is absent the system SHALL default to
`defaultEngine: "openai"` and `fallbackEnabled: true`, so the layer is usable before
the settings screen exists. This configuration is non-sensitive and contains no API
keys.

#### Scenario: Default engine drives the primary attempt

- **WHEN** `settings/ai` has `defaultEngine: "gemini"` and an identification is requested
- **THEN** the system attempts the Gemini engine first

#### Scenario: Missing config falls back to documented defaults

- **WHEN** no `settings/ai` document exists and an identification is requested
- **THEN** the system uses OpenAI as the default engine with fallback enabled

### Requirement: Automatic fallback to the secondary engine

The system SHALL automatically retry the same request with the secondary engine when
fallback is enabled and the default engine fails through an error, a timeout, or
reporting itself not configured. The system SHALL record on the result which engine
ultimately answered. When fallback is disabled, a default-engine failure SHALL surface
the error without trying the secondary.

#### Scenario: Default fails, secondary answers

- **WHEN** the default engine throws or times out and `fallbackEnabled` is true
- **THEN** the system completes the identification with the secondary engine and the result
  records `sourceProvider` as the secondary engine

#### Scenario: Provider that answered is recorded

- **WHEN** an identification completes via any engine
- **THEN** the result records `sourceProvider` identifying which engine produced it

#### Scenario: Fallback disabled surfaces the primary error

- **WHEN** the default engine fails and `fallbackEnabled` is false
- **THEN** the system surfaces the error and does not call the secondary engine

#### Scenario: No engine available raises a typed error

- **WHEN** the default engine fails (or is not configured) and the secondary is also not
  configured or also fails
- **THEN** the system raises a typed "no engine available" error rather than returning an
  empty success

### Requirement: API keys read server-side from Secret Manager

Each engine SHALL read its API key from the server environment (provisioned from
Secret Manager on Cloud Run, or local env in development). API keys SHALL never be
sent to the browser and SHALL never be written by the application. An engine whose key
is absent SHALL report itself "not configured" rather than throwing, so the
orchestrator can fall back.

#### Scenario: Engine without a key reports not configured

- **WHEN** an engine's API key is absent from the server environment
- **THEN** that engine reports "not configured" and the orchestrator treats it as a fallback
  trigger rather than crashing

#### Scenario: Keys never reach the client

- **WHEN** the AI layer runs
- **THEN** no API key value is included in any response returned toward the browser

### Requirement: Normalization to scored candidates

The system SHALL normalize each engine's raw output into the shared enrichment
`Candidate` field shape extended with `confidence` (a number in `0–1`, mapped/clamped
consistently across engines) and `sourceProvider` (`"openai"` or `"gemini"`). The
candidate's `source` provenance SHALL be `"ai"`. When an engine returns no confidence
signal, the system SHALL assign a neutral default. The normalized shape SHALL be
compatible with the existing intake path so an AI candidate can be persisted without a
separate translation layer.

#### Scenario: Confidence clamped to the common range

- **WHEN** an engine returns a confidence signal outside `0–1` or in an engine-specific scale
- **THEN** the normalized candidate's `confidence` is mapped into `0–1`

#### Scenario: Missing confidence gets a neutral default

- **WHEN** an engine returns a candidate with no confidence signal
- **THEN** the normalized candidate receives a neutral default `confidence`

#### Scenario: AI provenance recorded on the candidate

- **WHEN** any engine's output is normalized
- **THEN** the candidate carries `source: "ai"` and a `sourceProvider` of the engine that
  produced it

### Requirement: Network-free testability

The orchestrator and normalization SHALL be covered by unit tests that inject fake
provider implementations, requiring no network access and no real API keys, matching
the dependency-injection approach used by the enrichment service.

#### Scenario: Orchestrator tested with injected fakes

- **WHEN** the orchestrator is exercised in tests with injected fake engines that simulate
  success, failure, and timeout
- **THEN** fallback selection and `sourceProvider` recording are verified without any network
  call or real key
