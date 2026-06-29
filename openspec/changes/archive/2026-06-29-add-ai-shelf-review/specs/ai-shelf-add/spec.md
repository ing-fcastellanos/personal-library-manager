## ADDED Requirements

### Requirement: Shelf photo entry point and processing

The "Agregar" experience SHALL offer a "Por estante" entry point that captures a shelf
photo with the device camera (mobile-first), sends it to `/api/ai/identify-shelf`, and
then, for each identified book, enriches it and checks for duplicates and classifies it,
showing per-book progress. The per-book processing SHALL be resilient: a failed
enrichment or duplicate check SHALL place that book in the review bucket rather than
aborting the batch.

#### Scenario: Capture and process a shelf

- **WHEN** a reader takes a shelf photo from the "Por estante" entry point
- **THEN** the photo is sent to `/api/ai/identify-shelf` and the UI shows "processing
  N/M" while each book is enriched, duplicate-checked, and classified

#### Scenario: A failed lookup does not abort the batch

- **WHEN** enrichment or the duplicate check fails for one book
- **THEN** that book is placed in the review bucket (reason `no_match`) and the rest of
  the batch continues

#### Scenario: No books recognized

- **WHEN** the shelf photo yields no identified books
- **THEN** the UI shows an empty result with a way to retake the photo, and nothing is saved

### Requirement: Auto bucket added after a preview

Books classified `auto` SHALL be presented as a summary and added only after the reader
confirms, never blindly. Confirming SHALL create each `auto` book via the existing intake,
using its enrichment metadata and cover, assigned to the batch shelf.

#### Scenario: Preview then add the confident books

- **WHEN** the batch has confident books and the reader confirms "add the N books"
- **THEN** each is saved via intake with its enrichment metadata and cover, on the chosen
  shelf

#### Scenario: Nothing is auto-saved before confirmation

- **WHEN** processing finishes
- **THEN** no book has been persisted until the reader confirms the auto summary or
  reviews an item

### Requirement: Cherry-pick the auto books before adding

The auto (ready-to-add) books SHALL be individually selectable: each book SHALL have
a toggle to include or exclude it from the batch, and "add the N books" SHALL add only
the selected ones (excluded books are skipped). Each book SHALL also offer a way to open
its full metadata (cover, title, authors, publisher, year, ISBN, language, pages,
categories, description) in a detail view before deciding.

#### Scenario: Excluding a book skips it

- **WHEN** a reader toggles a ready book off and confirms the add
- **THEN** that book is not saved and the rest of the selected books are added

#### Scenario: The add count reflects the selection

- **WHEN** a reader toggles books in or out of the ready group
- **THEN** the add action's count updates to the number currently selected

#### Scenario: View a book's full metadata

- **WHEN** a reader opens a ready book's detail
- **THEN** its full enrichment metadata is shown without leaving the batch

### Requirement: One shelf for the whole batch

The flow SHALL provide a single shelf selector that applies to every book saved from the
batch (auto and reviewed), rather than asking per book.

#### Scenario: Batch shelf applies to all saved books

- **WHEN** the reader picks a shelf and saves books from the batch
- **THEN** every saved book's copy is assigned to that shelf

### Requirement: One-by-one review queue with grouped duplicates

Doubtful books SHALL be reviewed one at a time with a position counter, advancing
automatically after each action and allowing the reader to go back. For a `low_confidence`
book the reader SHALL be able to pick an enrichment alternative or edit the metadata; for a
`no_match` book the reader SHALL be able to edit the metadata; either SHALL be confirmable
(saved via intake) or discardable. Duplicate books SHALL be grouped with a bulk action to
skip all or add all as copies.

#### Scenario: Review a low-confidence book

- **WHEN** the reader reaches a `low_confidence` item
- **THEN** they can swap to an enrichment alternative or edit the title/authors, then
  confirm (saved to the batch shelf) or discard, and the queue advances

#### Scenario: Review a no-match book

- **WHEN** the reader reaches a `no_match` item
- **THEN** they can edit the metadata and confirm or discard it

#### Scenario: Discard removes without saving

- **WHEN** the reader discards a review item
- **THEN** that book is not persisted and the queue advances to the next item

#### Scenario: Bulk-handle duplicates

- **WHEN** the batch contains duplicate books
- **THEN** they are grouped and the reader can skip them all or add them all as copies to
  the existing books in one action
