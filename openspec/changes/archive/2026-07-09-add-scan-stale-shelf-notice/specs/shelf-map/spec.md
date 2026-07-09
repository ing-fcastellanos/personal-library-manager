## ADDED Requirements

### Requirement: Notice for a stale scanned shelf

When the add form loads with a `shelf` present in the scan context (`useShelf()`, #10) that does not match any of the reader's current shelves, the system SHALL show a one-time notice that the shelf no longer exists, rather than silently dropping the preselection.

#### Scenario: Scanned shelf no longer exists

- **WHEN** the add form loads with a `shelf` id in the scan context that isn't in the reader's current shelf list
- **THEN** a toast notes that shelf no longer exists

#### Scenario: No notice when the shelf exists

- **WHEN** the add form loads with a `shelf` id that matches a current shelf
- **THEN** no notice is shown and the shelf preselects normally

#### Scenario: Notice fires once

- **WHEN** `AddBook` re-renders while the same stale shelf id is still in context
- **THEN** the notice is not shown again
