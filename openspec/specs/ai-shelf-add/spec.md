# ai-shelf-add Specification

## Purpose

TBD - created by archiving change add-ai-shelf-identify. Update Purpose after archive.

## Requirements

### Requirement: Identify books from a shelf photo

The system SHALL expose `POST /api/ai/identify-shelf`, restricted to authenticated
readers, accepting a base64-encoded shelf photo and its content type (bounded to the
same size limit as the single-photo identify endpoint). It SHALL run the AI vision
layer's multi-book identification and respond with the identified books and the engine
that answered. Per-book enrichment and duplicate detection are NOT performed by this
endpoint — the client drives those. An unauthenticated request SHALL be rejected.

#### Scenario: Authenticated reader identifies a shelf

- **WHEN** an authenticated reader POSTs a legible shelf photo to `/api/ai/identify-shelf`
- **THEN** the system responds `200` with a list of identified books (each carrying a
  title, authors, confidence, and any ISBN read) and the producing engine

#### Scenario: No books recognized

- **WHEN** the photo contains no legible spines
- **THEN** the system responds `200` with an empty book list rather than an error

#### Scenario: Unauthenticated request rejected

- **WHEN** an unauthenticated client POSTs to `/api/ai/identify-shelf`
- **THEN** the system rejects the request and performs no AI call

#### Scenario: Oversized or invalid image rejected

- **WHEN** the request body exceeds the image size limit or omits a valid image
- **THEN** the system responds `400` and performs no AI call

#### Scenario: No engine available

- **WHEN** no AI engine is configured or all engines fail
- **THEN** the system responds with a clear error status rather than a `200` empty result

### Requirement: Auto-vs-review classification rule

The system SHALL provide a pure classification rule that assigns each identified book to
an **auto** bucket or a **review** bucket. A book SHALL be classified **auto** only when
its AI confidence meets the high-confidence threshold AND enrichment found a canonical
match AND it is not a duplicate of an existing book. Every other book SHALL be classified
**review**, carrying a reason of `low_confidence`, `no_match`, or `duplicate`. The rule
SHALL be deterministic and free of I/O so it is unit-testable.

#### Scenario: Confident, matched, non-duplicate book is auto

- **WHEN** a book has AI confidence at or above the threshold, an enrichment match, and is
  not a duplicate
- **THEN** it is classified `auto`

#### Scenario: Low confidence goes to review

- **WHEN** a book's AI confidence is below the threshold
- **THEN** it is classified `review` with reason `low_confidence`

#### Scenario: No enrichment match goes to review

- **WHEN** a confident book has no enrichment match
- **THEN** it is classified `review` with reason `no_match`

#### Scenario: Duplicate goes to review

- **WHEN** a confident, matched book already exists in the library
- **THEN** it is classified `review` with reason `duplicate`

#### Scenario: Classification is pure and repeatable

- **WHEN** the rule is evaluated twice with the same inputs
- **THEN** it returns the same bucket and reason with no I/O

### Requirement: Shelf photo entry point and processing

The "Agregar" experience SHALL offer a "Por estante" entry point that captures a shelf
photo with the device camera (mobile-first), sends it to `/api/ai/identify-shelf`, and
then, for each identified book, enriches it and checks for duplicates and classifies it,
showing per-book progress. The per-book processing SHALL be resilient: a failed
enrichment or duplicate check SHALL place that book in the review bucket rather than
aborting the batch.

When a book has no ISBN and its text enrichment query (built from the AI-read title and
authors) returns zero candidates, the processing SHALL retry enrichment once with a
**title-only** query before treating the book as having no enrichment match. If the
title-only retry yields candidates, the first SHALL become the book's best match and the
rest its alternatives (so a misread author no longer forces a `no_match`). The retry SHALL
only run when the author-included query returned nothing, leaving books that already matched
unaffected.

#### Scenario: Capture and process a shelf

- **WHEN** a reader takes a shelf photo from the "Por estante" entry point
- **THEN** the photo is sent to `/api/ai/identify-shelf` and the UI shows "processing
  N/M" while each book is enriched, duplicate-checked, and classified

#### Scenario: A failed lookup does not abort the batch

- **WHEN** enrichment or the duplicate check fails for one book
- **THEN** that book is placed in the review bucket (reason `no_match`) and the rest of
  the batch continues

#### Scenario: Title-only fallback recovers a misread author

- **WHEN** a book has no ISBN and the title-plus-authors enrichment query returns zero
  candidates, but a title-only query would match
- **THEN** the processing retries enrichment with the title only, adopts the returned
  candidates as the book's best match and alternatives, and the book is classified
  `low_confidence` (offering the recovered book as a pickable alternative) rather than
  `no_match`

#### Scenario: Title-only fallback only runs when needed

- **WHEN** the title-plus-authors enrichment query already returned at least one candidate
- **THEN** no title-only retry is performed and the book keeps its original match

#### Scenario: Title-only fallback still finds nothing

- **WHEN** both the title-plus-authors query and the title-only retry return zero candidates
- **THEN** the book is classified `no_match` and reviewed via the manual form, as before

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
