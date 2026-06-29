# ai-import-summary Specification

## Purpose

TBD - created by archiving change add-ai-import-summary. Update Purpose after archive.

## Requirements

### Requirement: Import summary with grouped outcomes

When an AI add flow (single photo or shelf batch) finishes, the system SHALL show an
import summary that groups the results into **added**, **added as copy**, **skipped
(duplicate)**, **discarded**, and **failed**, each with a count, plus a per-item list.
Both the single-photo and the shelf-batch flow SHALL end on this summary.

#### Scenario: Batch summary after a shelf import

- **WHEN** a reader finishes a shelf import that added some books, added some as copies,
  skipped duplicates, discarded some, and had a failure
- **THEN** a summary is shown grouping the outcomes with their counts and a per-item list

#### Scenario: Single add ends on the summary

- **WHEN** a reader saves a single book via the photo flow
- **THEN** the summary is shown with that one book as `added`, rather than jumping
  straight to the catalog

#### Scenario: A failed save is surfaced, not lost

- **WHEN** an intake call fails during an import
- **THEN** that book appears in the summary as `failed` (not silently dropped)

### Requirement: Per-item quick actions

Each summary item SHALL offer the actions appropriate to its result: an **added** book
SHALL offer edit and undo; an **added-as-copy** book SHALL offer undo; a **failed** book
SHALL offer retry. Skipped and discarded items SHALL be informational.

#### Scenario: Edit a freshly added book

- **WHEN** the reader taps edit on an added book
- **THEN** they are taken to that book's edit screen

#### Scenario: Undo a freshly added book

- **WHEN** the reader undoes an added book
- **THEN** the book's copy is removed and then the book is removed, and the item is shown
  as undone

#### Scenario: Undo a book added as a copy

- **WHEN** the reader undoes a book that was added as a copy
- **THEN** only the new copy is removed and the existing book is left intact

#### Scenario: Retry a failed book

- **WHEN** the reader retries a failed book
- **THEN** the system re-attempts the save and, on success, moves the item to `added`
  with its new identifiers

### Requirement: Session-persisted summary

The summary SHALL be persisted for the browser session so it survives a reload and a
round-trip to a book's edit screen. Undo and retry SHALL update the persisted summary so
a reload reflects the latest state. The summary SHALL NOT be a permanent history.

#### Scenario: Summary survives editing a book and returning

- **WHEN** the reader opens a book's edit screen from the summary and navigates back
- **THEN** the summary is still shown with its outcomes

#### Scenario: Undone state survives a reload

- **WHEN** the reader undoes an item and reloads the summary
- **THEN** that item is still shown as undone rather than re-appearing as added

#### Scenario: No import to show

- **WHEN** the summary is opened with no stored import
- **THEN** a gentle empty state with a link back to "Agregar" is shown
