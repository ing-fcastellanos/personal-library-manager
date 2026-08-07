## ADDED Requirements

### Requirement: Upload and validate a backup file before any write

The system SHALL validate an uploaded JSON file against the existing entity schemas before creating or deleting any data. An invalid file SHALL be rejected with errors identifying which entity/field failed, and no data SHALL be modified.

#### Scenario: Valid backup accepted

- **WHEN** a signed-in reader uploads a JSON file matching the backup format (#36)
- **THEN** the file is accepted and the confirmation dialog is shown

#### Scenario: Invalid file rejected before any write

- **WHEN** a signed-in reader uploads a file that is not a valid backup (wrong shape, foreign format, corrupted)
- **THEN** the restore is rejected with an error identifying the invalid entity/field
- **AND** no entity is created or deleted

### Requirement: Confirmation with impact preview

The system SHALL require explicit confirmation before restoring, showing a count of existing entities (per type) that will be superseded alongside the counts contained in the uploaded backup.

#### Scenario: Impact preview shown before restoring

- **WHEN** a valid backup file is uploaded
- **THEN** a confirmation dialog shows per-entity-type counts of what currently exists and what the backup contains
- **AND** the restore only proceeds if the reader explicitly confirms

### Requirement: Create-first restoration, never wipe-first

The system SHALL create every entity from the backup before deleting any existing entity. A failure during creation SHALL NOT trigger any deletion.

#### Scenario: Existing data untouched during creation

- **WHEN** a restore is in progress and the creation phase has not yet completed
- **THEN** none of the entities that existed before the restore started have been deleted

#### Scenario: Creation failure blocks cleanup

- **WHEN** one or more entities fail to be created during a restore
- **THEN** no pre-existing entity is deleted
- **AND** the reader is shown which entities failed with the option to retry them

### Requirement: Cross-reference remapping

The system SHALL recreate every entity with a newly generated id (no repository accepts a caller-supplied id) and SHALL rewrite every cross-entity reference (e.g. a copy's `bookId`, a reading event's `readerId`/`bookId`/`copyId`, a loan's `copyId`, a series volume's `bookId`) to point at the newly created id before creating the referencing entity.

#### Scenario: Restored copy references the restored book

- **WHEN** a backup containing a book and a copy referencing it is restored
- **THEN** the restored copy's `bookId` points at the newly created book's id, not the id from the backup file

#### Scenario: Entities are created in dependency order

- **WHEN** a restore runs
- **THEN** entities with no dependencies (readers, shelves, books) are created before entities that reference them (copies, series), which are created before entities that reference those (reading events, wishlist items, loans)

### Requirement: Readers are updated by email match, never created or deleted

The system SHALL match each backed-up reader to an existing reader by email and update that reader's profile fields. The system SHALL NOT create a new reader, SHALL NOT delete any reader, and SHALL NOT modify a reader's `uid` or `pinHash` as part of a restore — readers are provisioned outside the app (closed membership, ADR-0012).

#### Scenario: Existing reader is updated by email match

- **WHEN** a backup contains a reader whose email matches an existing reader
- **THEN** that existing reader's profile fields are updated from the backup
- **AND** its `id` and `uid` are unchanged

#### Scenario: Unmatched reader is skipped with a warning, not created

- **WHEN** a backup contains a reader whose email matches no existing reader
- **THEN** no reader is created
- **AND** the restore summary shows an explicit warning naming that reader as skipped

### Requirement: Cleanup only after full success, in reverse dependency order

The system SHALL delete the pre-restore snapshot of existing entities (excluding readers) only after every entity in the backup has been created successfully, using the existing per-entity delete endpoints in reverse dependency order (loans, then reading events and wishlist items, then copies, then books and series, then shelves).

#### Scenario: Old data deleted after full success

- **WHEN** every entity in the backup has been created successfully
- **THEN** every entity that existed before the restore started (except readers) is deleted, in reverse dependency order

#### Scenario: Deletion respects existing integrity guards

- **WHEN** the cleanup phase deletes a pre-restore book
- **THEN** that book's pre-restore copies and reading events were already deleted in an earlier step, satisfying the existing delete guards

### Requirement: Progress and outcome summary

The system SHALL show progress while restoring and a final summary grouping outcomes (created, failed) per entity, mirroring the CSV import's progress/summary pattern, with a way to retry failed items.

#### Scenario: Progress shown during restore

- **WHEN** a restore is running
- **THEN** the reader sees a count of entities processed out of the total

#### Scenario: Failed items can be retried

- **WHEN** a restore completes with one or more failed creations
- **THEN** the summary lists the failed entities and offers a retry action for them
