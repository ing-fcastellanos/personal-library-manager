# data-model Specification

## Purpose

TBD - created by archiving change data-model. Update Purpose after archive.

## Requirements

### Requirement: Domain schema document

The system SHALL provide `docs/data-model.md` as the canonical description of the
Firestore schema for the library domain, covering the `books`, `copies`,
`readingEvents`, `shelves`, `wishlistItems`, `loans`, and `series` collections alongside
the existing `readers` collection, including each document shape, the reference
relationships between them, the denormalization and key-strategy decisions, and the
composite-index plan. Where an entity is implemented with a shape different from the
one previously sketched for it in the reserved-entities table, the document SHALL
record the reason.

#### Scenario: Documented collections

- **WHEN** a developer reads `docs/data-model.md` before implementing #12
- **THEN** it describes the `books`, `copies`, `readingEvents`, `shelves`,
  `wishlistItems`, `loans`, and `series` collections with their fields, their
  id-string references to one another, and the list of composite indexes those
  queries require

#### Scenario: Documented reserved entities

- **WHEN** a developer looks for future entities (AuditLog, ImportSession, reading
  goals)
- **THEN** the document sketches where each will slot in **without** defining them as
  implemented collections

#### Scenario: Loan is no longer reserved

- **WHEN** a developer reads the reserved-entities table
- **THEN** Préstamo/Loan is absent from it, because `loans` is now an implemented
  collection documented alongside the others
- **AND** the document records that the implemented shape (a dedicated collection keyed
  by `copyId`) deliberately supersedes the reserved shape (a field/subcollection on
  `copy`), because a field can hold only the current loan, not history

#### Scenario: Series is no longer reserved

- **WHEN** a developer reads the reserved-entities table
- **THEN** Series is absent from it, because `series` is now an implemented collection
  documented alongside the others
- **AND** the document records that the implemented shape (a `series` collection whose
  volumes reference `bookId`) deliberately supersedes the reserved shape
  (`book.workKey` + a future series doc), because `workKey` groups editions of one
  volume, not distinct volumes of a saga, and was never populated by any code path

### Requirement: Shared book type

