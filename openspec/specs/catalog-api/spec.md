# catalog-api Specification

## Purpose

TBD - created by archiving change catalog-repositories. Update Purpose after archive.

## Requirements

### Requirement: Catalog entity CRUD

The system SHALL provide create, read, update, and delete operations for each
catalog collection — `books`, `copies`, `readingEvents`, and `shelves` — through a
Firestore repository and a REST endpoint under `/api`. Inputs SHALL be validated with
the entity's zod `*CreateInput`/`*UpdateInput` schema (#5); the server SHALL manage
`id`, `createdAt`, and `updatedAt` and reject unknown or malformed input with `400`.

#### Scenario: Create a book with valid input

- **WHEN** a client `POST`s `/api/books` with a valid body (`title` present)
- **THEN** the system persists a `books` document with a server-generated id and
  `createdAt`/`updatedAt` timestamps and responds `201` with the created book

#### Scenario: Create with invalid input

- **WHEN** a client `POST`s to any catalog create endpoint with a body that fails the
  entity's zod schema (e.g. a book with an empty `title`)
- **THEN** the system responds `400` with validation details and persists nothing

#### Scenario: Get a missing document

- **WHEN** a client `GET`s `/api/{entity}/:id` for an id that does not exist
- **THEN** the system responds `404`

#### Scenario: Update merges only provided fields

- **WHEN** a client `PATCH`es `/api/{entity}/:id` with a partial valid body
- **THEN** the system updates only the provided fields, refreshes `updatedAt`, and
  responds `200` with the updated entity

### Requirement: Derived slug computation on book write

