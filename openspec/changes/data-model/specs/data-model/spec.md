## ADDED Requirements

### Requirement: Domain schema document

The system SHALL provide `docs/data-model.md` as the canonical description of the
Firestore schema for the library domain, covering the `books`, `copies`,
`readingEvents`, and `shelves` collections alongside the existing `readers`
collection, including each document shape, the reference relationships between them,
the denormalization and key-strategy decisions, and the composite-index plan.

#### Scenario: Documented collections

- **WHEN** a developer reads `docs/data-model.md` before implementing #12
- **THEN** it describes the `books`, `copies`, `readingEvents`, and `shelves`
  collections with their fields, their id-string references to one another, and the
  list of composite indexes those queries require

#### Scenario: Documented reserved entities

- **WHEN** a developer looks for future entities (Series, Loan, Wishlist, AuditLog,
  ImportSession, reading goals)
- **THEN** the document sketches where each will slot in **without** defining them as
  implemented collections in this change

### Requirement: Shared book type

The system SHALL define a `Book` zod schema and inferred TypeScript type in
`lib/types/book.ts`, following the `lib/types/reader.ts` conventions (zod schema,
inferred type, create/update input schemas, ISO-string timestamps). A `Book` SHALL
represent a canonical edition with `authors` and `categories` as display string
arrays plus normalized `authorKeys` and `categoryKeys` slug arrays, optional
`isbn13`/`isbn10`, and an optional `workKey` for soft grouping. The book document key
SHALL be a Firestore auto-id, not the ISBN.

#### Scenario: Valid book accepted

- **WHEN** a book object with a non-empty `title`, `authors`, `authorKeys`,
  `categories`, `categoryKeys`, and ISO `createdAt`/`updatedAt` is parsed by the
  schema
- **THEN** it validates successfully

#### Scenario: Missing title rejected

- **WHEN** a book object without a `title` (or with an empty `title`) is parsed
- **THEN** the schema rejects it

#### Scenario: ISBN is a field, not the key

- **WHEN** the schema and document model are inspected
- **THEN** `isbn13`/`isbn10` are optional document fields and the document id is an
  auto-generated id (a book without any ISBN is still valid)

### Requirement: Shared copy type

The system SHALL define a `Copy` zod schema and inferred type in `lib/types/copy.ts`
representing a physical owned copy. A `Copy` SHALL reference its `bookId` (required)
and an optional `shelfId`, and carry optional `condition`, `acquiredAt`, and `notes`,
with ISO-string timestamps.

#### Scenario: Copy requires a book reference

- **WHEN** a copy object is parsed without a `bookId`
- **THEN** the schema rejects it

#### Scenario: Copy without a shelf is valid

- **WHEN** a copy object has a `bookId` but no `shelfId`
- **THEN** it validates successfully (an unshelved copy is allowed)

### Requirement: Shared reading-event type

The system SHALL define a `ReadingEvent` zod schema and inferred type in
`lib/types/reading-event.ts`. A `ReadingEvent` SHALL require `readerId` and `bookId`,
treat `copyId` as optional, carry a reading `status`, optional `dateStarted`,
`dateFinished`, `rating`, and `review`, and SHALL include a denormalized snapshot of
the book at event time (`bookTitle`, `bookAuthors`, optional `isbn13`, optional
`coverUrl`) so history and export do not require a join.

#### Scenario: Event requires reader and book

- **WHEN** a reading-event object is parsed without a `readerId` or without a
  `bookId`
- **THEN** the schema rejects it

#### Scenario: Event without a copy is valid

- **WHEN** a reading-event object has `readerId` and `bookId` but no `copyId` (e.g.
  an imported reading with no physical copy)
- **THEN** it validates successfully

#### Scenario: Snapshot fields present

- **WHEN** a valid reading-event is inspected
- **THEN** it carries the denormalized `bookTitle` and `bookAuthors` captured at
  event time independent of the live `books` document

### Requirement: Shared shelf type

The system SHALL define a `Shelf` zod schema and inferred type in
`lib/types/shelf.ts` representing a physical location, with a required `name` and
optional `location` and `description`, and ISO-string timestamps.

#### Scenario: Valid shelf accepted

- **WHEN** a shelf object with a non-empty `name` and ISO timestamps is parsed
- **THEN** it validates successfully

#### Scenario: Missing name rejected

- **WHEN** a shelf object without a `name` is parsed
- **THEN** the schema rejects it

### Requirement: Read status is derivable

The schema SHALL support deriving a per-reader read/pending status from reading
events without a denormalized status flag on `books` or `copies`. A book SHALL be
considered read by a reader when a `ReadingEvent` exists for that `readerId` and
`bookId` with a finished status.

#### Scenario: No denormalized read flag

- **WHEN** the `Book` and `Copy` schemas are inspected
- **THEN** neither carries a per-reader `readStatus`/`read` flag; read state is
  expressed only through `readingEvents`

#### Scenario: Index supports the derivation

- **WHEN** `docs/data-model.md` is inspected for the read/pending query
- **THEN** it lists a composite index on `readingEvents` over `readerId`, `status`,
  and `dateFinished` that supports computing a reader's read and pending sets
