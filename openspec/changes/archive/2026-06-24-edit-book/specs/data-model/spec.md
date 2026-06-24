## MODIFIED Requirements

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
