## ADDED Requirements

### Requirement: Record a wanted book without owning it

The system SHALL let a signed-in reader record a book they want, attributed to a `readerId`, **without** creating a `Copy` and without requiring the book to exist in the catalog. Each item SHALL carry a denormalized snapshot of the book (title, authors, ISBN-13, cover) so both wishlist views render without joining other collections, plus normalized `titleKey`/`authorKeys` match keys derived server-side.

#### Scenario: Adding a wish creates no copy

- **WHEN** a reader adds a book to their wishlist
- **THEN** a `wishlistItem` is created for that reader with `status` `wanted`
- **AND** no `Copy` document is created

#### Scenario: Wanting a book that is not in the catalog

- **WHEN** a reader adds a wish for a book that has no matching `Book` document
- **THEN** the item is created with a null `bookId` and its own book snapshot
- **AND** no `Book` document is created

#### Scenario: Wanting a catalogued book

- **WHEN** a reader adds a wish from the detail page of a book that already exists in the catalog
- **THEN** the item is created with `bookId` set to that book

#### Scenario: Match keys are derived by the server

- **WHEN** a wishlist item is created with a book title and authors
- **THEN** the stored item carries normalized `titleKey` and `authorKeys` slugs derived from that snapshot

#### Scenario: Attribution requires an existing reader

- **WHEN** a client creates a wishlist item whose `readerId` does not exist
- **THEN** the system rejects the request without writing the item

### Requirement: Multiple ways to add a wish

The system SHALL offer the same entry points for adding a wish that the app already offers for adding a book: manual entry, ISBN/barcode lookup, photo/AI identification, and directly from a catalogued book's detail page. The system SHALL record which entry point was used.

#### Scenario: Adding by ISBN

- **WHEN** a reader adds a wish by scanning or entering an ISBN
- **THEN** the resolved metadata populates the item's snapshot and the item records that it was added via ISBN

#### Scenario: Adding by photo

- **WHEN** a reader adds a wish from a photo identified by AI
- **THEN** the identified metadata populates the item's snapshot and the item records that it was added via AI

#### Scenario: Adding manually

- **WHEN** a reader adds a wish by typing the title and authors
- **THEN** the item is created from those values and records that it was added manually

### Requirement: Warn when the wanted book is already owned

On adding a wish, the system SHALL check the wanted book against the existing catalog and SHALL tell the reader when a matching book already exists, including how many copies the household holds. The check SHALL NOT block the add.

#### Scenario: Wanting a book already on the shelf

- **WHEN** a reader adds a wish for a book that matches an existing catalog book with at least one copy
- **THEN** the reader is shown that the household already owns it, with the copy count

#### Scenario: Adding anyway

- **WHEN** the reader proceeds after being warned that the book is already owned
- **THEN** the item is created

#### Scenario: No match found

- **WHEN** no existing catalog book matches the wanted book
- **THEN** no duplicate warning is shown and the item is created

### Requirement: Per-reader "want to read" list

The system SHALL provide a reader-scoped list of the books that reader wants to read: their items with `status` `wanted`, excluding any book the same reader has already finished. Whether a book has been finished SHALL be derived from reading events, not stored on the item.

#### Scenario: Viewing my wishlist

- **WHEN** a reader opens their wishlist
- **THEN** they see their own `wanted` items and no items belonging to another reader

#### Scenario: A finished book leaves the list automatically

- **WHEN** a reader records a finished reading for a book they have a `wanted` item for
- **THEN** that item no longer appears in their "want to read" list, without any further action
- **AND** the item document is not deleted

#### Scenario: Matching a reading to an item with no bookId

- **WHEN** a reader finishes a book matching a `wanted` item that has a null `bookId`
- **THEN** the item is still recognised as fulfilled by matching on ISBN-13, or on normalized title and author keys when no ISBN is available

#### Scenario: Owned but unread books are not listed

- **WHEN** the household owns a book that the reader has not read and has no wishlist item for
- **THEN** that book does not appear in the reader's "want to read" list

### Requirement: Household "want to buy" list

The system SHALL provide a household-scoped buy list: every reader's `wanted` items for books the household does **not** own, grouped so that one book wanted by several readers appears once showing who wants it. Ownership SHALL be derived from the existence of a copy, not stored on the item.

#### Scenario: An unowned wish appears on the buy list

- **WHEN** a reader has a `wanted` item for a book with no copies
- **THEN** that book appears on the household buy list

#### Scenario: Acquiring removes it from the buy list

- **WHEN** a copy exists for a book that has `wanted` items
- **THEN** that book no longer appears on the household buy list, without any manual tick-off

#### Scenario: Both readers want the same book

- **WHEN** two readers each have a `wanted` item for the same book
- **THEN** the buy list shows one grouped entry indicating both readers want it

#### Scenario: Grouping without a shared bookId

- **WHEN** two readers have items for the same book but neither item has a `bookId`
- **THEN** the items are grouped by matching ISBN-13, or by normalized title and author keys when no ISBN is available
- **AND** two items with the same title but no shared author are not grouped together

### Requirement: Prioritize and dismiss wishes

The system SHALL let a reader assign a priority of high, normal or low to an item, defaulting to normal, and SHALL order both wishlist views by priority. The system SHALL let a reader dismiss an item they no longer want, removing it from both views without deleting the record.

#### Scenario: Ordering by priority

- **WHEN** a reader views a wishlist containing items of differing priority
- **THEN** higher-priority items appear before lower-priority ones

#### Scenario: Default priority

- **WHEN** an item is created without a priority
- **THEN** it is stored with normal priority

#### Scenario: Dismissing a wish

- **WHEN** a reader dismisses a `wanted` item
- **THEN** the item's status becomes `dismissed` and it appears in neither the "want to read" nor the buy list

### Requirement: Acquiring a wish creates the library book and copy

The system SHALL let a signed-in reader mark a wished-for book as acquired, which creates the owned `Copy` — creating the `Book` first from the item's snapshot when the item has no `bookId` — and links the item to the resulting book. The item SHALL survive acquisition.

#### Scenario: Acquiring an item that has no bookId

- **WHEN** a reader marks a `wanted` item with a null `bookId` as acquired
- **THEN** a `Book` is created from the item's snapshot and a `Copy` is created for it
- **AND** the item's `bookId` is set to the newly created book

#### Scenario: Acquiring an item already linked to a book

- **WHEN** a reader marks as acquired an item whose `bookId` points at an existing catalog book
- **THEN** a `Copy` is created for that existing book and no duplicate `Book` is created

#### Scenario: The wish survives acquisition

- **WHEN** an item is acquired and the reader has not read the book
- **THEN** the item still appears in that reader's "want to read" list
- **AND** it no longer appears on the household buy list

#### Scenario: Acquisition requires a session

- **WHEN** an unauthenticated client attempts to acquire a wishlist item
- **THEN** the request is rejected and no book or copy is created

### Requirement: Wishlist reads are public, writes require a session

Reading wishlist data SHALL NOT require a session, and creating, updating, dismissing or deleting an item SHALL require a valid session — consistent with every other resource in the app. The reader an item belongs to SHALL be taken from the supplied `readerId`, not from the session.

#### Scenario: Browsing without signing in

- **WHEN** an unauthenticated visitor opens a wishlist view
- **THEN** the items are shown

#### Scenario: Writing without signing in

- **WHEN** an unauthenticated client attempts to create or modify a wishlist item
- **THEN** the request is rejected and nothing is written

#### Scenario: Attribution comes from the request

- **WHEN** a signed-in reader creates an item supplying a `readerId`
- **THEN** the item is attributed to that `readerId`
