## MODIFIED Requirements

### Requirement: Referential integrity on create

On creating an entity that references a parent, the system SHALL verify each referenced
parent exists before writing, and respond `400`/`404` (per the resource convention) when
a referenced parent is missing. This applies to `Copy.bookId` and optional `Copy.shelfId`,
to `ReadingEvent.readerId`, `ReadingEvent.bookId`, and optional `ReadingEvent.copyId`,
and to `WishlistItem.readerId` and optional `WishlistItem.bookId`.

#### Scenario: Copy referencing a missing book

- **WHEN** a client creates a copy whose `bookId` does not exist
- **THEN** the system rejects the request without writing the copy

#### Scenario: ReadingEvent referencing a missing reader

- **WHEN** a client creates a reading event whose `readerId` does not exist
- **THEN** the system rejects the request without writing the event

#### Scenario: WishlistItem referencing a missing reader

- **WHEN** a client creates a wishlist item whose `readerId` does not exist
- **THEN** the system rejects the request without writing the item

#### Scenario: WishlistItem referencing a missing book

- **WHEN** a client creates a wishlist item that supplies a `bookId` which does not exist
- **THEN** the system rejects the request without writing the item

#### Scenario: Optional reference omitted is allowed

- **WHEN** a copy is created with no `shelfId`, a reading event with no `copyId`, or a
  wishlist item with no `bookId`
- **THEN** the create succeeds (the optional reference is valid when absent)

### Requirement: Referential integrity on delete

On deleting a `book` that still has children, the system SHALL block the delete with
`409`, EXCEPT that deleting a `shelf` SHALL desasociate its copies by nulling their
`shelfId` rather than blocking, and deleting a `book` SHALL desasociate its wishlist
items by nulling their `bookId` rather than blocking. Specifically: deleting a `book`
with copies or reading events SHALL be blocked; deleting a `book` referenced only by
wishlist items SHALL succeed and unlink those items, which remain valid wishes on their
own snapshot; deleting a `shelf` SHALL succeed and unshelve any copies referencing it.
To protect reading events from a reader deletion (an operation owned by the `readers`
capability, not added here), the system SHALL expose a `readerHasEvents` guard, and
SHALL likewise expose a `readerHasWishlistItems` guard so that reader deletion can
refuse to orphan wishlist items.

#### Scenario: Delete a book that still has copies

- **WHEN** a client deletes a book that is referenced by one or more copies
- **THEN** the system responds `409` and deletes nothing

#### Scenario: Delete a book that still has reading events

- **WHEN** a client deletes a book that is referenced by one or more reading events
- **THEN** the system responds `409` and deletes nothing

#### Scenario: Delete a book referenced only by wishlist items

- **WHEN** a client deletes a book with no copies and no reading events that is
  referenced by one or more wishlist items
- **THEN** the system deletes the book, sets each referencing item's `bookId` to null,
  and responds success
- **AND** those items remain visible in their readers' wishlists using their own snapshot

#### Scenario: Delete a shelf desasociates its copies

- **WHEN** a client deletes a shelf referenced by one or more copies
- **THEN** the system deletes the shelf, sets each referencing copy's `shelfId` to null,
  and responds success

#### Scenario: Delete a leaf book or shelf

- **WHEN** a client deletes a book or shelf with no children
- **THEN** the system deletes it and responds success

#### Scenario: Reader-events guard available

- **WHEN** the `readerHasEvents` guard is called for a reader with at least one event
- **THEN** it reports `true`, so reader deletion can block rather than orphan the events

#### Scenario: Reader-wishlist guard available

- **WHEN** the `readerHasWishlistItems` guard is called for a reader with at least one
  wishlist item
- **THEN** it reports `true`, so reader deletion can block rather than orphan the items
