## MODIFIED Requirements

### Requirement: Download a full JSON backup

The system SHALL let any visitor download a single JSON file containing every book, copy, reading event, reader, shelf, wishlist item, loan, and series currently in the library, with no sign-in required.

#### Scenario: Downloading a backup

- **WHEN** a visitor clicks the backup download action on `/ajustes`
- **THEN** a JSON file downloads containing `books`, `copies`, `readingEvents`, `readers`, `shelves`, `wishlistItems`, `loans`, and `series` arrays reflecting the library's current data

#### Scenario: No sign-in required

- **WHEN** a visitor who is not signed in clicks the backup download action
- **THEN** the backup still downloads, consistent with every other read in the app

#### Scenario: Loans are included

- **WHEN** a backup is downloaded and at least one loan exists
- **THEN** that loan appears in the backup's `loans` array with its copy reference, borrower, dates, and book snapshot

#### Scenario: Series are included

- **WHEN** a backup is downloaded and at least one series exists
- **THEN** that series appears in the backup's `series` array with its name and volumes
