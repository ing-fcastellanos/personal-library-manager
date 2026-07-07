## ADDED Requirements

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
