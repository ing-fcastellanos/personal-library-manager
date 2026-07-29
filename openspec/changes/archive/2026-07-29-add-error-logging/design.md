## Context

`server/routes/*` handlers follow one shape: `try { … } catch { res.status(500).json({ error: "internal" }) }`. The generic body is deliberate (ADR-0009 — don't leak internals to clients), but the `catch` also drops the error entirely, so nothing reaches the logs. On Cloud Run (ADR-0001) stdout/stderr **is** the log stream, so a `console.error` is all that's needed to make failures visible — there is no logging infrastructure to build. The scope is deliberately narrow: make the cause visible without changing a single client-facing response.

## Goals / Non-Goals

**Goals:**

- Every internal failure logs its cause with enough context (route/operation) to diagnose from the log alone.
- No unhandled error is ever answered silently — a central backstop covers what the per-handler `catch` blocks miss.
- Client responses (status + body) are byte-identical to today.

**Non-Goals:**

- Structured/JSON logging, a logging library, or log levels — `console.error` to stdout/stderr is what Cloud Run captures.
- Request-id correlation, tracing, or error reporting/alerting (Sentry, Error Reporting) — a larger, separate concern.
- Leaking error detail to clients — the body stays `{"error":"internal"}`.

## Decisions

**D1 — A shared helper per `catch`, plus a central middleware backstop — not middleware alone.**
Two layers, each covering the other's gap:

- **`respondInternal(res, err, context)`** — logs `console.error` with a stable, greppable context tag and the error, then sends `500 {"error":"internal"}`. Replacing the ≈43 inline responders with this is a mechanical, low-risk edit that touches only the failing branch and keeps every handler's control flow exactly as-is.
- **Central Express error middleware** `(err, req, res, next)` mounted after the routers — logs and responds `500 {"error":"internal"}` for anything that escapes a handler: a synchronous throw before the `try`, an `express.json` body-parse error (which Express routes to error middleware, not the handler's `catch`), or a handler that simply forgot to catch.

Considered **middleware-only** (handlers call `next(err)` instead of catching): rejected because it forces refactoring all 14 route files' control flow — every handler would drop its `try/catch` and rely on an `asyncHandler` wrapper — a large, riskier change for the same observable outcome. The two-layer approach gets full coverage with a mechanical edit now and leaves the door open to adopt `next(err)` later.

Considered **per-`catch` inline `console.error`** (no helper): rejected — 43 copies of the same log line drift in format and are easy to omit on the next new route. One helper gives a single, consistent log shape and an obvious thing to reach for.

**D2 — Context is derived from the request (method + path), not a hand-written tag.**
`respondInternal(res, req, err)` — the helper logs `\`[${req.method} ${req.originalUrl}]\``. Every Express handler already has `req` in scope in its `catch`, so this makes **all ≈43 call sites identical** (a per-file `replace_all`, low-risk and impossible to mis-tag), gives an unambiguous, greppable identifier (`grep '\[POST /api/wishlist-items'`), and **unifies the helper's log shape with the central middleware's** (which also logs method + path). An earlier draft used a caller-supplied string tag (`"wishlist.acquire"`); rejected once the migration made clear that 43 unique hand-written tags are error-prone and drift, for no diagnostic gain over method + path.

**D3 — Log signature: `console.error(\`[${req.method} ${req.originalUrl}]\`, err)`.**
Passing the `Error` object (not `err.message`) to `console.error` prints the stack. The bracketed method + path is greppable. One argument shape everywhere — helper and middleware alike.

**D4 — Middleware mount point: after all API routers, before the Next.js catch-all.**
Express error middleware must be registered last among the handlers it guards. It is mounted after `app.use("/api", …)` routers so it catches their escapes and `express.json` parse errors, and scoped so it never intercepts Next.js SSR (which has its own error handling). It only ever responds for `/api/*`; anything else falls through to Next.

**D5 — Readiness logs before `503`.**
`GET /api/health/ready` swallows the connectivity error today. It logs the cause (via the same helper pattern, or a direct `console.error`) before responding `503 {"status":"unavailable"}` — the exact case that made the #3 deploy hard to diagnose. Its `503` body is unchanged.

## Risks / Trade-offs

- **[Risk]** Logging an error object could include sensitive data (e.g. a value in a Firestore error). → **Mitigation:** logs go only to the server's stdout/stderr (Cloud Run logs), never to the client body; this is standard server logging and the errors here are infrastructure/validation failures, not user secrets. No PII is deliberately logged.
- **[Trade-off]** Two layers (helper + middleware) instead of one. → Accepted: the helper covers the common caught path with zero control-flow change; the middleware covers the uncommon escaped path. Neither alone is complete.
- **[Risk]** A very chatty failure (e.g. Firestore down) could flood logs. → Accepted at this app's scale; log-volume controls are out of scope and a Cloud Run concern.

## Migration Plan

Purely additive: a new helper + middleware, and a mechanical swap of the inline `500` responders. No client contract, data, or config changes. Rollback is a normal revert; a partially-applied swap is still correct (un-migrated handlers keep responding `500` as before, just without the log).

## Open Questions

None — scope is intentionally minimal (log the cause; keep responses identical). Structured logging / error reporting are noted as explicit non-goals for a future change.
