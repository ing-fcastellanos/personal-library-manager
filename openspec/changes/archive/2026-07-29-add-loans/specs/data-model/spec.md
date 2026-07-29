## MODIFIED Requirements

### Requirement: Domain schema document

The system SHALL provide `docs/data-model.md` as the canonical description of the
Firestore schema for the library domain, covering the `books`, `copies`,
`readingEvents`, `shelves`, `wishlistItems`, and `loans` collections alongside the
existing `readers` collection, including each document shape, the reference
relationships between them, the denormalization and key-strategy decisions, and the
composite-index plan. Where an entity is implemented with a shape different from the
one previously sketched for it in the reserved-entities table, the document SHALL
record the reason.

#### Scenario: Documented collections

- **WHEN** a developer reads `docs/data-model.md` before implementing #12
- **THEN** it describes the `books`, `copies`, `readingEvents`, `shelves`,
  `wishlistItems`, and `loans` collections with their fields, their id-string
  references to one another, and the list of composite indexes those queries require

#### Scenario: Documented reserved entities

- **WHEN** a developer looks for future entities (Series, AuditLog, ImportSession,
  reading goals)
- **THEN** the document sketches where each will slot in **without** defining them as
  implemented collections

#### Scenario: Loan is no longer reserved

- **WHEN** a developer reads the reserved-entities table
- **THEN** Préstamo/Loan is absent from it, because `loans` is now an implemented
  collection documented alongside the others
- **AND** the document records that the implemented shape (a dedicated collection keyed
  by `copyId`) deliberately supersedes the reserved shape (a field/subcollection on
  `copy`), because a field can hold only the current loan, not history

## ADDED Requirements

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
