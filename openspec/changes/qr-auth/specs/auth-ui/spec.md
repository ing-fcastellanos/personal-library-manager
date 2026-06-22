## MODIFIED Requirements

### Requirement: Contextual write gating

Read-only areas SHALL remain accessible without a session; initiating a **write** action without a session SHALL route the reader to the login view with a `next` that preserves the **full path and query string** of the action (ADR-0006). This ensures context carried in the query (e.g. a scanned `shelf`) survives sign-in.

#### Scenario: Unauthenticated write is redirected with full context
- **WHEN** an unauthenticated reader initiates a write action at a path that includes a query string (e.g. `?shelf=3`)
- **THEN** they are sent to the login view with `next` equal to that full path and query
- **AND** after signing in they are returned to the action with the query intact

#### Scenario: Reading needs no login
- **WHEN** an unauthenticated reader views a read-only area (e.g. the dashboard)
- **THEN** no login is required
