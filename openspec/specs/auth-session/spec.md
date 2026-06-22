# auth-session Specification

## Purpose
TBD - created by archiving change auth-session. Update Purpose after archive.
## Requirements
### Requirement: Session establishment from a Firebase ID token

The system SHALL exchange a valid Firebase ID token for an httpOnly, secure **session cookie** via `POST /api/auth/session`, created with the Admin SDK (ADR-0011). The exchange SHALL be protected against CSRF (double-submit token). The cookie lifetime SHALL NOT exceed 14 days.

#### Scenario: Valid token establishes a session
- **WHEN** a client posts a valid Firebase ID token (with a valid CSRF token) for a known reader
- **THEN** the server responds with an httpOnly session cookie and success

#### Scenario: Missing/invalid CSRF rejected
- **WHEN** the token exchange is attempted without a valid CSRF token
- **THEN** the request is rejected and no session cookie is issued

### Requirement: First-login linking with closed membership

On session establishment, the system SHALL match the token's **verified email** to a reader. If a match exists and the reader has no `uid`, it SHALL link the `uid` (`assignUid`). If the email matches **no** reader, or the reader is already linked to a **different** `uid`, the system SHALL reject the request and establish **no** session (closed membership, ADR-0012).

#### Scenario: First login links the reader
- **WHEN** a reader signs in for the first time with the email registered on their reader profile
- **THEN** the reader's `uid` is linked and a session is established

#### Scenario: Unknown email rejected
- **WHEN** a sign-in presents a verified email that matches no reader
- **THEN** the request is rejected with no session created

### Requirement: Server-authoritative authorization

The system SHALL verify the session cookie on the server and expose the authenticated reader via a `requireAuth` Express middleware, a `getCurrentReader()` server helper (usable from RSC and API), and `GET /api/auth/me`. The client SHALL treat the server as the source of truth for auth state.

#### Scenario: Protected request with valid session
- **WHEN** a request with a valid session cookie hits a `requireAuth` route
- **THEN** the request proceeds with the current reader resolved

#### Scenario: Protected request without a session
- **WHEN** a request without a valid session cookie hits a `requireAuth` route
- **THEN** the request is rejected with `401`

#### Scenario: Auth state from the server
- **WHEN** the client calls `GET /api/auth/me` with a valid session
- **THEN** it receives the current reader; otherwise it receives an unauthenticated response

### Requirement: Protected write actions

The system SHALL require a valid session for write operations, including the existing reader write routes (`PATCH /api/readers/:id`). Read-only endpoints MAY remain public per ADR-0006.

#### Scenario: Unauthenticated write rejected
- **WHEN** an unauthenticated client attempts `PATCH /api/readers/:id`
- **THEN** the request is rejected with `401`

### Requirement: Logout

The system SHALL provide `DELETE /api/auth/session` that clears the session cookie and revokes the session.

#### Scenario: Logout clears the session
- **WHEN** an authenticated client calls `DELETE /api/auth/session`
- **THEN** the session cookie is cleared and subsequent protected requests are rejected

### Requirement: PIN backend for reader switching

The system SHALL allow an authenticated reader to set/change a short **PIN** via `POST /api/auth/pin`, stored **hashed** (scrypt) in `reader.pinHash`. It SHALL verify a PIN via `POST /api/auth/pin/verify`, **rate-limited** with lockout after repeated failures. The PIN SHALL be used only to authorize switching the active reader (#11) and SHALL never mint identity by itself (ADR-0012).

#### Scenario: Set and verify a PIN
- **WHEN** an authenticated reader sets a PIN and later submits the same PIN to verify
- **THEN** the set stores only a hash and the verify succeeds

#### Scenario: Repeated wrong PINs are locked out
- **WHEN** a PIN is verified incorrectly more than the allowed number of attempts
- **THEN** further attempts are rejected until the lockout window passes

