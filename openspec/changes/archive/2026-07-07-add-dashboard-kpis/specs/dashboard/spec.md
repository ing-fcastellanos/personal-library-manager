## ADDED Requirements

### Requirement: Library KPI overview

The dashboard at `/` SHALL show the real state of the library as a set of KPI
cards: total books, total copies, books read vs pending, and unique authors and
publishers. Counts are derived from existing data and formatted for es-AR.

#### Scenario: Showing the KPIs

- **WHEN** the reader opens the dashboard with a non-empty library
- **THEN** it shows the total books, total copies, read and pending counts, and
  unique author and publisher counts, each with its real value

#### Scenario: Read vs pending

- **WHEN** computing read and pending
- **THEN** a book counts as **read** if it has at least one `finished` reading event
  and **pending** otherwise, and read + pending equals the total book count

### Requirement: Per-reader reading counts

The dashboard SHALL show, per reader, how many books that reader has finished.

#### Scenario: Per-reader breakdown

- **WHEN** the dashboard renders
- **THEN** each reader appears with their count of finished books

#### Scenario: Reader with no readings

- **WHEN** a reader has no finished readings
- **THEN** they appear with a count of zero (not omitted)

### Requirement: Loading and empty states

The dashboard SHALL show a loading state while data is being fetched and a clear
empty state when the library has no books yet, without errors.

#### Scenario: Loading

- **WHEN** the dashboard is fetching its data
- **THEN** it shows a loading state (skeletons) rather than empty or zeroed cards

#### Scenario: Empty library

- **WHEN** there are no books
- **THEN** the dashboard shows an empty state inviting the reader to add books,
  instead of a grid of zeros

### Requirement: Resilient data loading

The dashboard SHALL degrade gracefully if a data source fails, showing the KPIs it
can compute rather than crashing.

#### Scenario: A source fails

- **WHEN** one of the underlying requests returns a non-ok response
- **THEN** the dashboard still renders, treating the missing source as empty
