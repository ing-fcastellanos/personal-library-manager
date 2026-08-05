## MODIFIED Requirements

### Requirement: Minimal change log

On creating, editing, or deleting a `Book` or `Copy`, the system SHALL append a record to an
`auditLog` collection capturing the entity kind, the entity id, a label snapshot, the action
(create/update/delete), the list of changed field names (for updates), the acting `readerId` (from
the session), and a timestamp. A query UI over this log is provided by the `audit-log` capability
(#40).

#### Scenario: Edit writes an audit record

- **WHEN** a reader saves an edit that changes one or more fields
- **THEN** an `auditLog` document is written with the entity id, the changed field names, the
  `readerId`, and a timestamp

#### Scenario: No-op edit

- **WHEN** a save is submitted with no changed fields
- **THEN** no `auditLog` record is required for that save

#### Scenario: Create and delete are also logged

- **WHEN** a reader creates or deletes a `Book` or `Copy`
- **THEN** an `auditLog` document is written with the corresponding `action` and a label snapshot,
  independent of the changed-fields list
