## ADDED Requirements

### Requirement: Google Books rate-limit retry

When a Google Books request fails with HTTP 429, the system SHALL retry that request up to 2
additional times with exponential backoff before treating it as a failed source. Any other
failure (network error, timeout, non-429 HTTP status) SHALL NOT be retried and SHALL degrade
immediately the same way it does today.

#### Scenario: A rate-limited call succeeds on retry

- **WHEN** a Google Books request responds `429` and a subsequent retry within the backoff
  window responds `200` with results
- **THEN** the caller (`enrichByIsbn` or `searchByText`) receives those results as if the first
  call had succeeded, with no indication to the end user that a retry occurred

#### Scenario: A rate-limited call exhausts its retries

- **WHEN** a Google Books request responds `429` on the initial attempt and on both retries
- **THEN** the system treats Google Books as unavailable for that request — falling back to
  Open Library for a text search, or resolving to no candidate for an ISBN lookup — the same
  degraded outcome as any other exhausted/unavailable source

#### Scenario: A non-429 failure is not retried

- **WHEN** a Google Books request fails with a network error, a timeout, or a non-429 HTTP
  status
- **THEN** the system treats it as an unavailable source immediately, without waiting through a
  backoff retry

### Requirement: Missing Google Books API key is visible at startup

When the server starts without `GOOGLE_BOOKS_API_KEY` configured, the system SHALL emit a
startup-time log noting that Google Books requests will run against the stricter anonymous quota,
so the degraded configuration is discoverable in server logs rather than only inferable from
downstream 429s.

#### Scenario: Startup without the key logs a notice

- **WHEN** the server process starts and `GOOGLE_BOOKS_API_KEY` is unset or empty
- **THEN** a log line is emitted at startup noting that Google Books enrichment is running
  without an API key
