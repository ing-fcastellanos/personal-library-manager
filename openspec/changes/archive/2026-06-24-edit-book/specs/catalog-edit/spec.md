## ADDED Requirements

### Requirement: Book edit screen

The system SHALL provide an authenticated edit screen at `/libros/[id]/editar` that loads a
`Book` and one of its `Copy` records, lets a signed-in reader edit any `Book` field and the
`Copy`'s shelf, condition, acquired date, and notes, and saves via the existing
`PATCH /api/books/:id` and `PATCH /api/copies/:id` endpoints (#12). A signed-out reader SHALL be
prompted to sign in rather than reaching the editor.

#### Scenario: Edit and save a book field

- **WHEN** a signed-in reader changes the title on `/libros/<id>/editar` and saves
- **THEN** the system `PATCH`es the book and the change is persisted

#### Scenario: Edit copy notes

- **WHEN** a reader edits the notes of the copy on the edit screen and saves
- **THEN** the referenced `Copy` is updated with the new notes

#### Scenario: Edit requires a session

- **WHEN** a signed-out reader opens `/libros/<id>/editar`
- **THEN** the system shows the sign-in prompt and does not submit a `PATCH`

### Requirement: User cover upload

The system SHALL expose `POST /api/books/:id/cover` that accepts an image as base64 with its
content type, validates the type is an image (`image/jpeg`, `image/png`, or `image/webp`) and
the size is at most 5 MB, uploads it to Firebase Storage at `covers/<bookId>` via the Admin SDK
(replacing any previous cover), sets the book's `coverUrl` to the internal Storage URL and its
`coverSource` to `"user"`, and responds with the new `coverUrl`. The endpoint SHALL require a
session and SHALL NOT open client-side Storage writes.

#### Scenario: Upload replaces the cover

- **WHEN** a reader uploads a valid image for a book
- **THEN** the book's `coverUrl` points to the internal Storage location and `coverSource` is
  `"user"`

#### Scenario: Reject a non-image or oversized upload

- **WHEN** a reader uploads a non-image content type or an image larger than 5 MB
- **THEN** the system responds `400` and the existing cover is unchanged

#### Scenario: Remove the cover

- **WHEN** a reader chooses "quitar portada"
- **THEN** the book's `coverUrl` is set to null

### Requirement: Re-enrich with selective diff

The edit screen SHALL offer an on-demand re-enrich action that queries `GET /api/enrich` (#13)
for the book's ISBN and presents only the fields whose source value differs from the current
value, letting the reader apply each field individually. Only fields the reader accepts SHALL be
included in the resulting `PATCH`. A cover whose `coverSource` is `"user"` SHALL be excluded from
the diff by default so re-enriching does not overwrite a user-uploaded cover.

#### Scenario: Apply only accepted fields

- **WHEN** re-enrich returns differing values and the reader accepts some fields and keeps others
- **THEN** only the accepted fields are written to the book

#### Scenario: User cover is preserved

- **WHEN** the book's `coverSource` is `"user"` and the reader re-enriches
- **THEN** the user cover is not offered for overwrite by default

### Requirement: Minimal change log

On persisting an edit to a `Book` or `Copy`, the system SHALL append a record to an `auditLog`
collection capturing the entity kind, the entity id, the list of changed field names, the acting
`readerId` (from the session), and a timestamp. This change SHALL NOT include an audit query UI —
that is deferred to the M8 audit feature.

#### Scenario: Edit writes an audit record

- **WHEN** a reader saves an edit that changes one or more fields
- **THEN** an `auditLog` document is written with the entity id, the changed field names, the
  `readerId`, and a timestamp

#### Scenario: No-op edit

- **WHEN** a save is submitted with no changed fields
- **THEN** no `auditLog` record is required for that save
