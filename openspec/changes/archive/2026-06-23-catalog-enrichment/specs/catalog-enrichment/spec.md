## ADDED Requirements

### Requirement: Enrichment lookup endpoint

The system SHALL expose `GET /api/enrich` accepting exactly one of two mutually exclusive
query parameters: `isbn` (canonical lookup) or `q` (free-text title/author search). When
`isbn` is provided the system SHALL respond with at most one candidate; when `q` is provided
the system SHALL respond with a ranked list of up to five candidates. Providing both
parameters, or neither, SHALL respond `400`.

#### Scenario: Lookup by ISBN returns a single candidate

- **WHEN** a client `GET`s `/api/enrich?isbn=9780307474728` for an ISBN with metadata in a
  source
- **THEN** the system responds `200` with a single normalized book candidate including title,
  authors, and (when available) a cover URL

#### Scenario: Search by text returns ranked candidates

- **WHEN** a client `GET`s `/api/enrich?q=cien+anos+marquez`
- **THEN** the system responds `200` with an ordered list of at most five normalized
  candidates, best match first

#### Scenario: Missing or conflicting parameters rejected

- **WHEN** a client `GET`s `/api/enrich` with neither `isbn` nor `q`, or with both
- **THEN** the system responds `400` and performs no external lookup

#### Scenario: No results found

- **WHEN** a client `GET`s `/api/enrich?isbn=<isbn>` for an ISBN no source recognizes
- **THEN** the system responds `200` with an empty result (no candidate) rather than an error

### Requirement: Normalization to the Book model

The system SHALL normalize metadata from any source into the shared `Book` shape, populating
display fields (`title`, `authors`, `categories`, `publisher`, `publishedYear`, `language`,
`description`, `pageCount`, `isbn13`, `isbn10`, `coverUrl`) and computing the derived slug
fields (`titleKey`, `authorKeys`, `categoryKeys`) with the existing deterministic
`slugify`/`arraySlugs` helper. Each candidate SHALL carry a `source` of `google-books` or
`open-library`.

#### Scenario: Derived slugs computed on normalization

- **WHEN** a candidate with `authors: ["Gabriel García Márquez"]` and
  `title: "Cien Años de Soledad"` is normalized
- **THEN** it carries `authorKeys` containing `"gabriel-garcia-marquez"` and a `titleKey` of
  `"cien-anos-de-soledad"`

#### Scenario: Source recorded on each candidate

- **WHEN** a candidate is normalized from Google Books
- **THEN** its `source` field is `"google-books"`

### Requirement: BISAC category splitting

When normalizing Google Books categories, the system SHALL split each BISAC hierarchy string
on `/`, trim each level into `categories[]` (display) and normalize each level into
`categoryKeys[]` (slugs), de-duplicating the keys. Open Library `subjects` SHALL NOT be used
as categories.

#### Scenario: BISAC string split into levels

- **WHEN** a Google Books candidate has `categories: ["Fiction / Science Fiction"]`
- **THEN** the normalized book has `categories` containing `"Fiction"` and
  `"Science Fiction"` and `categoryKeys` containing `"fiction"` and `"science-fiction"`

### Requirement: Source merge with Google Books priority

The system SHALL treat Google Books as the primary source and Open Library as a complement.
For a given ISBN the system SHALL fill each field from Google Books when present, fall back to
Open Library when Google Books is empty, union author lists (de-duplicated by `authorKey`),
and select the higher-resolution cover between the two sources.

#### Scenario: Open Library fills a gap left by Google Books

- **WHEN** Google Books returns a candidate without authors but Open Library has authors for
  the same ISBN
- **THEN** the merged candidate includes the Open Library authors

#### Scenario: One source unavailable still yields a result

- **WHEN** Open Library is unreachable but Google Books returns metadata
- **THEN** the system responds with the Google Books candidate and does not fail the request

### Requirement: Deterministic candidate ranking

For the `?q=` path the system SHALL rank candidates with a pure, deterministic, I/O-free score
that compares the slug-normalized query against each candidate's `titleKey`/`authorKeys` and
rewards completeness (presence of ISBN-13, cover, published year). Candidates without a title
or without authors SHALL be discarded. Ties SHALL preserve the originating source's result
order. The helper SHALL be covered by emulator-free unit tests.

#### Scenario: Exact title match ranks above partial

- **WHEN** the query slug exactly matches one candidate's `titleKey` and only partially
  matches another's
- **THEN** the exact-match candidate is ranked first

#### Scenario: Ranking is pure and repeatable

- **WHEN** the ranking helper is called twice with the same candidate set and query
- **THEN** it returns an identical ordering with no I/O

#### Scenario: Untitled candidate discarded

- **WHEN** a source returns a candidate with no title or no authors
- **THEN** that candidate is excluded from the ranked results

### Requirement: Enrichment cache with negative TTL

The system SHALL cache enrichment results in a Firestore `enrichmentCache` collection keyed by
a normalized key (`isbn:<isbn13>` for ISBN lookups, `q:<slug>` for text searches), storing the
normalized candidate(s), `source`, and an `expiresAt`. A vigent cache hit SHALL be served
without calling external sources. A "miss" (no results) SHALL also be cached with a short TTL
so repeated negative lookups do not re-query the sources.

#### Scenario: Cache hit avoids external calls

- **WHEN** a client `GET`s `/api/enrich?isbn=<isbn>` twice within the cache TTL
- **THEN** the second response is served from `enrichmentCache` without calling Google Books or
  Open Library

#### Scenario: Negative result cached with TTL

- **WHEN** an ISBN lookup returns no results and the same ISBN is requested again within the
  negative TTL
- **THEN** the second request is served from cache without re-querying the sources

### Requirement: Cover re-hosting in Storage

When an enriched book is persisted, the system SHALL download the candidate's cover from its
source and upload it to Firebase Storage under a deterministic path via the admin SDK, and the
stored `Book.coverUrl` SHALL reference the internal Storage URL rather than the external source
URL. This SHALL NOT require opening `storage.rules` (the admin SDK bypasses rules) and SHALL NOT
occur on every search-path response.

#### Scenario: Cover re-hosted on persist

- **WHEN** a book with an external candidate cover is persisted
- **THEN** the cover image is uploaded to Storage and the book's `coverUrl` points to the
  internal Storage location

#### Scenario: Search responses do not re-host

- **WHEN** a client `GET`s `/api/enrich?q=<text>`
- **THEN** the response cover URLs may reference external sources and no Storage upload occurs
