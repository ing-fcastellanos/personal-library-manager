## ADDED Requirements

### Requirement: Capture rating and review when marking a reading

When marking a book as read, the system SHALL let the active reader optionally
add a **rating** (an integer 1–5) and an optional **review** (free text). Both are
optional — a reading can be marked without them. When provided, they MUST be sent
in the create request and persisted on the `ReadingEvent`.

#### Scenario: Marking with a rating and review

- **WHEN** the reader sets a rating and/or writes a review before confirming
- **THEN** the created `ReadingEvent` includes the chosen `rating` and `review`

#### Scenario: Marking without rating or review

- **WHEN** the reader confirms without touching the rating or review
- **THEN** the reading is created with `rating` null and `review` null

### Requirement: Edit an existing reading's rating and review

The system SHALL let the active reader edit the rating and review of their reading
after the fact. Editing MUST update the existing event via `PATCH
/api/reading-events/:id` (not create a new one) and reflect the new values on
return.

#### Scenario: Editing a reading

- **WHEN** the reader opens edit for their reading and changes the rating/review
- **THEN** the system PATCHes that event and the updated rating/review are shown

#### Scenario: Clearing a rating

- **WHEN** the reader removes a previously set rating while editing
- **THEN** the event is updated so the rating is no longer shown

### Requirement: Display rating and review on the book detail

The book detail SHALL show each reader's rating (as stars) and review text on
their row in the "Lectura" section when present. The active reader's own reading
SHALL offer an edit affordance; other readers' ratings/reviews are read-only.

#### Scenario: Showing a rated reading

- **WHEN** a reader has a finished reading with a rating and/or review
- **THEN** their row shows the star rating and the review text

#### Scenario: Active reader can edit, others cannot

- **WHEN** the book detail renders reading rows
- **THEN** only the active reader's row exposes an "Editar" action
- **AND** other readers' rows show their rating/review without an edit control

### Requirement: Accessible star rating control

The rating control SHALL be an accessible 1–5 star selector operable by keyboard
and exposed with radio-group semantics, and MUST allow clearing the selection back
to no rating.

#### Scenario: Keyboard operation

- **WHEN** the reader focuses the star control and uses the keyboard
- **THEN** they can set a value from 1 to 5 and clear it, with a visible focus state
