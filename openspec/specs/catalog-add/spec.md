# catalog-add Specification

## Purpose

TBD - created by syncing change manual-book-add. Update Purpose after sync.

## Requirements

### Requirement: Book intake endpoint

The system SHALL expose `POST /api/books/intake` that creates a `Book` and a `Copy` in one
server-mediated operation and responds `201` with the created `{ book, copy }`. The request body
SHALL carry the book fields (validated by the `BookCreateInput` zod schema, #5), optional copy
fields (`shelfId`, `condition`, `acquiredAt`, `notes`), and an optional `coverSourceUrl`. The
endpoint SHALL require a valid session (ADR-0006) and reject invalid input with `400`.

#### Scenario: Intake creates a book and a copy

- **WHEN** an authenticated client `POST`s `/api/books/intake` with a valid `book` and `copy`
- **THEN** the system persists a `Book` and a `Copy` referencing it and responds `201` with both

#### Scenario: Intake validates the book

- **WHEN** a client `POST`s `/api/books/intake` with a book that fails the schema (e.g. empty
  `title`)
- **THEN** the system responds `400` and persists nothing

#### Scenario: Intake requires a session

- **WHEN** an unauthenticated client `POST`s `/api/books/intake`
- **THEN** the system responds `401` and persists nothing

#### Scenario: Copy associates to an existing shelf

- **WHEN** the intake body includes a `copy.shelfId` that exists
- **THEN** the created copy references that shelf

### Requirement: Best-effort cover re-hosting on intake

During intake, when a `coverSourceUrl` is provided the system SHALL attempt to re-host the cover
to Firebase Storage via the Admin SDK and set the created book's `coverUrl` to the internal
Storage URL. Re-hosting SHALL be best-effort: if it fails, the book SHALL still be created with
the external `coverSourceUrl` (or null) and the request SHALL still succeed.

#### Scenario: Cover re-hosted on successful download

- **WHEN** intake runs with a reachable `coverSourceUrl`
- **THEN** the created book's `coverUrl` points to the internal Storage location

#### Scenario: Intake succeeds when re-hosting fails

- **WHEN** intake runs with a `coverSourceUrl` that cannot be downloaded
- **THEN** the book is still created (with the external URL or null) and the response is `201`

### Requirement: Manual add form flow

The system SHALL provide a manual add experience at `app/agregar` that lets a signed-in reader
search by ISBN or title/author, prefill the form from enrichment metadata (`GET /api/enrich`,
#13), edit any field before saving, and save via the intake endpoint. The form SHALL also
support pure manual entry with no metadata, and SHALL surface loading, validation-error, and
success states.

#### Scenario: Prefill from an ISBN search

- **WHEN** a reader enters an ISBN and enrichment returns a candidate
- **THEN** the form fields are prefilled from the candidate and remain editable before saving

#### Scenario: Save a prefilled book

- **WHEN** a reader confirms a prefilled, valid form
- **THEN** the system creates the book and copy via intake and shows a success state

#### Scenario: Pure manual entry

- **WHEN** enrichment returns nothing and the reader fills the fields manually
- **THEN** the form still validates and can be saved

### Requirement: Duplicate pre-check in the add flow

The add flow SHALL pre-check for duplicates (`GET /api/books/duplicates`, #16) at three points:
on blur of the ISBN field, on selecting an enrichment candidate, and on Save. The first two SHALL
show a non-blocking inline notice; Save SHALL run a final check and, when matches exist, present
a blocking dialog offering skip, add-as-copy, and edit. Add-as-copy SHALL create a `Copy` against
the existing book via `POST /api/copies` without creating a new `Book`.

#### Scenario: Early non-blocking notice on ISBN blur

- **WHEN** a reader leaves the ISBN field and that ISBN matches an existing book
- **THEN** an inline notice appears and the reader can still continue editing

#### Scenario: Blocking dialog on Save when a duplicate exists

- **WHEN** a reader saves a book that matches an existing one
- **THEN** a dialog appears offering skip, add-as-copy, and edit before anything is written

#### Scenario: Add-as-copy reuses the existing book

- **WHEN** the reader chooses "add as copy" in the duplicate dialog
- **THEN** the system creates a copy referencing the existing book and creates no new book

#### Scenario: Edit action defers to issue #15

- **WHEN** the duplicate dialog is shown
- **THEN** the "edit existing" action targets the book edit surface delivered by #15 and is
  disabled or hidden until that surface exists

### Requirement: Write gating for manual add

The manual add flow SHALL require an authenticated reader (ADR-0006). A signed-out reader SHALL
be prompted to sign in rather than reaching the form's save action.

#### Scenario: Signed-out reader is prompted to sign in

- **WHEN** a signed-out reader tries to add a book
- **THEN** the system shows the sign-in prompt and does not submit an intake request
