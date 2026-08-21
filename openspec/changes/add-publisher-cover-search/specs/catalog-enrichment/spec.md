## ADDED Requirements

### Requirement: Publisher-scoped cover search endpoint

The system SHALL expose `GET /api/enrich/cover-by-publisher` accepting `title` (required),
`authors` (optional, repeatable), and `publisher` (required) query parameters. It SHALL search
the enrichment sources with the search scoped to that specific publisher (in addition to title
and, when given, authors) and respond with a ranked list of up to five candidates, each carrying
at minimum a `coverUrl` and a caption combining the publication year and publisher when known
(for example `2019 · Debolsillo`). The response list SHALL be empty, not an error, when the
publisher scoping matches nothing. Missing `title` or `publisher` SHALL respond `400`.

#### Scenario: Multiple editions from the named publisher

- **WHEN** a client `GET`s `/api/enrich/cover-by-publisher?title=Rayuela&authors=Julio+Cort%C3%A1zar&publisher=Debolsillo`
  and the source has more than one matching edition
- **THEN** the system responds `200` with up to five candidates, each including a `coverUrl` and
  a year/publisher caption, ordered best match first

#### Scenario: No edition from that publisher

- **WHEN** the named publisher has no matching edition in any source
- **THEN** the system responds `200` with an empty candidate list (not `404` or `500`)

#### Scenario: Publisher is required

- **WHEN** a client omits `publisher` (or `title`) from the request
- **THEN** the system responds `400`

### Requirement: Field-restricted Google Books query support

The Google Books client SHALL support restricting a search query by title, author, and
publisher independently (Google Books' `intitle:`/`inauthor:`/`inpublisher:` field syntax),
so a caller can scope a search to a specific publisher without also constraining ISBN. This
capability SHALL reuse the existing rate-limit retry behavior (`GoogleBooksRateLimitError`,
retried with backoff) already applied to ISBN and free-text lookups.

#### Scenario: Query is scoped to the given publisher

- **WHEN** the enrichment layer searches with a title, an author, and a publisher
- **THEN** the request sent to Google Books restricts all three fields rather than sending a
  single unscoped free-text query

#### Scenario: Rate limiting is retried the same way

- **WHEN** Google Books responds `429` to a publisher-scoped search
- **THEN** the request is retried with backoff exactly as an ISBN or free-text lookup would be
