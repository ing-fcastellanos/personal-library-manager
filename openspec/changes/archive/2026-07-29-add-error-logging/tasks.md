## 1. Shared error responder

- [x] 1.1 Create `server/lib/errors.ts` exporting `respondInternal(res, req, err)`: `console.error(\`[${req.method} ${req.originalUrl}]\`, err)` then `res.status(500).json({ error: "internal" })` (design D1–D3). Typed against Express `Request`/`Response`.
- [x] 1.2 Unit test (node lane): calling it with a spied `console.error` logs the request method + path and the error object, and sends status `500` with body `{ error: "internal" }`; the response is byte-identical to the previous inline responder.

## 2. Central error-handling middleware

- [x] 2.1 Create `server/middleware/error-handler.ts`: an Express error middleware `(err, req, res, next)` that logs `req.method` + `req.originalUrl` + the error, and — if the response is not already sent — responds `500 { error: "internal" }` (design D4). If headers were already sent, delegate to `next(err)`.
- [x] 2.2 Register it in `server/index.ts` **after** all `app.use("/api", …)` routers and **before** the Next.js catch-all, scoped so it guards `/api` only and never intercepts Next SSR.
- [x] 2.3 Route test: a malformed-JSON body to an `/api` write route is caught by the middleware — it logs (method + path) and responds `500 { error: "internal" }`; a non-`/api` route is not intercepted.

## 3. Migrate route handlers to the shared responder

- [x] 3.1 Replace every inline `res.status(500).json({ error: "internal" })` in `server/routes/*` with `respondInternal(res, req, err)` (uniform call — method + path come from `req`, design D2). Files: `ai-identify`, `ai-settings`, `ai-shelf`, `books`, `catalog`, `copies`, `cover`, `duplicates`, `enrich`, `intake`, `readers`, `reading-events`, `shelves`, `wishlist` (≈43 sites, 14 files). Bind the caught error into each `catch (err)` (many are currently bare `catch {}`).
- [x] 3.2 Confirm no client-facing status/body changed — the swap only adds the log; every `500 { error: "internal" }` stays identical.

## 4. Readiness probe logging

- [x] 4.1 In `server/routes/health.ts`, log the connectivity error in the `/api/health/ready` catch before responding `503 { status: "unavailable" }` (design D5). Bind the error into the catch.
- [x] 4.2 Route/unit test: a failing readiness check (mock the Firestore call to reject) logs the cause and still responds `503 { status: "unavailable" }`; a successful check responds `200 { status: "ready" }` and logs nothing.

## 5. Verify

- [x] 5.1 `npm test` (node + jsdom lanes) green; `typecheck` and `lint` clean.
- [x] 5.2 Spot-check a handler locally: force a failure (e.g. hit a write route with the emulator down) and confirm the server log shows `[<router>.<op>]` with the stack, while the client still gets `500 { error: "internal" }`.
