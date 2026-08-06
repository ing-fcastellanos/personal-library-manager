## MODIFIED Requirements

### Requirement: Book detail view

The system SHALL provide a read-only book detail view at `/libros/[id]` showing the book's
metadata, its copies, and its per-reader reading status, with an action to edit the book
(`/libros/[id]/editar`). The catalog's "view book" navigation (#14) SHALL target this view. For each
copy, the detail SHALL show its loan state: an available copy SHALL offer a **Prestar** action, and
a copy on loan SHALL show a **loan-details card** (borrower, since when, due/overdue) with a
**Devolver** action. Lending and returning require a session. When the book is a volume of a
tracked series (#38), the detail SHALL show that series' full volume list with owned/missing status;
when it isn't, the detail SHALL offer creating a series (or joining an existing one). The detail
SHALL also show an **"Actividad"** section (#40) listing the audit entries for the book itself, its
copies, and its reading events together, distinct from the existing "Historial de lecturas" (#26)
section on the same page.

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

#### Scenario: Actividad aggregates the book, its copies, and its reading events

- **WHEN** a reader opens the detail of a book that has been edited, and one of its copies has been
  edited or a reading event created for it
- **THEN** the "Actividad" section lists all of those entries together, most recent first
