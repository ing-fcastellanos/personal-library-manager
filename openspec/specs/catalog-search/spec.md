# catalog-search Specification

## Purpose

TBD - created by syncing change catalog-search. Update Purpose after sync.

## Requirements

### Requirement: Catalog search endpoint

The system SHALL expose `GET /api/catalog/search` that returns books matching an optional
free-text query and combinable filters, computed in memory by loading `books`, `copies`, and
`readingEvents` and joining them per book (design D1/D2). The response SHALL include the page of
results, the total match count, the current page, and the available facets.

#### Scenario: Search returns matching books with total and page

- **WHEN** a client `GET`s `/api/catalog/search` with a query and/or filters
- **THEN** the system responds `200` with `{ items, total, page, facets }` where `items` is the
  requested page of matching books

#### Scenario: No filters returns the whole catalog

- **WHEN** a client `GET`s `/api/catalog/search` with no query and no filters
- **THEN** the system responds with all books (paginated), ordered by the default sort

### Requirement: Normalized full-text query

When a `q` parameter is provided, the system SHALL normalize it with the shared `slugify` helper
and match it against each book's `titleKey`, `authorKeys`, and ISBN (`isbn13`/`isbn10`), so that
diacritic- and case-insensitive searches work consistently with the rest of the catalog.

#### Scenario: Accent-insensitive author match

- **WHEN** a client searches `q=garcia marquez`
- **THEN** a book by "Gabriel García Márquez" is included in the results

#### Scenario: ISBN match

- **WHEN** a client searches `q=9780307474728`
- **THEN** the book with that ISBN is included in the results

### Requirement: Combinable catalog filters

The system SHALL support filtering by category, author, publisher (book-level), shelf
(copy-level), and reading status (reader-level), and SHALL apply multiple filters together
(intersection). Shelf filtering SHALL match a book that has any copy on the given shelf. Reading
status SHALL be evaluated against a specific reader.

#### Scenario: Combined book and shelf filter

- **WHEN** a client filters by `category=fantasia` and `shelf=<shelfId>`
- **THEN** only books in that category that have a copy on that shelf are returned

#### Scenario: Shelf filter matches via any copy

- **WHEN** a book has a copy on the filtered shelf and another copy elsewhere
- **THEN** the book is included

### Requirement: Reading status filter is reader-scoped

The reading-status filter SHALL require a reader (defaulting to the session reader) and SHALL
match a book when a `ReadingEvent` exists for that `readerId` and `bookId` with the requested
status (derived per data-model Decision D). When no reader is resolvable, the status filter SHALL
be ignored.

#### Scenario: Books a reader is currently reading

- **WHEN** a client filters by `status=reading&reader=<id>`
- **THEN** only books with a `reading` event for that reader are returned

#### Scenario: Status without a reader is ignored

- **WHEN** a client filters by `status=finished` with no resolvable reader
- **THEN** the status filter is not applied

### Requirement: Sorting and pagination

The system SHALL support sorting by title (default), publication year, author, and date added,
and SHALL paginate results with a page and limit, returning the total match count for pagination
controls. Sorting SHALL be deterministic.

#### Scenario: Sort by date added

- **WHEN** a client requests `sort=addedAt`
- **THEN** the results are ordered by the book's creation time

#### Scenario: Paginated results carry the total

- **WHEN** a client requests page 2 with a limit
- **THEN** the response contains that page of items and the total count of all matches

### Requirement: Facets in the response

The search response SHALL include the available facet values for category, author, publisher, and
shelf so the filter panel can populate itself without a second request.

#### Scenario: Facets reflect the catalog

- **WHEN** a client `GET`s `/api/catalog/search`
- **THEN** the response `facets` lists the categories, authors, publishers, and shelves present
  in the catalog

### Requirement: Catalog browse view

The system SHALL replace the `/catalogo` placeholder with a browse view offering search, a filter
panel, and results in both list and grid layouts (togglable), with empty, loading, and
no-results states. Each result SHALL link to the book detail view.

#### Scenario: Browse and open a book

- **WHEN** a reader searches/filters on `/catalogo` and clicks a result
- **THEN** the system navigates to that book's detail view

#### Scenario: No results state

- **WHEN** a search/filter combination matches no books
- **THEN** the view shows a no-results state rather than an empty list

### Requirement: Book detail view

The system SHALL provide a read-only book detail view at `/libros/[id]` showing the book's
metadata, its copies, and its per-reader reading status, with an action to edit the book
(`/libros/[id]/editar`). The catalog's "view book" navigation (#14) SHALL target this view.

#### Scenario: Detail shows copies and reading status

- **WHEN** a reader opens `/libros/<id>`
- **THEN** the view shows the book's metadata, its copies, and the reading status per reader

#### Scenario: Edit from detail

- **WHEN** a reader clicks "Editar" on the detail view
- **THEN** the system navigates to `/libros/<id>/editar`
