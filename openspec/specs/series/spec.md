# series Specification

## Purpose

TBD - created by archiving change add-series-tracking. Update Purpose after archive.

## Requirements

### Requirement: A series is a manually-curated ordered list of volumes

The system SHALL let a signed-in reader create a `series` (a name and an ordered list
of volumes) and edit it (rename, add/remove/reorder volumes, link or unlink a volume to
a `bookId`). Each volume SHALL carry a `position`, a `title`, `authors`, and optionally
an `isbn13` and `coverUrl` — a full snapshot, independent of whether the volume is
currently linked to a book. A volume with no `bookId` denotes a missing tomo; a volume
whose `bookId` is set denotes one the household has. Series membership is never
recorded on the `book` itself.

#### Scenario: Creating a series with a first volume

- **WHEN** a signed-in reader creates a series and links its current book as one volume
- **THEN** the series is created with that volume's `bookId` set to the book's id

#### Scenario: Adding a missing volume

- **WHEN** a signed-in reader adds a volume to an existing series with only a title (no
  linked book)
- **THEN** the volume is stored with `bookId: null` and reads as missing

#### Scenario: Linking a book to close a gap

- **WHEN** a signed-in reader links a `bookId` to a volume that previously had none
- **THEN** that volume reads as owned from then on, with no change to its position or
  snapshot fields

### Requirement: Series reads are public, writes require a session

`GET /api/series` and `GET /api/series/:id` SHALL be available without a session.
`POST /api/series` (create), `PATCH /api/series/:id` (rename/edit volumes), and
`DELETE /api/series/:id` SHALL require a signed-in reader.

#### Scenario: Anonymous read

- **WHEN** an unauthenticated request calls `GET /api/series`
- **THEN** the system returns the list of series

#### Scenario: Anonymous write rejected

- **WHEN** an unauthenticated request calls `POST /api/series`
- **THEN** the system responds `401` and no series is created

### Requirement: Book detail shows the series a book belongs to

The book detail view SHALL show a "Serie" section for any book whose id appears as a
volume's `bookId` in any series, listing every volume of that series in order with its
owned/missing status. A missing volume's action SHALL let a reader add it to the
household's wishlist (#37), pre-filled from the volume's snapshot. The book detail
SHALL also offer creating a new series (or adding this book to an existing one) when the
book isn't yet part of any series.

#### Scenario: A book that's part of a series shows it

- **WHEN** a reader opens the detail of a book that is volume 2 of a tracked series
- **THEN** the detail shows the series with all of its volumes and their status

#### Scenario: Add a missing volume to the wishlist

- **WHEN** a reader chooses "Agregar a deseos" on a missing volume shown in the series
  section
- **THEN** a wishlist item is created from that volume's snapshot

#### Scenario: A book with no series offers to start one

- **WHEN** a reader opens the detail of a book that isn't part of any tracked series
- **THEN** the detail offers an action to create a series (or add the book to an
  existing one)

### Requirement: Catalog browse shows a series indicator

The catalog browse view SHALL show a "Serie" indicator on any result whose book is a
volume of a tracked series — informational, like the existing "prestado" indicator, not
a separate click target nested inside the result's link. Viewing or editing that series
happens from the book detail (or `/ajustes/series`).

#### Scenario: A book in a tracked series shows the indicator

- **WHEN** a book on `/catalogo` is linked as a volume of some series
- **THEN** its browse result shows a "Serie" indicator

#### Scenario: A book in no series shows no indicator

- **WHEN** a book on `/catalogo` isn't linked to any series
- **THEN** its browse result shows no series indicator

### Requirement: Settings lists every tracked series

`/ajustes/series` SHALL list every series with its completion (how many of its volumes
are owned out of the total), each opening the same series view/edit surface used from
the book detail and the catalog badge.

#### Scenario: Series index shows completion

- **WHEN** a reader opens `/ajustes/series` and a series has 2 of 3 volumes owned
- **THEN** that series' row shows "2 de 3 tomos"

#### Scenario: Empty state

- **WHEN** no series has been created yet
- **THEN** `/ajustes/series` shows an empty state instead of an empty list
