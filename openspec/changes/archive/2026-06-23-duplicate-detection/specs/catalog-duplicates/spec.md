## ADDED Requirements

### Requirement: Duplicate detection hook

The system SHALL provide a `findBookDuplicates(candidate)` service operation that, given a
candidate with optional `isbn`, `title`, and `authors`, returns the existing `Book`s that
represent the same book, each classified as `exact` or `strong`. The operation SHALL be pure
of side effects (read-only) and reusable by both the manual-add flow and the AI batch-add
flow. ISBN comparison SHALL canonicalize both sides to ISBN-13 (#13 `toIsbn13`) and title/author
comparison SHALL use the normalized `titleKey`/`authorKeys` slugs (#13).

#### Scenario: Exact match by ISBN

- **WHEN** `findBookDuplicates` is called with an `isbn` that canonicalizes to the `isbn13` of
  an existing book
- **THEN** the result includes that book with tier `exact`

#### Scenario: No matches for a new book

- **WHEN** `findBookDuplicates` is called with an ISBN and title that match no existing book
- **THEN** the result is empty

#### Scenario: Reusable read-only operation

- **WHEN** `findBookDuplicates` is called
- **THEN** it performs only reads and creates no `Book` or `Copy`

### Requirement: Title and author strong-match rules

For a candidate without an exact ISBN match, the system SHALL classify an existing book as a
`strong` match when their `titleKey` is equal and their authorship is compatible. When both the
candidate and the existing book have authors and share no `authorKey`, the system SHALL NOT
treat them as a match (distinct same-titled books). When one side has no authors, the system
SHALL treat equal `titleKey` as a `strong` match with a reduced score.

#### Scenario: Same title and overlapping author

- **WHEN** a candidate and an existing book have equal `titleKey` and share at least one
  `authorKey`
- **THEN** the existing book is returned with tier `strong`

#### Scenario: Same title but disjoint authors is not a match

- **WHEN** a candidate and an existing book have equal `titleKey`, both have authors, and they
  share no `authorKey`
- **THEN** the existing book is NOT returned as a match

#### Scenario: Same title with missing authors is a degraded strong match

- **WHEN** a candidate and an existing book have equal `titleKey` and at least one side has no
  authors
- **THEN** the existing book is returned with tier `strong` and a lower score than an
  overlapping-author match

### Requirement: Suggested action derived from the Book/Copy model

Each duplicate match SHALL carry the existing `book` summary, its `tier`, a `score`, the count
of `existingCopies` for that book, and a `suggestedAction`. An `exact` (same-ISBN) match SHALL
suggest `add-copy`; a `strong` match with a different ISBN SHALL suggest `add-new-edition`; a
`strong` match with no ISBN on one side SHALL suggest `review`. When there are no matches the
overall recommendation SHALL be `add-new`.

#### Scenario: Exact match suggests adding a copy

- **WHEN** a candidate exactly matches an existing book by ISBN
- **THEN** that match's `suggestedAction` is `add-copy` and it reports the book's
  `existingCopies` count

#### Scenario: Strong match with a different ISBN suggests a new edition

- **WHEN** a candidate strong-matches an existing book by title/author but has a different ISBN
- **THEN** that match's `suggestedAction` is `add-new-edition`

#### Scenario: No matches recommends adding a new book

- **WHEN** a candidate matches no existing book
- **THEN** the overall recommendation is `add-new`

### Requirement: Duplicate pre-check endpoint

The system SHALL expose `GET /api/books/duplicates` accepting `isbn`, `title`, and repeatable
`authors` query parameters, returning the duplicate matches and overall recommendation produced
by `findBookDuplicates`. The endpoint SHALL be a read-only pre-check (it creates nothing) and
SHALL respond `400` when neither `isbn` nor `title` is provided.

#### Scenario: Pre-check returns matches and recommendation

- **WHEN** a client `GET`s `/api/books/duplicates?isbn=9780307474728`
- **THEN** the system responds `200` with the matching books, their tiers, scores,
  `existingCopies`, suggested actions, and an overall recommendation

#### Scenario: Pre-check requires a query

- **WHEN** a client `GET`s `/api/books/duplicates` with neither `isbn` nor `title`
- **THEN** the system responds `400` and performs no lookup

### Requirement: Shared title/author similarity helper

The system SHALL provide a pure `titleAuthorSimilarity` helper in `lib/text/` that scores the
similarity (0–1) of two `titleKey`/`authorKeys` pairs, and both the enrichment ranking (#13)
and duplicate matching SHALL use it as the single definition of title/author similarity. The
helper SHALL be deterministic and unit-tested in the emulator-free lane.

#### Scenario: Deterministic similarity

- **WHEN** `titleAuthorSimilarity` is called twice with the same inputs
- **THEN** it returns the identical score with no I/O

#### Scenario: Identical title and author scores higher than title-only

- **WHEN** two items share both `titleKey` and an `authorKey` versus two that share only
  `titleKey`
- **THEN** the former scores higher than the latter
