# loans Specification

## Purpose

TBD - created by archiving change add-loans. Update Purpose after archive.

## Requirements

### Requirement: Lend a copy to a borrower

The system SHALL let a signed-in reader record a loan of an owned `copy` to an outside borrower, capturing the borrower's name, the loan date, and an optional due date. The borrower is free text (not a `reader`); the system SHALL derive a normalized `borrowerKey` from the name server-side, and SHALL capture a denormalized book snapshot (title, authors, ISBN cover) at lend time so loan lists render without a join. Creating a loan SHALL NOT create or modify a `Copy`.

#### Scenario: Lending an available copy

- **WHEN** a reader lends a copy that is not currently on loan, supplying a borrower name and loan date
- **THEN** a loan is created for that copy with the borrower name, a derived borrower key, the loan date, and a book snapshot, and no return date

#### Scenario: The borrower is free text, not a household reader

- **WHEN** a loan is created with a borrower name
- **THEN** the loan stores the name as free text and a normalized key derived from it, and references no `reader`

#### Scenario: Lending validates the copy exists

- **WHEN** a reader attempts to lend a `copyId` that does not exist
- **THEN** the request is rejected and no loan is created

### Requirement: A copy has at most one open loan

The system SHALL reject lending a copy that already has an open loan (a loan with no return date), so a copy can never be recorded as being in two places at once.

#### Scenario: Cannot lend a copy that is already out

- **WHEN** a reader attempts to lend a copy that already has a loan with no return date
- **THEN** the request is rejected with a conflict and no second loan is created

#### Scenario: Can lend again after return

- **WHEN** a copy's previous loan has a return date and the reader lends it again
- **THEN** a new loan is created (the returned loan remains as history)

### Requirement: Borrower name autocomplete

The system SHALL expose the distinct borrower names already used, so the lend form can suggest an existing borrower rather than creating drifting spellings of the same person. This SHALL be derived from existing loans, without a separate contacts collection.

#### Scenario: Suggesting a known borrower

- **WHEN** the lend form requests borrower suggestions
- **THEN** it receives the distinct borrower names present in existing loans

### Requirement: Mark a loan returned

The system SHALL let a signed-in reader mark an open loan returned by recording a return date. The loan SHALL remain as history, and its copy SHALL no longer be "on loan".

#### Scenario: Returning an open loan

- **WHEN** a reader marks an open loan returned
- **THEN** the loan gets a return date and remains stored
- **AND** its copy is no longer reported as on loan

### Requirement: Derived on-loan and overdue state

The system SHALL derive a copy's "on loan" state from the loans — a copy is on loan iff it has a loan with no return date — with no stored flag on the copy. A loan SHALL be "overdue" iff it has a due date in the past and no return date.

#### Scenario: On loan is derived, not stored

- **WHEN** a copy's loan state is determined
- **THEN** it is computed from whether an open loan exists, and no field on the `copy` records it

#### Scenario: Overdue is derived from the due date

- **WHEN** an open loan's due date is in the past
- **THEN** it is reported as overdue; once returned, it is not

### Requirement: Loan history and currently-out view

The system SHALL provide the loan history for a copy and for a borrower, and a view of everything currently out (open loans) grouped by borrower.

#### Scenario: History for a copy

- **WHEN** the loans for a copy are requested
- **THEN** all of that copy's loans (open and returned) are returned, most recent first

#### Scenario: What is currently out

- **WHEN** the currently-out view is requested
- **THEN** it lists the open loans (those with no return date), grouped so each borrower's held books appear together

### Requirement: Deleting a copy with loans is blocked

The system SHALL block deleting a `copy` that has any loan — open or returned — responding `409`, so loan history is never orphaned and a lent-out copy cannot be discarded.

#### Scenario: Delete a copy that is on loan

- **WHEN** a client deletes a copy that has an open loan
- **THEN** the system responds `409` and deletes nothing

#### Scenario: Delete a copy with returned-loan history

- **WHEN** a client deletes a copy whose loans are all returned
- **THEN** the system still responds `409` and deletes nothing

#### Scenario: Delete a copy with no loans

- **WHEN** a client deletes a copy that has never been lent
- **THEN** the delete succeeds

### Requirement: Loan reads are public, writes require a session

Reading loan data SHALL NOT require a session; lending, returning, and deleting a loan SHALL require a valid session — consistent with every other resource in the app.

#### Scenario: Browsing loans without signing in

- **WHEN** an unauthenticated visitor opens a loan view
- **THEN** the loans are shown

#### Scenario: Lending without signing in

- **WHEN** an unauthenticated client attempts to lend, return, or delete a loan
- **THEN** the request is rejected and nothing is written
