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

### Requirement: Capture rating and review when marking a reading

When marking a book as read, the system SHALL let the active reader optionally
add a **rating** (an integer 1–5) and an optional **review** (free text). Both are
optional — a reading can be marked without them. When provided, they MUST be sent
in the create request and persisted on the `ReadingEvent`.

#### Scenario: Marking with a rating and review

- **WHEN** the reader sets a rating and/or writes a review before confirming
- **THEN** the created `ReadingEvent` includes the chosen `rating` and `review`

#### Scenario: Marking without rating or review

- **WHEN** the reader confirms without touching the rating or review
- **THEN** the reading is created with `rating` null and `review` null

### Requirement: Edit an existing reading's rating and review

The system SHALL let the active reader edit the rating and review of their reading
after the fact. Editing MUST update the existing event via `PATCH
/api/reading-events/:id` (not create a new one) and reflect the new values on
return.

#### Scenario: Editing a reading

- **WHEN** the reader opens edit for their reading and changes the rating/review
- **THEN** the system PATCHes that event and the updated rating/review are shown

#### Scenario: Clearing a rating

- **WHEN** the reader removes a previously set rating while editing
- **THEN** the event is updated so the rating is no longer shown

### Requirement: Display rating and review on the book detail

The book detail SHALL show each reader's rating (as stars) and review text on
their row in the "Lectura" section when present. The active reader's own reading
SHALL offer an edit affordance; other readers' ratings/reviews are read-only.

#### Scenario: Showing a rated reading

- **WHEN** a reader has a finished reading with a rating and/or review
- **THEN** their row shows the star rating and the review text

#### Scenario: Active reader can edit, others cannot

- **WHEN** the book detail renders reading rows
- **THEN** only the active reader's row exposes an "Editar" action
- **AND** other readers' rows show their rating/review without an edit control

### Requirement: Accessible star rating control

The rating control SHALL be an accessible 1–5 star selector operable by keyboard
and exposed with radio-group semantics, and MUST allow clearing the selection back
to no rating.

#### Scenario: Keyboard operation

- **WHEN** the reader focuses the star control and uses the keyboard
- **THEN** they can set a value from 1 to 5 and clear it, with a visible focus state

### Requirement: Global reading history timeline

The system SHALL provide a chronological reading history — all `ReadingEvent`s
newest-first — reachable from the "Leído" section as a **Historial** tab alongside
the existing **Registrar** flow. Each entry SHALL show the book (title/authors/cover
from the event's snapshot), the reader, the status and rating, the date, and a
review snippet when present. Multiple readings of the same book (by either reader)
appear as distinct entries.

#### Scenario: Viewing the history

- **WHEN** the reader opens the Historial tab
- **THEN** all readings are listed newest-first, each showing book, reader,
  status/rating, date, and review when present

#### Scenario: Multiple readings of one book

- **WHEN** a book has been read more than once (same or different readers)
- **THEN** each reading appears as its own entry in the timeline

#### Scenario: Empty history

- **WHEN** there are no readings yet
- **THEN** the timeline shows an empty state instead of a list

### Requirement: Filter the reading history

The timeline SHALL be filterable by **reader**, by **rating**, and by **date
range**, applied together (an entry shows only if it matches every active filter).
Filters operate over the loaded events.

#### Scenario: Filter by reader

- **WHEN** the reader selects a specific reader filter
- **THEN** only that reader's readings remain in the timeline

#### Scenario: Filter by rating

- **WHEN** a rating filter is applied
- **THEN** only readings matching that rating remain

#### Scenario: Combined filters with no matches

- **WHEN** the active filters exclude every reading
- **THEN** a "no matches" empty state is shown and clearing the filters restores the list

### Requirement: Per-book reading history on the detail

The book detail SHALL show a history of _all_ readings of that book (both readers,
multiple readings), in addition to the existing per-reader status summary.

#### Scenario: Book with multiple readings

- **WHEN** a book has more than one reading event
- **THEN** the detail lists each reading with its reader, rating, date, and review

#### Scenario: Book never read

- **WHEN** a book has no reading events
- **THEN** the detail shows no history entries (or an empty hint), without error

### Requirement: Edit a reading from the timeline

From the history, the active reader SHALL be able to edit their own reading,
reusing the mark-as-read edit flow (`PATCH /api/reading-events/:id`); other
readers' entries are read-only.

#### Scenario: Editing own entry

- **WHEN** the active reader opens edit on one of their own entries and saves
- **THEN** the event is updated and the timeline reflects the new values

#### Scenario: Others' entries are read-only

- **WHEN** an entry belongs to a different reader
- **THEN** it shows no edit control

### Requirement: Export reading history as CSV

The system SHALL let a reader download a CSV of reading events, filterable by reader and by a date range (`dateFinished`), with columns compatible with Goodreads/StoryGraph's own CSV import (Title, Author, ISBN, My Rating, My Review, Date Read). Values SHALL be RFC 4180-escaped so a comma, quote, or newline inside a title or review never corrupts the file.

#### Scenario: Export all readings

- **WHEN** a reader opens the export tab on `/leido` and downloads with no filters
- **THEN** a CSV downloads containing every finished reading event with the required columns

#### Scenario: Export filtered by reader and date range

- **WHEN** a reader sets a reader filter and a date range before exporting
- **THEN** the downloaded CSV contains only events matching both filters

#### Scenario: A field containing a comma or quote is escaped correctly

- **WHEN** an event's title or review contains a comma, a double quote, or a newline
- **THEN** that field is wrapped in double quotes in the CSV, with any internal double quotes doubled

### Requirement: Mark a reading as pending to publish

The system SHALL let the active reader manually toggle a `publishPending` flag on their own reading events (default unset/false), shown in both the history timeline and the export screen. This flag is informational only — no automated publishing occurs (ADR-0005).

#### Scenario: Flagging a reading as pending

- **WHEN** the active reader toggles "Pendiente de publicar" on one of their finished readings
- **THEN** the system PATCHes that event's `publishPending` to `true` and the toggle reflects the new state

#### Scenario: Clearing the flag

- **WHEN** the active reader toggles an already-flagged reading off
- **THEN** `publishPending` is PATCHed back to `false`

### Requirement: Publish link per reading

Each reading in the history timeline SHALL offer a "Publicar en Goodreads" link that opens `https://www.goodreads.com/search?q=<isbn or title>` (preferring ISBN when present) in a new tab, visible only when the active reader has a `goodreadsUrl` configured.

#### Scenario: Link available with a configured Goodreads account

- **WHEN** the active reader has `goodreadsUrl` set and views their reading history
- **THEN** each of their readings shows a "Publicar en Goodreads" link to the Goodreads search for that book

#### Scenario: Link hidden without a configured account

- **WHEN** the active reader has no `goodreadsUrl` set
- **THEN** the "Publicar en Goodreads" link does not appear on their readings

### Requirement: View a book on Goodreads from its detail page

The book detail page SHALL offer a "Ver en Goodreads" button that opens `https://www.goodreads.com/search?q=<isbn or title>` (preferring ISBN when present) in a new tab. This is a lookup, not a publish action — it SHALL be available regardless of session state or `goodreadsUrl`.

#### Scenario: Button always available

- **WHEN** any visitor (signed in or not) views a book's detail page
- **THEN** a "Ver en Goodreads" button is shown, linking to the Goodreads search for that book
