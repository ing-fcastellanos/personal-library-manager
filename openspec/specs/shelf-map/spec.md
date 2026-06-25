# shelf-map Specification

## Purpose

Provide readers with a way to manage their physical shelves and navigate the catalog by shelf. This capability covers the shelves manager UI, shelf deletion semantics, viewing a shelf's contents via the catalog, and preselecting a shelf carried in from a scan.

## Requirements

### Requirement: Shelf management UI

The system SHALL provide a shelves manager in the Settings screen (`/ajustes`) that lists the
shelves with a per-shelf book count and lets a signed-in reader create a shelf, edit its name,
location, and description, and delete it. It SHALL reuse the existing shelf CRUD endpoints
(`/api/shelves`); per-shelf book counts SHALL be derived from the catalog facets
(`GET /api/catalog/search` → `facets.shelves`) without a new endpoint.

#### Scenario: Create a shelf

- **WHEN** a signed-in reader adds a shelf with a name on the manager
- **THEN** the system `POST`s `/api/shelves` and the new shelf appears in the list

#### Scenario: Edit shelf fields

- **WHEN** a reader edits a shelf's name, location, or description and saves
- **THEN** the system `PATCH`es the shelf and the changes are reflected

#### Scenario: Shelf list shows book counts

- **WHEN** the manager renders
- **THEN** each shelf shows the number of books that have a copy on it, and a shelf with no books
  shows a count of zero

### Requirement: Delete shelf with warning

Deleting a shelf SHALL prompt for confirmation, and when the shelf holds books the confirmation
SHALL warn that those copies will be left without a shelf. On confirm, the system SHALL call
`DELETE /api/shelves/:id`, which unshelves the affected copies (nulls their `shelfId`) before
removing the shelf.

#### Scenario: Warn before deleting a non-empty shelf

- **WHEN** a reader deletes a shelf that has books
- **THEN** the confirmation warns that the books will be left without a shelf

#### Scenario: Delete unshelves the copies

- **WHEN** the reader confirms the deletion
- **THEN** the shelf is removed and its copies remain (no longer assigned to a shelf)

### Requirement: View a shelf's contents

Each shelf in the manager SHALL link to the catalog filtered by that shelf
(`/catalogo?shelf=<id>`), reusing the existing catalog shelf filter (#17) to show the books on
that shelf rather than a dedicated view.

#### Scenario: Open a shelf's books

- **WHEN** a reader chooses "ver contenido" for a shelf
- **THEN** the system navigates to the catalog pre-filtered by that shelf, listing its books

### Requirement: Shelf preselection from a scan

The system SHALL preselect a shelf carried in the scan context (`useShelf()`, captured from
`?shelf=`, #10): when that shelf exists, the catalog SHALL open with it as the active shelf filter
and the manual add form SHALL default the new copy's shelf to it. The preselection SHALL be a
non-blocking initial default the reader can clear or change.

#### Scenario: Catalog preselects the scanned shelf

- **WHEN** the catalog loads with a `shelf` present in the scan context that matches a known shelf
- **THEN** the catalog opens with that shelf filter applied

#### Scenario: Add form defaults to the scanned shelf

- **WHEN** the add form opens with a `shelf` present in the scan context
- **THEN** the new copy's shelf selector defaults to that shelf, and the reader can change it
