## MODIFIED Requirements

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
