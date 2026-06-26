## 1. Settings service

- [x] 1.1 Add `services/ai/settings.ts`: `readSettings()` returning effective config via `getAIConfig()` + per-engine status
- [x] 1.2 Implement `writeSettings(patch)` validating and persisting `defaultEngine`/`fallbackEnabled` to `settings/ai`
- [x] 1.3 Implement `engineStatus(engine)`: `not_configured` from `isConfigured()`, else run a minimal no-image probe → `connected` / `error`
- [x] 1.4 Apply a timeout to the probe so a hang maps to `error`
- [x] 1.5 Unit-test status derivation and config validation with injected fakes (emulator-free)

## 2. API endpoints

- [x] 2.1 Add `server/routes/ai-settings.ts` with a zod schema for the PATCH body
- [x] 2.2 `GET /api/ai/settings` → `{ config, engines }` (no key values)
- [x] 2.3 `PATCH /api/ai/settings` (`requireAuth`) → validate, persist, return updated config; `400` on invalid engine
- [x] 2.4 `POST /api/ai/test` (`requireAuth`) → `{ engine }` returns `{ status }`
- [x] 2.5 Mount the router under `/api` in `server/index.ts`
- [x] 2.6 Route tests: read shape, auth-gated writes, invalid-engine `400`, test-status mapping

## 3. Client manager

- [x] 3.1 Add `components/ai-settings/use-ai-settings.ts` (fetch config + status, refresh after mutations)
- [x] 3.2 Add `ai-settings-manager.tsx`: engine select, fallback toggle, per-engine status row with a "test" button
- [x] 3.3 Extract a pure status → label/variant helper and unit-test it
- [x] 3.4 Wire the manager into a new "IA" section in `app/ajustes/page.tsx`
- [x] 3.5 Component test: changing engine calls PATCH; test button shows the returned status

## 4. Claude Design handoff

- [x] 4.1 Generate the Claude Design prompt for the AI settings screen (states: key validation, test result, error; responsive; accessibility; design tokens M0)
- [x] 4.2 Produce the design in Claude Design and validate against the base design system
- [x] 4.3 Integrate the handoff: map markup to the Next components + tokens/styles
- [x] 4.4 QA visual responsive + accessibility

## 5. Verify

- [x] 5.1 Confirm no API key is ever sent to the client (review responses + UI)
- [x] 5.2 Run lint, typecheck, and the test suite green
- [x] 5.3 Manual check: change engine + toggle persist to `settings/ai`; test connection reflects status
