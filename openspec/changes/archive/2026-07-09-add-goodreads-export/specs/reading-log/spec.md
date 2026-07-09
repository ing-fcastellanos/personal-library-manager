## ADDED Requirements

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
