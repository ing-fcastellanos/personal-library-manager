## MODIFIED Requirements

### Requirement: Identify books from a shelf photo

The system SHALL expose `POST /api/ai/identify-shelf`, restricted to authenticated
readers, accepting a base64-encoded shelf photo and its content type (bounded to the
same size limit as the single-photo identify endpoint). It SHALL run the AI vision
layer's multi-book identification and respond with the identified books and the engine
that answered. The identification SHALL aim to return **every** visible spine: a spine
whose text is hard to read SHALL be returned with the model's best-guess reading and a
**low confidence** value rather than omitted, so uncertain spines reach the review queue
instead of disappearing from the batch. Per-book enrichment and duplicate detection are
NOT performed by this endpoint — the client drives those. An unauthenticated request
SHALL be rejected.

#### Scenario: Authenticated reader identifies a shelf

- **WHEN** an authenticated reader POSTs a legible shelf photo to `/api/ai/identify-shelf`
- **THEN** the system responds `200` with a list of identified books (each carrying a
  title, authors, confidence, and any ISBN read) and the producing engine

#### Scenario: Hard-to-read spine is included with low confidence

- **WHEN** the photo contains a spine the model can only partially read
- **THEN** that spine is still returned in the book list with a best-guess reading and a
  low confidence value (so the client routes it to review), rather than being skipped

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
match AND that match **corroborates the AI-read title** AND it is not a duplicate of an
existing book. A match corroborates the read when it came from an ISBN lookup (ISBN is
authoritative) OR when the title-agreement between the AI-read title and the matched
candidate's title meets a minimum similarity. Every other book SHALL be classified
**review**, carrying a reason of `low_confidence`, `no_match`, or `duplicate`; an enriched
but unconfirmed match SHALL be `low_confidence` so the candidate is offered as a pickable
alternative. The rule SHALL be deterministic and free of I/O so it is unit-testable.

#### Scenario: Confident, corroborated, non-duplicate book is auto

- **WHEN** a book has AI confidence at or above the threshold, an enrichment match whose
  title corroborates the AI-read title, and is not a duplicate
- **THEN** it is classified `auto`

#### Scenario: Confident match that does not corroborate the title goes to review

- **WHEN** a confident book has an enrichment match whose title does not agree with the
  AI-read title (e.g. a misread spine matched an unrelated edition)
- **THEN** it is classified `review` with reason `low_confidence`, offering the candidate
  as an alternative, rather than `auto`

#### Scenario: ISBN match is trusted without title agreement

- **WHEN** a confident book's enrichment match came from an ISBN lookup
- **THEN** the title-agreement gate is bypassed and the book may be classified `auto`

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
