# reading-log Specification

## Purpose

TBD - created by archiving change add-mark-as-read. Update Purpose after archive.

## Requirements

### Requirement: Record a finished reading

The system SHALL let the active reader record that they finished reading a book,
creating a `ReadingEvent` with `status: "finished"` attributed to that reader.
The reader is taken from the authenticated session (`useAuth().reader`) and sent
explicitly as `readerId` in the create request. The event MUST be persisted via
`POST /api/reading-events`.

#### Scenario: Marking a finished reading

- **WHEN** the active reader confirms a finished reading for a book
- **THEN** the system POSTs a `ReadingEvent` with `readerId` (active reader),
  `bookId`, `status: "finished"`, and the chosen dates/copy
- **AND** on success shows confirmation feedback

#### Scenario: No active reader

- **WHEN** there is no authenticated reader in session
- **THEN** the flow does not attempt to create an event
- **AND** prompts the reader to sign in / pick a reader instead of failing silently

### Requirement: Find the book to mark by search or photo

The dedicated flow SHALL let the reader locate the book before confirming, by
either searching the catalog (reusing `GET /api/catalog/search`) or identifying
it from a photo (reusing `POST /api/ai/identify`). Only books already in the
library can be marked as read; a photo match resolves to an existing library
book before proceeding.

#### Scenario: Find by catalog search

- **WHEN** the reader searches the catalog and selects a result
- **THEN** the flow advances to the confirmation step for that book

#### Scenario: Find by photo

- **WHEN** the reader submits a photo and the AI identifies a candidate that
  matches a book in the library
- **THEN** the flow advances to the confirmation step for the matched book

#### Scenario: Photo match not in library

- **WHEN** the AI identifies a book that is not in the library
- **THEN** the flow explains it can only mark books already in the library
- **AND** offers to add the book first (link to `/agregar`) instead of marking it

### Requirement: Confirm date and copy before creating

Before creating the event, the system SHALL present a confirmation step that
captures the finish date (defaulting to today, editable), an optional start
date, and — when the book has physical copies — which copy to attribute via
`copyId`. When the book has no copies, `copyId` is omitted (null).

#### Scenario: Default finish date

- **WHEN** the confirmation step opens
- **THEN** the finish date defaults to today and remains editable

#### Scenario: Selecting a copy

- **WHEN** the book has one or more copies
- **THEN** the reader can choose which copy the reading attributes to
- **AND** the chosen `copyId` is included in the created event

#### Scenario: Book without copies

- **WHEN** the book has no physical copies
- **THEN** the reader can still confirm the reading and the event is created with
  `copyId` null

### Requirement: Mark as read from the book detail

The book detail view SHALL provide an enabled "Marcar como leído" action that
opens the same confirmation step for the already-identified book. On success the
per-reader reading status shown on the detail MUST reflect the new "Leído" state.

#### Scenario: Marking from book detail

- **WHEN** the reader taps "Marcar como leído" on a book detail
- **THEN** the confirmation step opens for that book (no search/photo needed)
- **AND** after a successful create, the reader's status on that book shows "Leído"

### Requirement: Resilient feedback on failure

The flow SHALL surface a clear error and keep the reader's input when creation
fails (validation or server error), without crashing or losing the confirmation
state.

#### Scenario: Create fails

- **WHEN** `POST /api/reading-events` returns a non-ok response
- **THEN** the flow shows an error message
- **AND** keeps the confirmation step open so the reader can retry
