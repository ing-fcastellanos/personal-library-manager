# auth-ui Specification

## Purpose
TBD - created by archiving change auth-ui. Update Purpose after archive.
## Requirements
### Requirement: Client auth state

The system SHALL provide a client auth context (`AuthProvider` + `useAuth`) that resolves the current reader from `/api/auth/me` (server is the source of truth) and exposes loading and refresh. On load, if the server reports no session but the Client SDK has a persisted login, it SHALL attempt a **silent re-mint** (fresh ID token → session exchange) before concluding the user is signed out (ADR-0012).

#### Scenario: Authenticated state resolved
- **WHEN** a reader with a valid session opens the app
- **THEN** `useAuth` reports the current reader after loading

#### Scenario: Silent re-mint on expired cookie
- **WHEN** the server session has expired but the Client SDK still has a persisted login
- **THEN** the provider silently re-establishes the session and reports the reader

#### Scenario: Signed-out state
- **WHEN** there is no session and no persisted login
- **THEN** `useAuth` reports no reader

### Requirement: Magic-link login

The system SHALL provide a login view where a reader enters their email to receive a magic link, showing a confirmation state after sending. The view SHALL accept a `next` redirect target.

#### Scenario: Request a magic link
- **WHEN** a reader submits their email on the login view
- **THEN** a sign-in link is sent and the UI shows a "check your email" confirmation

### Requirement: Sign-in callback

The system SHALL provide a callback route that completes a magic-link sign-in, exchanges the ID token for a session, and redirects to the `next` target (or home), with explicit loading and error states.

#### Scenario: Completing the link signs in
- **WHEN** a reader opens the magic link
- **THEN** the callback establishes a session and redirects to the intended destination

#### Scenario: Invalid or expired link
- **WHEN** the callback cannot complete the sign-in
- **THEN** an error state is shown with a way to retry from the login view

### Requirement: Contextual write gating

Read-only areas SHALL remain accessible without a session; initiating a **write** action without a session SHALL route the reader to the login view with a `next` back to the action (ADR-0006).

#### Scenario: Unauthenticated write is redirected
- **WHEN** an unauthenticated reader initiates a write action
- **THEN** they are sent to the login view and returned to the action after signing in

#### Scenario: Reading needs no login
- **WHEN** an unauthenticated reader views a read-only area (e.g. the dashboard)
- **THEN** no login is required

### Requirement: Header auth control

The header SHALL reflect auth state: when authenticated it shows the current reader (avatar) with a menu to sign out; when unauthenticated it shows a sign-in action.

#### Scenario: Authenticated header
- **WHEN** a reader is signed in
- **THEN** the header shows their avatar and a sign-out option

#### Scenario: Sign out
- **WHEN** the reader chooses sign out
- **THEN** the session is cleared and the header shows the sign-in action

### Requirement: PIN setup and reusable PIN-pad

The system SHALL provide a mobile-friendly numeric **PIN-pad** component and a flow for an authenticated reader to set/change their PIN (via the PIN backend). The PIN-pad SHALL be reusable by the reader-switch flow (#11).

#### Scenario: Set a PIN
- **WHEN** an authenticated reader enters a new PIN twice and confirms
- **THEN** the PIN is saved via the backend and a success state is shown

#### Scenario: PIN-pad is reusable
- **WHEN** another flow needs PIN entry
- **THEN** it can mount the same PIN-pad component

