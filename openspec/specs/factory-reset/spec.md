# factory-reset Specification

## Purpose

TBD - created by archiving change add-factory-reset. Update Purpose after archive.

## Requirements

### Requirement: Factory reset empties the library from settings

The system SHALL offer an action in settings that deletes every book, copy, reading event,
wishlist item, loan, series and shelf belonging to the household. Deletion SHALL use the
existing per-entity delete endpoints in reverse dependency order — loans, then reading
events and wishlist items, then copies, then books and series, then shelves — so the
existing integrity guards are satisfied at each step.

#### Scenario: Every library entity is deleted

- **WHEN** a reader confirms a factory reset
- **THEN** every book, copy, reading event, wishlist item, loan, series and shelf that
  existed when the reset started is deleted
- **AND** the catalog, wishlist, loans and dashboard afterwards show an empty library

#### Scenario: Deletion order satisfies the integrity guards

- **WHEN** the reset deletes a copy that had loans, or a book that had copies and reading
  events
- **THEN** those loans, copies and reading events were already deleted in an earlier step,
  so no delete is refused by an integrity guard

### Requirement: Readers are never deleted by a factory reset

The system SHALL NOT delete, modify, or deactivate any reader as part of a factory reset,
regardless of confirmation. Readers are the access allowlist: sign-in resolves the
authenticated email against `readers` and refuses an unknown email, and the application
offers no way to create a reader (closed membership, ADR-0012). Deleting them would leave
the household unable to sign in to its own app with no recovery path through the UI.

#### Scenario: Readers survive a reset

- **WHEN** a factory reset completes successfully
- **THEN** every reader that existed before the reset still exists, with its profile,
  `uid` and PIN unchanged

#### Scenario: Sign-in still works after a reset

- **WHEN** a reader signs in after a factory reset has emptied the library
- **THEN** sign-in succeeds and the reader reaches an empty library, not an access error

### Requirement: Confirmation states the concrete impact before deleting

The system SHALL require an explicit confirmation before deleting anything, and that
confirmation SHALL show the actual per-entity counts that will be deleted rather than a
generic description. The confirmation SHALL also state what is preserved, so the reader is
not left inferring it. No entity SHALL be deleted before the reader confirms.

#### Scenario: Counts are shown before confirming

- **WHEN** a reader opens the factory reset confirmation
- **THEN** it shows how many books, copies, reading events, wishlist items, loans, series
  and shelves will be deleted
- **AND** it states that readers and settings are preserved

#### Scenario: Dismissing deletes nothing

- **WHEN** a reader opens the confirmation and dismisses it without confirming
- **THEN** no entity is deleted and the library is unchanged

### Requirement: A backup is offered before the destructive action

The system SHALL offer downloading a full backup from within the confirmation, positioned
before the destructive action, as a skippable step. Downloading the backup SHALL NOT be
required to proceed.

#### Scenario: Backup offered inside the confirmation

- **WHEN** a reader opens the factory reset confirmation
- **THEN** a backup download is offered within it, ahead of the confirming action

#### Scenario: Reset proceeds without a backup

- **WHEN** a reader confirms the reset without downloading a backup
- **THEN** the reset runs normally

### Requirement: Progress and a recoverable outcome summary

The system SHALL show progress while the reset runs, and afterwards a summary of what was
deleted and what failed. When any deletion fails, the summary SHALL offer a retry. Because
the target state is an empty library, a retry SHALL resume toward that state rather than
requiring the reset to be restarted from a clean library.

#### Scenario: Progress shown while deleting

- **WHEN** a factory reset is running
- **THEN** the reader sees how many entities have been processed out of the total

#### Scenario: Failures are reported, not silent

- **WHEN** one or more deletions fail
- **THEN** the summary reports that those entities were not deleted
- **AND** offers a retry

#### Scenario: Retry converges on an empty library

- **WHEN** a reader retries after a partially failed reset
- **THEN** the entities that remain are deleted, and entities already deleted are not
  treated as failures

### Requirement: Cover images and the audit log are not removed by a reset

A factory reset SHALL delete only Firestore entities. It SHALL NOT delete cover images
from storage, and SHALL NOT delete or suppress audit log entries — including the entries
its own deletions produce. The confirmation SHALL disclose that cover images are not
removed, so the reader does not infer that a reset reclaims all stored data.

#### Scenario: Audit entries record the reset

- **WHEN** a factory reset deletes entities whose deletion is audited
- **THEN** the resulting audit entries are written and retained, so the reset is traceable
  afterwards

#### Scenario: Cover images survive and are disclosed

- **WHEN** a factory reset deletes a book that had a stored cover image
- **THEN** the image remains in storage
- **AND** the confirmation shown before the reset stated that cover images are not removed
