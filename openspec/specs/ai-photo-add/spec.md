# ai-photo-add Specification

## Purpose

TBD - created by archiving change add-ai-photo-book-add. Update Purpose after archive.

## Requirements

### Requirement: Identify a book from a photo

The system SHALL expose `POST /api/ai/identify`, restricted to authenticated readers,
accepting a base64-encoded image and its content type (bounded to the same size limit as
cover upload). It SHALL run the AI vision layer's single-book identification and respond
with the AI guess's confidence, the producing engine, a best enriched candidate, and a
list of ranked alternatives. An unauthenticated request SHALL be rejected.

#### Scenario: Authenticated reader identifies a book

- **WHEN** an authenticated reader POSTs a legible cover/spine photo to `/api/ai/identify`
- **THEN** the system responds `200` with `aiConfidence`, `sourceProvider`, a `best`
  candidate, and `alternatives`

#### Scenario: Unauthenticated request rejected

- **WHEN** an unauthenticated client POSTs to `/api/ai/identify`
- **THEN** the system rejects the request and performs no AI call

#### Scenario: Oversized or invalid image rejected

- **WHEN** the request body exceeds the image size limit or omits a valid image
- **THEN** the system responds `400` and performs no AI call

### Requirement: Server-side enrichment of the AI guess

The system SHALL enrich the AI identification into canonical candidates server-side: when
the AI guess carries an ISBN it SHALL resolve by ISBN; otherwise it SHALL resolve by text
search over the recognized title and authors. The top match SHALL be returned as `best`
and the remaining matches as `alternatives`. When enrichment yields no match, the system
SHALL return the raw AI candidate as `best` so the reader can still edit and save.

#### Scenario: ISBN read by AI resolves canonically

- **WHEN** the AI guess includes an ISBN
- **THEN** the system enriches by that ISBN and returns the canonical candidate as `best`

#### Scenario: No ISBN falls back to text search

- **WHEN** the AI guess has a title and authors but no ISBN
- **THEN** the system enriches by text search and returns the top match as `best` with
  the rest as `alternatives`

#### Scenario: No enrichment match degrades to the AI candidate

- **WHEN** enrichment finds nothing for the AI guess
- **THEN** the system returns the raw AI candidate as `best` and an empty `alternatives`

### Requirement: Photo capture entry point

The "Agregar" experience SHALL offer a photo entry point that captures an image using the
device camera (mobile-first) and sends it to `/api/ai/identify`. While the request is in
flight the UI SHALL show an analyzing state; a failed request SHALL show a recoverable
error.

#### Scenario: Capture and analyze

- **WHEN** a reader takes a photo from the add-by-photo entry point
- **THEN** the photo is sent to `/api/ai/identify` and the UI shows an analyzing state
  until candidates return

#### Scenario: Identification error is recoverable

- **WHEN** `/api/ai/identify` fails or no engine is available
- **THEN** the UI shows an error with a way to retry, and nothing is saved

### Requirement: Confirm, pick, and save with the photo as cover

The confirmation flow SHALL present the captured photo, the pre-filled `best` candidate,
and the `alternatives` for the reader to choose from, surfacing low AI confidence. Saving
SHALL run the existing duplicate pre-check and intake. The captured photo SHALL be stored
as the book's cover, and SHALL be uploaded only when the reader confirms — never for a
discarded photo.

#### Scenario: Confirm a high-confidence candidate

- **WHEN** the reader confirms the pre-filled best candidate
- **THEN** the book is saved via intake with the captured photo as its cover

#### Scenario: Pick an alternative before saving

- **WHEN** the reader selects one of the enrichment alternatives
- **THEN** the form is populated from that alternative while the cover remains the
  captured photo

#### Scenario: Photo persisted only on confirm

- **WHEN** the reader cancels or discards before saving
- **THEN** no image is uploaded to Storage

#### Scenario: Duplicate detected on save

- **WHEN** the chosen candidate matches an existing book in the duplicate pre-check
- **THEN** the reader is warned before the book is created, reusing the existing
  duplicate flow

### Requirement: Server orchestration is testable without network or keys

The identification-plus-enrichment orchestration SHALL be unit-tested with injected AI and
enrichment fakes, requiring no network access and no real API keys.

#### Scenario: Orchestrator tested with injected fakes

- **WHEN** the orchestrator is exercised with fake identify + enrichment results (ISBN
  path, text-search path, and no-match path)
- **THEN** the `best` / `alternatives` selection is verified without any network call or
  real key
