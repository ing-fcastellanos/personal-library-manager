## ADDED Requirements

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
