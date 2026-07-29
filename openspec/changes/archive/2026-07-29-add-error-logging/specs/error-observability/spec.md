## ADDED Requirements

### Requirement: Internal errors are logged before responding

When a server request handler fails and responds with a generic internal error, the system SHALL log the cause — including the error and enough context to identify the failing route or operation — to the server's standard error stream before sending the response. The client-facing response SHALL remain a generic `500 {"error":"internal"}` with no internal detail.

#### Scenario: A failing handler logs its cause

- **WHEN** a request handler's operation throws and the handler responds with the generic internal error
- **THEN** the server writes the error (with its stack) and a context tag identifying the route/operation to standard error
- **AND** the client still receives `500` with body `{"error":"internal"}` and no internal detail

#### Scenario: Response is unchanged from before

- **WHEN** the same failure occurs that previously produced `500 {"error":"internal"}`
- **THEN** the status code and body sent to the client are identical to before this change (only server-side logging is added)

### Requirement: Shared internal-error responder

The system SHALL provide a single reusable helper that logs an error together with the request's method and path and sends the generic `500 {"error":"internal"}` response, so every route handler produces a consistent log shape and cannot respond to an internal failure without logging it.

#### Scenario: Helper logs and responds

- **WHEN** a handler calls the shared responder with the request, the response, and an error
- **THEN** the helper logs the request's method and path and the error (with its stack) to standard error
- **AND** sends `500` with body `{"error":"internal"}`

#### Scenario: Route handlers use the shared responder

- **WHEN** the `server/routes/*` handlers that previously responded with an inline generic `500` are reviewed
- **THEN** each uses the shared responder (so none swallows the error silently)

### Requirement: Central error-handling backstop

The system SHALL register a central Express error-handling middleware, after the API routers, that logs any error escaping a route handler — a synchronous throw, a request-body parse error, or an uncaught rejection surfaced to Express — with the request method and path, and responds `500 {"error":"internal"}`. It SHALL guard the `/api` surface only and SHALL NOT intercept the Next.js web routes.

#### Scenario: An escaped error is logged, not silent

- **WHEN** an `/api` request triggers an error that no route handler catches (e.g. a malformed JSON body rejected by the body parser)
- **THEN** the central middleware logs the error with the request method and path
- **AND** responds `500` with body `{"error":"internal"}`

#### Scenario: Web routes are not intercepted

- **WHEN** a non-`/api` (Next.js) route is requested
- **THEN** the central API error middleware does not handle it; Next.js serves the route

### Requirement: Readiness probe logs its failure cause

The readiness endpoint `GET /api/health/ready` SHALL log the connectivity error it encounters before responding `503`, so a failing readiness probe is diagnosable from the logs. Its response body SHALL remain unchanged.

#### Scenario: Failed readiness logs the cause

- **WHEN** the readiness check cannot reach Firestore (or times out)
- **THEN** the server logs the underlying error to standard error
- **AND** responds `503` with body `{"status":"unavailable"}`

#### Scenario: Successful readiness is unaffected

- **WHEN** the readiness check reaches Firestore within the timeout
- **THEN** it responds `200` with body `{"status":"ready"}` and logs nothing
