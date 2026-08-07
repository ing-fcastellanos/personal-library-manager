## MODIFIED Requirements

### Requirement: User cover upload

The system SHALL expose `POST /api/books/:id/cover` that accepts an image as base64 with its
content type, validates the type is an image (`image/jpeg`, `image/png`, or `image/webp`) and
the size is at most 5 MB, normalizes it (resized to a 600px max width preserving aspect ratio,
never upscaled, re-encoded to WebP), uploads it to Firebase Storage at `covers/<bookId>.webp` via
the Admin SDK (replacing any previous cover), sets the book's `coverUrl` to the internal Storage
URL and its `coverSource` to `"user"`, and responds with the new `coverUrl`. The endpoint SHALL
require a session and SHALL NOT open client-side Storage writes.

#### Scenario: Upload replaces the cover

- **WHEN** a reader uploads a valid image for a book
- **THEN** the book's `coverUrl` points to the internal Storage location and `coverSource` is
  `"user"`

#### Scenario: Uploaded image is resized and normalized to WebP

- **WHEN** a reader uploads a valid image wider than 600px, in any accepted format
- **THEN** the stored cover is at most 600px wide and encoded as WebP

#### Scenario: A smaller image is not upscaled

- **WHEN** a reader uploads a valid image narrower than 600px
- **THEN** the stored cover keeps its original width, only re-encoded to WebP

#### Scenario: Reject a non-image, oversized, or undecodable upload

- **WHEN** a reader uploads a non-image content type, an image larger than 5 MB, or bytes that
  cannot be decoded as an image
- **THEN** the system responds `400` and the existing cover is unchanged

#### Scenario: Remove the cover

- **WHEN** a reader chooses "quitar portada"
- **THEN** the book's `coverUrl` is set to null
