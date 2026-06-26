## Why

The AI provider layer (`add-ai-provider-layer`, #19a) reads its engine selection
from a Firestore `settings/ai` document but nothing in the app can edit it yet, so
the default engine and the fallback toggle can only be changed by editing Firestore
by hand. This change adds the AI section to the existing settings screen so the two
readers can choose the default engine, toggle automatic fallback, and confirm each
engine is reachable — without ever touching API keys (those stay in Secret Manager,
server-side).

## What Changes

- Add an **AI** section to `/ajustes` (`app/ajustes/page.tsx`) with a manager
  component (`AISettingsManager`) following the existing Readers/Shelves pattern.
- Let the user **choose the default engine** (OpenAI or Gemini) and **toggle
  automatic fallback**; both persist to the Firestore `settings/ai` document.
- Show a **connection status** per engine (`connected` / `not configured` / `error`)
  and a **"test connection"** action that pings the engine server-side using the key
  from Secret Manager and returns only status — never the key value.
- Add server endpoints (auth-protected for writes, ADR-0006/0009): read effective AI
  config + per-engine status, update config, and run a connection test.
- Guard the writes so only an authenticated reader can change the configuration.

## Capabilities

### New Capabilities

- `ai-settings`: The settings-screen capability for managing AI engine selection —
  read/update of the default engine and fallback toggle, per-engine connection
  status, and a server-side connection test that never exposes API keys.

### Modified Capabilities

<!-- None. Consumes the ai-provider capability (#19a) without changing its requirements. -->

## Impact

- **New UI**: `app/ajustes/page.tsx` gains an AI section; new
  `components/ai-settings/ai-settings-manager.tsx` + `use-ai-settings.ts` hook
  (mirrors `components/shelves/`).
- **New endpoints**: `server/routes/ai-settings.ts` mounted under `/api` — e.g.
  `GET /api/ai/settings` (config + engine status), `PATCH /api/ai/settings` (update,
  `requireAuth`), `POST /api/ai/test` (connection test, `requireAuth`).
- **New service**: `services/ai/settings.ts` (read/write `settings/ai`, build status,
  run the connection probe) building on `services/ai` from #19a.
- **Depends on**: `add-ai-provider-layer` (#19a) for `AIConfig`, the providers, and
  `isConfigured()`.
- **Design**: includes the Claude Design handoff for the AI settings screen (states:
  key validation, test result, error; responsive; accessibility; design tokens).
- **Security**: API keys are never read into the client; endpoints return only status
  and the non-sensitive config.
