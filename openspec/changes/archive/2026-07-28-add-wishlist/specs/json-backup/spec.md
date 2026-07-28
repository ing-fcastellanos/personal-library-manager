## MODIFIED Requirements

### Requirement: Download a full JSON backup

The system SHALL let any visitor download a single JSON file containing every book, copy, reading event, reader, shelf, and wishlist item currently in the library, with no sign-in required.

#### Scenario: Downloading a backup

- **WHEN** a visitor clicks the backup download action on `/ajustes`
- **THEN** a JSON file downloads containing `books`, `copies`, `readingEvents`, `readers`, `shelves`, and `wishlistItems` arrays reflecting the library's current data

#### Scenario: No sign-in required

- **WHEN** a visitor who is not signed in clicks the backup download action
- **THEN** the backup still downloads, consistent with every other read in the app

#### Scenario: Wishlist items are included

- **WHEN** a backup is downloaded and at least one reader has a wishlist item
- **THEN** that item appears in the backup's `wishlistItems` array with its reader attribution, status, priority and book snapshot