On creating or updating a `book`, the system SHALL compute the derived slug fields
`authorKeys` (from `authors`), `categoryKeys` (from `categories`), and `titleKey`
(from `title`) using a pure, deterministic normalization helper, so that filtering,
grouping, and prefix search operate on stable keys. The normalization SHALL lowercase,
strip diacritics, and reduce to a kebab/space-collapsed form; richer normalization is
deferred to enrichment (#13).

#### Scenario: Slugs derived on create

- **WHEN** a book is created with `authors: ["Gabriel García Márquez"]` and
  `title: "Cien Años de Soledad"`
- **THEN** the stored book has `authorKeys` containing `"gabriel-garcia-marquez"` and a
  `titleKey` of `"cien-anos-de-soledad"`

#### Scenario: Slugs recomputed on update

- **WHEN** a book's `authors` or `title` is changed via update
- **THEN** the corresponding `authorKeys`/`titleKey` are recomputed to match the new values

#### Scenario: Slug helper is pure and unit-tested

- **WHEN** the slug helper is called twice with the same input
- **THEN** it returns identical output with no I/O, and is covered by unit tests in the
  emulator-free test lane

### Requirement: ReadingEvent book snapshot composition

When a `readingEvent` is created, the system SHALL read the referenced `book` and store
a denormalized snapshot (`bookTitle`, `bookAuthors`, `isbn13`, `coverUrl`) on the event,
so reading history can be served without joining back to the book. The client SHALL NOT
be required to supply snapshot fields.

#### Scenario: Snapshot filled from the book on create

- **WHEN** a client `POST`s `/api/reading-events` with a `readerId` and a `bookId` that
  exists, supplying no snapshot fields
- **THEN** the created event carries `bookTitle`, `bookAuthors`, `isbn13`, and `coverUrl`
  copied from the referenced book at event time

### Requirement: Referential integrity on create

On creating an entity that references a parent, the system SHALL verify each referenced
parent exists before writing, and respond `400`/`404` (per the resource convention) when
a referenced parent is missing. This applies to `Copy.bookId` and optional `Copy.shelfId`,
and to `ReadingEvent.readerId`, `ReadingEvent.bookId`, and optional `ReadingEvent.copyId`.

#### Scenario: Copy referencing a missing book

- **WHEN** a client creates a copy whose `bookId` does not exist
- **THEN** the system rejects the request without writing the copy

#### Scenario: ReadingEvent referencing a missing reader

- **WHEN** a client creates a reading event whose `readerId` does not exist
- **THEN** the system rejects the request without writing the event

#### Scenario: Optional reference omitted is allowed

- **WHEN** a copy is created with no `shelfId`, or a reading event with no `copyId`
- **THEN** the create succeeds (the optional reference is valid when absent)

### Requirement: Referential integrity on delete

On deleting a `book` that still has children, the system SHALL block the delete with
`409`, EXCEPT that deleting a `shelf` SHALL desasociate its copies by nulling their
`shelfId` rather than blocking. Specifically: deleting a `book` with copies or reading
events SHALL be blocked; deleting a `shelf` SHALL succeed and unshelve any copies
referencing it. To protect reading events from a reader deletion (an operation owned by
the `readers` capability, not added here), the system SHALL expose a `readerHasEvents`
guard so that reader deletion can refuse to orphan reading events.

#### Scenario: Delete a book that still has copies

- **WHEN** a client deletes a book that is referenced by one or more copies
- **THEN** the system responds `409` and deletes nothing

#### Scenario: Delete a book that still has reading events

- **WHEN** a client deletes a book that is referenced by one or more reading events
- **THEN** the system responds `409` and deletes nothing

#### Scenario: Delete a shelf desasociates its copies

- **WHEN** a client deletes a shelf referenced by one or more copies
- **THEN** the system deletes the shelf, sets each referencing copy's `shelfId` to null,
  and responds success

#### Scenario: Delete a leaf book or shelf

- **WHEN** a client deletes a book or shelf with no children
- **THEN** the system deletes it and responds success

#### Scenario: Reader-events guard available

- **WHEN** the `readerHasEvents` guard is called for a reader with at least one event
- **THEN** it reports `true`, so reader deletion can block rather than orphan the events

### Requirement: Relationship queries

The system SHALL expose typed relationship reads so the catalog graph
(Book↔Copy↔ReadingEvent and Reader→ReadingEvent) is navigable via the API:
copies of a book, reading events of a book, and reading events of a reader.

#### Scenario: List copies of a book

- **WHEN** a client `GET`s the copies-of-book relationship endpoint for a book id
- **THEN** the system returns the copies whose `bookId` matches, ordered deterministically

#### Scenario: List reading events of a reader

- **WHEN** a client `GET`s the events-of-reader relationship endpoint for a reader id
- **THEN** the system returns that reader's reading events, ordered deterministically

### Requirement: Write authorization and attribution

Catalog read endpoints SHALL be public; catalog write endpoints (create, update, delete)
SHALL require a valid session (ADR-0006/0009). A created `readingEvent` SHALL be
attributed to the `readerId` supplied in the request body (validated to exist,
ADR-0013), not inferred solely from the session.

#### Scenario: Unauthenticated write is rejected

- **WHEN** a client without a valid session calls any catalog create/update/delete endpoint
- **THEN** the system responds `401` and performs no write

#### Scenario: Public read without a session

- **WHEN** a client without a session calls a catalog read or relationship endpoint
- **THEN** the system returns the data

#### Scenario: ReadingEvent attributed to body readerId

- **WHEN** an authenticated client creates a reading event with a `readerId` for a
  different reader than the session's
- **THEN** the event is attributed to the supplied `readerId` after it is validated to exist

### Requirement: Required composite indexes

The system SHALL declare the Firestore composite indexes required by its relationship
and ordered queries in a version-controlled `firestore.indexes.json` wired into
`firebase.json`, so the queries do not fail in production for want of an index.

#### Scenario: Indexes are declared in version control

- **WHEN** the repository relationship/ordered queries are reviewed
- **THEN** every query requiring a composite index has a matching entry in
  `firestore.indexes.json`, referenced by `firebase.json`

### Requirement: Emulator-backed integration tests

Repositories and cross-entity services SHALL be covered by integration tests that run
against the Firestore emulator in a dedicated test lane separate from the default
unit/CI lane, so the fast lane stays emulator-free while data-layer behavior is verified
end to end.

#### Scenario: Integration lane exercises the data layer

- **WHEN** the emulator-backed test lane is run
- **THEN** it boots the Firestore emulator and verifies CRUD, snapshot composition, and
  referential-integrity behavior against it

#### Scenario: Default lane stays emulator-free

- **WHEN** the default `npm test` (unit/CI) lane is run
- **THEN** it completes without requiring the Firestore emulator
