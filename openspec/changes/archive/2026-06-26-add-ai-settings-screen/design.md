## Context

`add-ai-provider-layer` (#19a) shipped the backend AI layer: an `AIProvider`
interface, OpenAI/Gemini engines that read keys from Secret Manager and expose
`isConfigured()`, and an orchestrator that reads `{ defaultEngine, fallbackEnabled }`
from a Firestore `settings/ai` document with safe defaults. Nothing edits that
document yet. This change adds the settings UI + endpoints to manage it.

The app already has the patterns to mirror:

- Settings sections in `app/ajustes/page.tsx` rendering manager components
  (`ReadersManager`, `ShelvesManager`).
- Client managers as a `use-*` hook + a `*-manager.tsx` component
  (`components/shelves/`), fetching `/api/*` endpoints.
- Server routes as an Express `Router` with zod validation and `requireAuth` on
  writes (`server/routes/shelves.ts`, ADR-0006/0009).

Settled constraints from #19a and exploration: API keys live only in Secret Manager
and are never sent to the browser; only the non-sensitive config (engine + toggle)
is client-editable.

## Goals / Non-Goals

**Goals:**

- An AI section in `/ajustes` to choose the default engine and toggle fallback,
  persisted to `settings/ai`.
- Per-engine connection status (`connected` / `not_configured` / `error`) and a
  "test connection" action.
- Auth-protected write endpoints; status/config readable by an authenticated reader.
- Claude Design handoff for the screen states, mapped to existing design tokens.

**Non-Goals:**

- No reading, writing, or display of API key values anywhere client-side.
- No key management UI (keys are provisioned out-of-band in Secret Manager).
- No changes to the `ai-provider` capability's requirements (#19a is consumed as-is).
- No photo/identification flows (those are #20/#21).

## Decisions

### D1 — Endpoints under `/api/ai`, writes behind `requireAuth`

`GET /api/ai/settings` → `{ config: AIConfig, engines: EngineStatus[] }`;
`PATCH /api/ai/settings` (auth) → validates `{ defaultEngine?, fallbackEnabled? }`
with zod, writes `settings/ai`, returns the updated config;
`POST /api/ai/test` (auth) → `{ engine }` runs a connection probe and returns
`{ status }`. Rationale: mirrors the shelves route (Router + zod + `requireAuth` on
mutations). Reads are auth-gated too since this is a settings surface for the two
house readers.

### D2 — Connection status is derived, never exposes keys

`EngineStatus = { engine, status: "connected" | "not_configured" | "error" }`. The
service computes `not_configured` from the provider's `isConfigured()` (key absent),
and for a configured engine runs a lightweight probe to distinguish `connected` from
`error`. No key value, masked or otherwise, is ever included in a response.
Rationale: the decision that the app never surfaces secrets (#19a D5).

### D3 — The probe is a minimal, no-image call in `services/ai/settings.ts`

Testing a key does not need a real vision request. The settings service issues the
cheapest authenticated call per SDK (e.g. a tiny/though minimal request) purely to
verify the credential, isolated in `services/ai/settings.ts`. Rationale: keeps the
`AIProvider` interface from #19a unchanged (no Modified Capability) and avoids
spending a vision call to test connectivity. Alternative considered: add
`testConnection()` to `AIProvider` — rejected to avoid modifying the shipped #19a
contract; revisit if a second consumer needs it.

### D4 — `GET /api/ai/settings` returns the same effective config the layer uses

The read endpoint returns `getAIConfig()` (with its safe defaults applied), so the UI
shows exactly what the orchestrator would use, including before the document is first
written. The first successful `PATCH` creates the `settings/ai` document.

### D5 — Client manager mirrors the shelves pattern

`components/ai-settings/use-ai-settings.ts` (fetch + optimistic refresh) +
`ai-settings-manager.tsx` (engine select, fallback toggle, per-engine status row with
a "test" button). A pure helper (status → label/variant mapping) is unit-tested like
`mergeShelfCounts`.

## Risks / Trade-offs

- **A slow/failing probe blocks the UI** → The test action is explicit and async with
  its own loading state; the page renders config immediately and probes only on
  demand. A probe timeout maps to `error`, not a hang.
- **Probe cost / rate limits** → Test is user-initiated, not on every render; uses the
  cheapest call available per SDK.
- **Writing an invalid engine value** → zod validates `defaultEngine` against the
  known engines before persisting; `getAIConfig()` also defends on read (#19a D4).
- **Auth gaps** → Writes use `requireAuth`; the probe endpoint is also auth-gated so
  an unauthenticated client cannot trigger paid calls.
- **Design drift from the base system** → The Claude Design handoff is validated
  against the existing design tokens/components before integration (QA step in tasks).

## Open Questions

- Exact minimal probe call per SDK (model-list vs. a 1-token request) — finalized
  during implementation against the installed SDK versions.
- Whether to also show the resolved fallback order in the UI (nice-to-have, deferred).
