## MODIFIED Requirements

### Requirement: Cover re-hosting in Storage

When an enriched book is persisted, the system SHALL download the candidate's cover from its
source, normalize it (resized to a 600px max width preserving aspect ratio, never upscaled,
re-encoded to WebP), and upload it to Firebase Storage under a deterministic path via the admin
SDK, and the stored `Book.coverUrl` SHALL reference the internal Storage URL rather than the
external source URL. This SHALL NOT require opening `storage.rules` (the admin SDK bypasses
rules) and SHALL NOT occur on every search-path response. A cover that fails to download or
cannot be decoded as an image SHALL NOT block persisting the book — it degrades the same way a
download failure already does.

#### Scenario: Cover re-hosted on persist

- **WHEN** a book with an external candidate cover is persisted
- **THEN** the cover image is resized to at most 600px wide, re-encoded to WebP, uploaded to
  Storage, and the book's `coverUrl` points to the internal Storage location

#### Scenario: Search responses do not re-host

- **WHEN** a client `GET`s `/api/enrich?q=<text>`
- **THEN** the response cover URLs may reference external sources and no Storage upload occurs

#### Scenario: An undecodable source image does not block persisting the book

- **WHEN** the downloaded candidate cover cannot be decoded as an image
- **THEN** the book is persisted without a re-hosted cover, the same as when the download itself
  fails
