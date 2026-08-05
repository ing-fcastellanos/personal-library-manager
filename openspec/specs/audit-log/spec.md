# audit-log Specification

## Purpose

TBD - created by archiving change add-audit-log. Update Purpose after archive.

## Requirements

### Requirement: Every book, copy, and reading-event write is logged

The system SHALL append an `auditLog` entry whenever a `book`, `copy`, or `readingEvent` is
created, updated, or deleted through a session-gated write. Each entry SHALL carry the acting
reader's id, the action (`create`/`update`/`delete`), the entity type and id, a label snapshot of
the entity (so the entry stays legible after the entity is deleted), and, for updates, the list of
field names that changed. An update with no actual field changes SHALL NOT be logged; a create or
delete SHALL always be logged regardless of whether "changed fields" is empty.

#### Scenario: Creating a book is logged

- **WHEN** a signed-in reader creates a book (manually or via intake)
- **THEN** an `auditLog` entry is appended with `action: "create"`, the book's id, and a label
  snapshot of its title

#### Scenario: Editing logs only the changed fields

- **WHEN** a signed-in reader edits a copy's `condition` and `notes` but no other field
- **THEN** the logged entry's changed-fields list contains exactly `condition` and `notes`

#### Scenario: A no-op edit logs nothing

- **WHEN** a signed-in reader submits an edit that doesn't actually change any field's value
- **THEN** no `auditLog` entry is appended

#### Scenario: Deleting is logged even though nothing "changed"

- **WHEN** a signed-in reader deletes a book, copy, or reading event
- **THEN** an `auditLog` entry is appended with `action: "delete"`, regardless of there being no
  changed-fields list

### Requirement: Audit log reads are public

`GET /api/audit-log` (optionally filtered by `entityType`/`entityId`, and limited) SHALL be
available without a session, consistent with every other read endpoint in this household app.
Writing an entry is never a direct client request — it only happens as a side effect of the
book/copy/reading-event writes above.

#### Scenario: Anonymous read

- **WHEN** an unauthenticated request calls `GET /api/audit-log`
- **THEN** the system returns the matching entries

### Requirement: A global recent-activity feed

`/ajustes/actividad` SHALL show the most recent audit entries across every entity, each showing
who did what, when, and to which entity (by its label). This is a settings sub-page (same shape as
`/ajustes/series`), not a bottom-nav destination.

#### Scenario: Recent activity across entities

- **WHEN** a reader opens `/ajustes/actividad`
- **THEN** the most recent entries appear, most recent first, spanning books, copies, and reading
  events

#### Scenario: An entry for a since-deleted entity stays readable

- **WHEN** the feed includes an entry whose entity (e.g. a since-deleted copy) no longer exists
- **THEN** the entry still shows a readable label instead of a bare id or a broken link
