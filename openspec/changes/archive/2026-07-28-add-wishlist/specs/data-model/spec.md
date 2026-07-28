## MODIFIED Requirements

### Requirement: Domain schema document

The system SHALL provide `docs/data-model.md` as the canonical description of the
Firestore schema for the library domain, covering the `books`, `copies`,
`readingEvents`, `shelves`, and `wishlistItems` collections alongside the existing
`readers` collection, including each document shape, the reference relationships
between them, the denormalization and key-strategy decisions, and the composite-index
plan. Where an entity is implemented with a shape different from the one previously
sketched for it in the reserved-entities table, the document SHALL record the reason.

#### Scenario: Documented collections

- **WHEN** a developer reads `docs/data-model.md` before implementing #12
- **THEN** it describes the `books`, `copies`, `readingEvents`, `shelves`, and
  `wishlistItems` collections with their fields, their id-string references to one
  another, and the list of composite indexes those queries require

#### Scenario: Documented reserved entities

- **WHEN** a developer looks for future entities (Series, Loan, AuditLog,
  ImportSession, reading goals)
- **THEN** the document sketches where each will slot in **without** defining them as
  implemented collections

#### Scenario: Wishlist is no longer reserved

- **WHEN** a developer reads the reserved-entities table
- **THEN** Wishlist is absent from it, because `wishlistItems` is now an implemented
  collection documented alongside the others
- **AND** the document records that the implemented shape (a dedicated collection with
  an optional `bookId`) deliberately supersedes the shape originally reserved for it
  (a `book` without a `copy` plus a per-reader marker), and why

## ADDED Requirements

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
