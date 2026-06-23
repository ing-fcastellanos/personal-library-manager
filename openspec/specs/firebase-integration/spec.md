# firebase-integration Specification

## Purpose

TBD - created by archiving change setup-firebase. Update Purpose after archive.

## Requirements

### Requirement: Server-side Admin SDK access

The system SHALL initialize the Firebase Admin SDK on the Express server as a lazily-created singleton, and SHALL authenticate via Application Default Credentials (ADC) in production with no service-account key files committed or shipped (ADR-0001). The Admin SDK SHALL be the access path for server-mediated reads and writes (ADR-0009).

#### Scenario: Admin SDK initialized once

- **WHEN** server code requests the Admin Firestore handle multiple times during a process
- **THEN** the same initialized Admin app instance is reused (no duplicate initialization)

#### Scenario: Production uses ADC, no key file

- **WHEN** the server runs on Cloud Run with a service account
- **THEN** the Admin SDK authenticates via ADC
- **AND** no service-account JSON key is required or present in the image

### Requirement: Client-side SDK access

The system SHALL initialize the Firebase Client SDK in the Next app as a lazily-created singleton, configured exclusively from public `NEXT_PUBLIC_FIREBASE_*` environment variables (which are not secrets). The Client SDK SHALL be used only for the direct-client cases permitted by ADR-0009.

#### Scenario: Client SDK initialized from public config

- **WHEN** the Next app initializes Firebase on the client
- **THEN** it uses the `NEXT_PUBLIC_FIREBASE_*` values
- **AND** initializes a single shared app instance

### Requirement: Emulator-aware development

The system SHALL connect both SDKs to the Firebase Emulator Suite (Firestore, Auth, Storage) when running in development, detected via the emulator host environment variables, so that local development and tests need no cloud project or credentials.

#### Scenario: Development connects to emulators

- **WHEN** the app starts in development with emulator host variables set
- **THEN** Admin and Client SDKs target the local emulators
- **AND** no real cloud project is contacted

#### Scenario: Production ignores emulators

- **WHEN** the app runs in production
- **THEN** neither SDK connects to an emulator and both target the real project

### Requirement: Deny-by-default security rules

The system SHALL ship Firestore and Storage security rules that **deny all client access by default**, opening only the minimal, explicit paths required by the permitted direct-client cases (ADR-0009). Until those features land, the openings remain effectively closed.

#### Scenario: Unauthorized client access denied

- **WHEN** an unauthenticated client attempts to read or write Firestore or Storage directly
- **THEN** the security rules deny the operation

#### Scenario: Server access is unaffected

- **WHEN** the Express server accesses data via the Admin SDK
- **THEN** the operation succeeds regardless of client security rules (Admin bypasses rules)

### Requirement: Firestore readiness check

The system SHALL expose `GET /api/health/ready` that verifies Firestore connectivity and returns `200` when reachable and `503` when not, distinct from the liveness endpoint `GET /api/health`.

#### Scenario: Firestore reachable

- **WHEN** Firestore (or its emulator) is reachable and a client calls `GET /api/health/ready`
- **THEN** the response status is `200` with a JSON body indicating readiness

#### Scenario: Firestore unreachable

- **WHEN** Firestore cannot be reached and a client calls `GET /api/health/ready`
- **THEN** the response status is `503`
- **AND** liveness `GET /api/health` still returns `200`
