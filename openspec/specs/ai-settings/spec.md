# ai-settings Specification

## Purpose

TBD - created by archiving change add-ai-settings-screen. Update Purpose after archive.

## Requirements

### Requirement: Read AI configuration and engine status

The system SHALL expose `GET /api/ai/settings` returning the effective AI
configuration (`defaultEngine`, `fallbackEnabled`) — applying the same safe defaults
the provider layer uses when the `settings/ai` document is absent — together with a
per-engine connection status. The response SHALL NOT include any API key value.

#### Scenario: Effective config returned before the document exists

- **WHEN** an authenticated reader requests `GET /api/ai/settings` and no `settings/ai`
  document has been written
- **THEN** the system responds `200` with `defaultEngine: "openai"` and
  `fallbackEnabled: true` plus the per-engine status list

#### Scenario: No key value is ever returned

- **WHEN** any response from `GET /api/ai/settings` is produced
- **THEN** it contains only the configuration and engine status, never an API key
  (whole or masked)

### Requirement: Update the default engine and fallback toggle

The system SHALL expose `PATCH /api/ai/settings`, restricted to authenticated
readers, accepting `defaultEngine` (one of the known engines) and/or
`fallbackEnabled` (boolean), validating the payload before persisting it to the
Firestore `settings/ai` document, and returning the updated configuration. An invalid
`defaultEngine` SHALL be rejected with `400`. An unauthenticated request SHALL be
rejected.

#### Scenario: Authenticated reader changes the default engine

- **WHEN** an authenticated reader `PATCH`es `{ "defaultEngine": "gemini" }`
- **THEN** the system persists it to `settings/ai` and responds `200` with the updated
  configuration, so a subsequent provider-layer call uses Gemini as default

#### Scenario: Fallback toggle persisted

- **WHEN** an authenticated reader `PATCH`es `{ "fallbackEnabled": false }`
- **THEN** the system persists the toggle and the provider layer no longer tries the
  secondary engine on a default-engine failure

#### Scenario: Invalid engine rejected

- **WHEN** a request sets `defaultEngine` to a value that is not a known engine
- **THEN** the system responds `400` and does not write `settings/ai`

#### Scenario: Unauthenticated write rejected

- **WHEN** an unauthenticated client attempts `PATCH /api/ai/settings`
- **THEN** the system rejects the request and does not change the configuration

### Requirement: Test engine connection without exposing keys

The system SHALL expose `POST /api/ai/test`, restricted to authenticated readers,
that probes a named engine's reachability using the key held server-side and responds
with a status of `connected`, `not_configured`, or `error`. The probe SHALL NOT
require an image and SHALL NOT return the API key. An engine with no key configured
SHALL report `not_configured` rather than `error`.

#### Scenario: Configured, reachable engine reports connected

- **WHEN** an authenticated reader tests an engine whose key is present and valid
- **THEN** the system responds with status `connected`

#### Scenario: Engine without a key reports not_configured

- **WHEN** an authenticated reader tests an engine whose key is absent server-side
- **THEN** the system responds with status `not_configured`

#### Scenario: Failed probe reports error

- **WHEN** the probe to a configured engine fails or times out
- **THEN** the system responds with status `error` and surfaces no key value

### Requirement: AI section in the settings screen

The settings screen (`/ajustes`) SHALL present an AI section that lets a reader select
the default engine, toggle automatic fallback, and view each engine's connection
status with an action to test it. Selecting an engine or toggling fallback SHALL
persist the change via the settings endpoint. The screen SHALL never display an API
key field.

#### Scenario: Reader changes the default engine from the UI

- **WHEN** a reader selects a different default engine in the AI section
- **THEN** the choice is saved via `PATCH /api/ai/settings` and reflected in the UI

#### Scenario: Reader tests a connection from the UI

- **WHEN** a reader activates "test connection" for an engine
- **THEN** the UI shows that engine's resulting status (`connected`,
  `not_configured`, or `error`) without revealing any key

#### Scenario: No key entry in the UI

- **WHEN** the AI settings section is rendered
- **THEN** it exposes engine selection, the fallback toggle, and connection status
  only — never an input for an API key
