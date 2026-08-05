## MODIFIED Requirements

### Requirement: Domain schema document

The system SHALL provide `docs/data-model.md` as the canonical description of the
Firestore schema for the library domain, covering the `books`, `copies`,
`readingEvents`, `shelves`, `wishlistItems`, `loans`, `series`, and `auditLog`
collections alongside the existing `readers` collection, including each document
shape, the reference relationships between them, the denormalization and
key-strategy decisions, and the composite-index plan. Where an entity is implemented
with a shape different from the one previously sketched for it in the
reserved-entities table, the document SHALL record the reason.

#### Scenario: Documented collections

- **WHEN** a developer reads `docs/data-model.md` before implementing #12
- **THEN** it describes the `books`, `copies`, `readingEvents`, `shelves`,
  `wishlistItems`, `loans`, `series`, and `auditLog` collections with their fields,
  their id-string references to one another, and the list of composite indexes those
  queries require

#### Scenario: Documented reserved entities

- **WHEN** a developer looks for future entities (ImportSession, reading goals)
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
  volume, not distinct volumes of a saga, and was never populated

#### Scenario: AuditLog is no longer reserved

- **WHEN** a developer reads the reserved-entities table
- **THEN** AuditLog is absent from it, because `auditLog` is now an implemented
  collection documented alongside the others
- **AND** the document records that it was already partially live (edit-only, from
  #15) before this change added create/delete coverage, `readingEvent` support, and
  the read side

## ADDED Requirements

### Requirement: Shared audit log type

The system SHALL define an `AuditLogEntry` zod schema and inferred TypeScript type in
`lib/types/audit-log.ts`, following the `lib/types/loan.ts` conventions (zod schema,
inferred type, ISO-string timestamps, absent values as `null`). An `AuditLogEntry`
SHALL carry a required `readerId`, a required `action` (`create`/`update`/`delete`), a
required `entityType` (`book`/`copy`/`readingEvent`), a required `entityId`, a required
`entityLabel` snapshot, an optional `changedFields` array (populated only for
`update`), and a `createdAt` timestamp.

#### Scenario: Valid entry accepted

- **WHEN** an entry with a `readerId`, `action`, `entityType`, `entityId`,
  `entityLabel`, and `createdAt` is parsed by the schema
- **THEN** it validates successfully

#### Scenario: changedFields is optional

- **WHEN** an entry with `action: "create"` and no `changedFields` is parsed
- **THEN** the schema accepts it