The system SHALL define a `Book` zod schema and inferred TypeScript type in
`lib/types/book.ts`, following the `lib/types/reader.ts` conventions (zod schema,
inferred type, create/update input schemas, ISO-string timestamps). A `Book` SHALL
represent a canonical edition with `authors` and `categories` as display string
arrays plus normalized `authorKeys` and `categoryKeys` slug arrays, optional
`isbn13`/`isbn10`, and an optional `workKey` for soft grouping. The book document key
SHALL be a Firestore auto-id, not the ISBN. A `Book` SHALL also carry an optional
`coverSource` field of `"metadata" | "user"` that records whether the current cover
came from metadata enrichment or was uploaded by a reader (#15), so re-enrichment can
avoid overwriting a user-uploaded cover.

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

#### Scenario: Cover source recorded

- **WHEN** a reader uploads a cover for a book
- **THEN** the book's `coverSource` is `"user"`, distinguishing it from a `"metadata"`
  cover so re-enrichment does not overwrite it

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

### Requirement: Shared wishlist item type

The system SHALL define a `WishlistItem` zod schema and inferred TypeScript type in
`lib/types/wishlist-item.ts`, following the `lib/types/reader.ts` conventions (zod
schema, inferred type, create/update input schemas, ISO-string timestamps, absent
values as `null`). A `WishlistItem` SHALL carry a required `readerId`, an **optional**
`bookId`, a `status` of `"wanted" | "dismissed"`, a `priority` of
`"high" | "normal" | "low"` defaulting to `"normal"`, an `addedVia` of
`"manual" | "isbn" | "ai" | "catalog"`, a denormalized book snapshot
(`bookTitle`, `bookAuthors`, `isbn13`, `coverUrl`), and normalized `titleKey` and
`authorKeys` match keys. The item SHALL NOT carry a stored flag for whether the book
has been acquired or read — both are derived.

#### Scenario: Valid item accepted

- **WHEN** an item with a non-empty `readerId`, a non-empty `bookTitle`, a valid
  `status`, and ISO `createdAt`/`updatedAt` is parsed by the schema
- **THEN** it validates successfully

#### Scenario: Missing reader rejected

- **WHEN** an item object without a `readerId` (or with an empty `readerId`) is parsed
- **THEN** the schema rejects it

#### Scenario: Book reference is optional

- **WHEN** an item with no `bookId` is parsed
- **THEN** it validates successfully, because a wish may exist for a book that has no
  catalog entry

#### Scenario: Priority defaults to normal

- **WHEN** an item is parsed with no `priority`
- **THEN** it validates with `priority` set to `"normal"`

#### Scenario: No stored acquired or read flag

- **WHEN** the schema is inspected
- **THEN** it defines no field recording that the book was acquired or read, since
  ownership is derived from copies and reading status from reading events

#### Scenario: Entry point is distinct from metadata provenance

- **WHEN** the schema is compared against `lib/types/book.ts`
- **THEN** the item's entry point is named `addedVia`, distinct from `book.source`,
  which records metadata provenance

### Requirement: Shared loan type

The system SHALL define a `Loan` zod schema and inferred TypeScript type in
`lib/types/loan.ts`, following the `lib/types/reader.ts` conventions (zod schema,
inferred type, create/update input schemas, ISO-string timestamps, absent values as
`null`). A `Loan` SHALL carry a required `copyId`, a free-text `borrowerName` with a
normalized `borrowerKey`, a required `loanedAt`, an optional `dueDate`, an optional
`returnedAt` (whose absence denotes an open loan), optional `notes`, and a
denormalized book snapshot (`bookId`, `bookTitle`, `bookAuthors`, `coverUrl`). The loan
SHALL NOT reference a `reader` (the borrower is outside the household) and SHALL NOT
carry a stored on-loan flag — on-loan and overdue state are derived.

#### Scenario: Valid loan accepted

- **WHEN** a loan with a non-empty `copyId`, a non-empty `borrowerName`, a `loanedAt`,
  and ISO `createdAt`/`updatedAt` is parsed by the schema
- **THEN** it validates successfully

#### Scenario: Missing copy reference rejected

- **WHEN** a loan object without a `copyId` (or with an empty `copyId`) is parsed
- **THEN** the schema rejects it

#### Scenario: Return date is optional

- **WHEN** a loan with no `returnedAt` is parsed
- **THEN** it validates successfully and denotes an open (on-loan) loan

#### Scenario: No reader reference and no stored on-loan flag

- **WHEN** the schema is inspected
- **THEN** it defines no `readerId` and no field recording that the copy is on loan,
  since the borrower is free text and on-loan state is derived from `returnedAt`

### Requirement: Shared series type

The system SHALL define a `Series` zod schema and inferred TypeScript type in
`lib/types/series.ts`, following the `lib/types/loan.ts` conventions (zod schema,
inferred type, create/update input schemas, ISO-string timestamps, absent values as
`null`). A `Series` SHALL carry a required `name` and an ordered array of volumes, each
with a required `position`, a required `title`, `authors`, optional `isbn13` and
`coverUrl`, and an optional `bookId` (`null` denotes a missing volume). A `series` SHALL
NOT be referenced from `book` — membership is discovered by scanning `series` for a
volume whose `bookId` matches, the same in-memory join `services/catalog` already uses
for shelves and reading status.

#### Scenario: Valid series accepted

- **WHEN** a series with a non-empty `name`, at least one volume with a `position` and
  `title`, and ISO `createdAt`/`updatedAt` is parsed by the schema

- **THEN** it validates successfully

#### Scenario: A volume's bookId is optional

- **WHEN** a volume has no `bookId`
- **THEN** the schema accepts it as a valid (missing) volume
