## Why

During the first Cloud Run deploy (#3), every Firestore read returned `500 {"error":"internal"}` and `/api/health/ready` returned `503`, but **the Cloud Run logs showed no cause** — the route handlers catch the exception and respond generically without logging the stack. The real cause (the Firestore `(default)` database did not exist) took far longer to diagnose than it should have. The same blind spot resurfaced diagnosing the local emulator during #37. In production, a swallowed error is an invisible failure (#65).

## What Changes

- A shared server error helper `respondInternal(res, err, context)` that `console.error`s the error **with context** (which route/operation failed) and then responds with the **same** generic `500 {"error":"internal"}` body — no internal detail leaks to the client.
- Every route handler `catch` that currently responds `res.status(500).json({ error: "internal" })` (≈43 sites across 14 files in `server/routes/*`) is replaced with the helper, so the cause is always logged.
- A **central Express error-handling middleware** mounted after the routers as a backstop: it logs and responds `500 {"error":"internal"}` for any error that escapes a handler (a synchronous throw before/around the try, an `express.json` body-parse error, a handler that forgot to catch).
- `GET /api/health/ready` logs the connectivity error before responding `503`, so a failing readiness probe is diagnosable.
- Client-facing responses (status codes and bodies) are unchanged — this is purely additive server-side logging.

## Capabilities

### New Capabilities

- `error-observability`: the server logs the cause of internal failures (with route/operation context) before responding, and a central middleware guarantees no unhandled error is answered silently — without leaking internal detail to clients.

### Modified Capabilities

(none — no existing requirement's client-facing behavior changes; the `500`/`503` responses stay byte-identical. This adds new server-side logging behavior only.)

## Impact

- **New code:** a small error helper (e.g. `server/lib/errors.ts`) and a central error-handling middleware (e.g. `server/middleware/error-handler.ts`), registered in `server/index.ts` after the routers and before/around the Next.js catch-all.
- **Touched (mechanical):** the ≈43 `catch { res.status(500).json({ error: "internal" }) }` sites in `server/routes/*` swap the inline response for the helper; `server/routes/health.ts` logs before its `503`.
- **No change** to client contracts, data model, or any `GET`/`POST` response shape. No new dependency (uses `console.error`, which Cloud Run captures to stdout/stderr, per ADR-0001).
- **Out of scope:** structured/JSON logging or a logging library, log levels/config, request-id correlation, and error reporting/alerting (e.g. Error Reporting/Sentry) — this change only makes the cause visible in the existing log stream.
