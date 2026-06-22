# qr-auth Specification

## Purpose
TBD - created by archiving change qr-auth. Update Purpose after archive.
## Requirements
### Requirement: Scan action resolver

The system SHALL provide a `/scan` entry that maps a QR's intent to an app route: `GET /scan?action=<action>&shelf=<id>` resolves `action` (`dashboard` → `/`, `add` → `/agregar`, `finish` → `/leido`) and redirects, preserving the `shelf` parameter. Unknown or missing actions SHALL fall back to the dashboard.

#### Scenario: Add action resolves to its route
- **WHEN** a client opens `/scan?action=add&shelf=3`
- **THEN** it is redirected to the add route with `shelf=3` carried along

#### Scenario: Dashboard action resolves to home
- **WHEN** a client opens `/scan?action=dashboard`
- **THEN** it is redirected to `/`

#### Scenario: Unknown action falls back
- **WHEN** a client opens `/scan` with a missing or unrecognized `action`
- **THEN** it is redirected to the dashboard

### Requirement: Shelf context propagation

The system SHALL capture a `shelf` parameter arriving from a scan and expose it via a client context, surviving in-app navigation and the login round-trip, so later flows can default to that shelf. This change SHALL NOT implement actual shelf preselection (deferred to #18).

#### Scenario: Shelf is captured from the URL
- **WHEN** a route loads with `?shelf=<id>`
- **THEN** the shelf context exposes `<id>` to descendant components

#### Scenario: Shelf survives sign-in
- **WHEN** an unauthenticated reader scans a write action carrying a shelf and signs in
- **THEN** they return to the action with the same shelf still in context

### Requirement: QR carries no credential

The QR codes SHALL encode only a deep link (action + shelf) and never an authentication token or credential (ADR-0006). `dashboard` SHALL be reachable without a session; `add` and `finish` SHALL require a session via the existing contextual gating. On an enrolled device the session is already present (ADR-0012); a new device authenticates once and returns to the action.

#### Scenario: Read action needs no session
- **WHEN** any device opens the dashboard scan link
- **THEN** the dashboard is shown without requiring a session

#### Scenario: Write action requires a session
- **WHEN** an unauthenticated device opens a write scan link
- **THEN** it is routed to sign in, and no access is granted by the QR itself

