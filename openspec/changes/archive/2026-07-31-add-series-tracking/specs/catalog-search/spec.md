## MODIFIED Requirements

### Requirement: Catalog browse view

The system SHALL replace the `/catalogo` placeholder with a browse view offering search, a filter
panel, and results in both list and grid layouts (togglable), with empty, loading, and
no-results states. Each result SHALL link to the book detail view. Each result SHALL also show a
**"prestado" indicator** when one or more of the book's copies is currently on loan, derived from
the loans (never a stored flag), and a **"Serie" indicator** when the book is a volume of a tracked
series (#38) — informational, like the "prestado" indicator, not a separate click target;
opening/editing that series happens from the book detail. Because a shelf's contents is this
browse filtered by `?shelf=`, the same loan indicator marks a lent copy as "out" on the shelf view.

#### Scenario: Browse and open a book

- **WHEN** a reader searches/filters on `/catalogo` and clicks a result
- **THEN** the system navigates to that book's detail view

#### Scenario: No results state

- **WHEN** a search/filter combination matches no books
- **THEN** the view shows a no-results state rather than an empty list

#### Scenario: A lent book shows a prestado indicator

- **WHEN** a book has at least one copy with an open loan
- **THEN** its browse result shows a "prestado" indicator (reflecting how many of its copies are out
  when it has more than one)

#### Scenario: A fully-available book shows no indicator

- **WHEN** none of a book's copies has an open loan
- **THEN** its browse result shows no loan indicator

#### Scenario: A book in a series shows the series indicator

- **WHEN** a book is linked as a volume of a tracked series
- **THEN** its browse result shows a "Serie" indicator

### Requirement: Book detail view

The system SHALL provide a read-only book detail view at `/libros/[id]` showing the book's
metadata, its copies, and its per-reader reading status, with an action to edit the book
(`/libros/[id]/editar`). The catalog's "view book" navigation (#14) SHALL target this view. For each
copy, the detail SHALL show its loan state: an available copy SHALL offer a **Prestar** action, and
a copy on loan SHALL show a **loan-details card** (borrower, since when, due/overdue) with a
**Devolver** action. Lending and returning require a session. When the book is a volume of a
tracked series (#38), the detail SHALL show that series' full volume list with owned/missing status;
when it isn't, the detail SHALL offer creating a series (or joining an existing one).

#### Scenario: Detail shows copies and reading status

- **WHEN** a reader opens `/libros/<id>`
- **THEN** the view shows the book's metadata, its copies, and the reading status per reader

#### Scenario: Edit from detail

- **WHEN** a reader clicks "Editar" on the detail view
- **THEN** the system navigates to `/libros/<id>/editar`

#### Scenario: Lend an available copy from the detail

- **WHEN** a signed-in reader chooses "Prestar" on an available copy and confirms a borrower and date
- **THEN** a loan is created and that copy now shows its loan-details card

#### Scenario: A copy on loan shows its details and can be returned

- **WHEN** a reader opens the detail of a book with a copy currently on loan
- **THEN** that copy shows the borrower, the loan date, and a due/overdue indicator when a due date is set
- **AND** a signed-in reader can mark it returned from there

#### Scenario: Detail shows the book's series

- **WHEN** a reader opens the detail of a book that is a volume of a tracked series
- **THEN** the detail shows the series' volumes in order with each one's owned/missing status
