## ADDED Requirements

### Requirement: Reader entity

The system SHALL define a `Reader` stored at `readers/{id}` with a stable `id`, a `name`, an optional `avatar` and `displayColor`, an optional `goodreadsUrl`, and an extensible `preferences` map. Reader writes SHALL be validated against a schema (zod) before persisting.

#### Scenario: Valid reader persisted
- **WHEN** a reader is created or updated with a valid name
- **THEN** the reader is stored with its stable `id` and the provided fields

#### Scenario: Invalid reader rejected
- **WHEN** a reader write is attempted with an invalid payload (e.g. empty name)
- **THEN** the operation is rejected with a validation error and nothing is persisted

### Requirement: Server-mediated reader access

The system SHALL expose reader operations through the Express `/api/readers` surface using the Admin SDK (ADR-0009), supporting at least: list readers, get a reader, and update a reader's profile. Direct client access to the `readers` collection SHALL remain denied by the security rules.

#### Scenario: List readers via API
- **WHEN** a client requests `GET /api/readers`
- **THEN** the server returns the readers from Firestore

#### Scenario: Direct client access denied
- **WHEN** an unauthenticated client tries to read `readers` directly via the client SDK
- **THEN** the Firestore security rules deny it (access is server-mediated only)

### Requirement: The two household readers exist

The system SHALL provide a bootstrap that seeds the two household readers, so the rest of the app can attribute to a reader from the start.

#### Scenario: Seed creates both readers
- **WHEN** the bootstrap/seed runs on an empty `readers` collection
- **THEN** two readers exist, each with a name and a stable `id`

#### Scenario: Seed is idempotent
- **WHEN** the bootstrap/seed runs again
- **THEN** it does not create duplicate readers

### Requirement: Reader-to-Firebase-user link

Each `Reader` SHALL carry an optional `uid` that links it 1:1 to a Firebase Auth user (ADR-0011). The `uid` SHALL be unique across readers (a Firebase user maps to at most one reader). It MAY be unset until authentication (#7) associates it at first login.

#### Scenario: Reader unlinked before auth
- **WHEN** a reader is seeded before any authentication exists
- **THEN** the reader is valid with no `uid` set

#### Scenario: uid uniqueness enforced
- **WHEN** a `uid` is assigned to a reader and the same `uid` is assigned to another reader
- **THEN** the second assignment is rejected to preserve the 1:1 mapping

### Requirement: Profile management

The system SHALL provide a profile-management view (in Settings) to see the readers and edit a reader's `name`, `avatar`, `displayColor` and `goodreadsUrl`, built from the existing design-system primitives.

#### Scenario: Edit a reader profile
- **WHEN** a user edits a reader's name and Goodreads URL and saves
- **THEN** the changes persist and are reflected on reload
