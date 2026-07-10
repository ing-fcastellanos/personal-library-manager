## ADDED Requirements

### Requirement: Download a full JSON backup

The system SHALL let any visitor download a single JSON file containing every book, copy, reading event, reader, and shelf currently in the library, with no sign-in required.

#### Scenario: Downloading a backup

- **WHEN** a visitor clicks the backup download action on `/ajustes`
- **THEN** a JSON file downloads containing `books`, `copies`, `readingEvents`, `readers`, and `shelves` arrays reflecting the library's current data

#### Scenario: No sign-in required

- **WHEN** a visitor who is not signed in clicks the backup download action
- **THEN** the backup still downloads, consistent with every other read in the app

### Requirement: Backup excludes authentication secrets

The system SHALL NOT include any reader's PIN hash in the backup file.

#### Scenario: Reader entries omit the PIN hash

- **WHEN** a backup is downloaded and a reader has a PIN configured
- **THEN** that reader's entry in the backup's `readers` array has no `pinHash` field (only the derived `hasPin` boolean, matching the app's normal client-facing reader shape)

### Requirement: Backup is timestamped

The system SHALL record when a backup was generated.

#### Scenario: Export timestamp is present

- **WHEN** a backup is downloaded
- **THEN** the JSON file includes an `exportedAt` field with the ISO timestamp of the export
