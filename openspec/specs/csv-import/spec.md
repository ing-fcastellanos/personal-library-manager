# csv-import Specification

## Purpose

TBD - created by archiving change add-csv-import. Update Purpose after archive.

## Requirements

### Requirement: Upload a CSV and detect its format

The system SHALL accept an uploaded CSV file and attempt to detect whether it is a Goodreads or a StoryGraph export by comparing its header row against each format's known header signature.

#### Scenario: Goodreads export detected

- **WHEN** a reader uploads a CSV whose headers match the Goodreads export signature
- **THEN** the system identifies the file as Goodreads and proceeds to the column-mapping step with Goodreads' default mapping pre-selected

#### Scenario: StoryGraph export detected

- **WHEN** a reader uploads a CSV whose headers match the StoryGraph export signature
- **THEN** the system identifies the file as StoryGraph and proceeds to the column-mapping step with StoryGraph's default mapping pre-selected

#### Scenario: Unrecognized format

- **WHEN** a reader uploads a CSV whose headers match neither known signature
- **THEN** the system still proceeds to the column-mapping step, with every target field left unmapped for the reader to fill in manually

### Requirement: Confirm the column mapping before parsing rows

The system SHALL show a column-mapping screen — binding each target field (title, author, ISBN, rating, review, date finished, status) to a column from the uploaded file — pre-filled per the detected format and editable by the reader, and SHALL NOT parse any row data until the reader confirms the mapping.

#### Scenario: Reader accepts the default mapping

- **WHEN** the detected format's default mapping is correct and the reader confirms it without changes
- **THEN** the system proceeds using that mapping

#### Scenario: Reader corrects the mapping

- **WHEN** the reader changes a field's mapped column before confirming
- **THEN** the system uses the reader's chosen column for that field instead of the default

### Requirement: Import only finished readings

The system SHALL filter parsed rows to only those whose mapped status column indicates a finished reading, discarding rows marked as currently reading, to-read/want-to-read, or did-not-finish before any enrichment or duplicate check runs.

#### Scenario: A finished row is kept

- **WHEN** a row's mapped status column value corresponds to "read"/finished for the detected format
- **THEN** the row proceeds to enrichment and appears in the review list

#### Scenario: A to-read row is discarded

- **WHEN** a row's mapped status column value corresponds to "to-read"/want-to-read
- **THEN** the row is dropped before enrichment and never appears in the review list

#### Scenario: A currently-reading or did-not-finish row is discarded

- **WHEN** a row's mapped status column value corresponds to "currently-reading" or "did-not-finish"
- **THEN** the row is dropped before enrichment and never appears in the review list

### Requirement: Enrich and check duplicates for every surviving row before review

The system SHALL run metadata enrichment and a duplicate check for every row that survives the status filter, before showing the review list, with a visible progress indicator for the run.

#### Scenario: Enrichment fills in metadata

- **WHEN** a surviving row has an ISBN that resolves via enrichment
- **THEN** the review list shows that row with the enriched cover, publisher, and other available metadata

#### Scenario: Enrichment finds nothing

- **WHEN** a surviving row's ISBN (or title/author fallback) does not resolve via enrichment
- **THEN** the review list still shows that row, using only the CSV's own title/author fields

#### Scenario: Progress is visible during the run

- **WHEN** the enrichment and duplicate-check pass is running across all surviving rows
- **THEN** the reader sees a progress indicator until the review list is ready

### Requirement: Review each row before importing

The system SHALL present each enriched row in a review list where the reader can toggle it to include or exclude, choose whether it is a physical or digital copy, and see a non-blocking duplicate badge when a likely match exists — without any modal interrupting the flow.

#### Scenario: Excluding a row

- **WHEN** the reader toggles a row to excluded
- **THEN** that row is not imported when the reader confirms

#### Scenario: Marking a row as digital

- **WHEN** the reader marks a row as digital
- **THEN** no `Copy` is created for that row when it is imported, even if it is otherwise imported as a new or existing book

#### Scenario: A duplicate match shows a badge, not a blocking dialog

- **WHEN** a row's duplicate check finds a likely match
- **THEN** the row shows a badge describing the match, and the reader can keep reviewing other rows without dismissing anything

#### Scenario: Reader overrides the default duplicate action

- **WHEN** a row defaults to creating a new book but the reader recognizes it as the same as an existing match
- **THEN** the reader can switch that row to use the existing book instead, before confirming

### Requirement: Attribute the import to the active reader

The system SHALL attribute every `ReadingEvent` created during an import run to the active signed-in reader, with no separate reader-selection step — consistent with every other reading-attribution write in the app.

#### Scenario: All rows attribute to the active reader

- **WHEN** an import run creates reading events for its included rows
- **THEN** every one of them is attributed to the reader who is signed in and running the import, with no per-row or per-run reader selection

### Requirement: Confirm and persist the reviewed rows

The system SHALL, on confirmation, create a `Book` (new or existing, per each row's resolved duplicate action) and an optional `Copy` for physical rows, followed by a `ReadingEvent` with the mapped rating/review/date-finished, for every row still marked included — and SHALL show a per-outcome summary when the run completes.

#### Scenario: A new book is created

- **WHEN** an included row's resolved action is "create new book"
- **THEN** a new `Book` (and `Copy`, if physical) is created, and a `ReadingEvent` referencing that new book is created for the chosen reader

#### Scenario: An existing book is reused

- **WHEN** an included row's resolved action is "use existing book"
- **THEN** no new `Book` is created; a `Copy` is added to the existing book only if the row is physical, and a `ReadingEvent` referencing the existing book is created for the chosen reader

#### Scenario: A row fails to import

- **WHEN** an included row's creation calls fail (e.g. a network error)
- **THEN** the summary screen shows that row as failed, with the option to retry it, and the rest of the import is unaffected

#### Scenario: Summary reflects every outcome

- **WHEN** the import run finishes
- **THEN** the summary screen groups every included row by outcome (added, added as copy, failed) and lists excluded rows separately
