## MODIFIED Requirements

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

## ADDED Requirements

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
