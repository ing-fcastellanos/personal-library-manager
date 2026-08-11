## ADDED Requirements

### Requirement: The shelf photo stays available while reviewing the results

The system SHALL retain the captured shelf photo for the duration of the add-by-shelf flow
and offer it for reference on the results screen, so a reader judging an identified book can
check it against what was actually in frame. The photo SHALL be collapsed initially, so it
never displaces the results, and SHALL be expandable and collapsible on demand. Capturing a
new photo SHALL replace the retained one. The photo SHALL NOT be uploaded or persisted — it
exists only for the length of the flow.

#### Scenario: Photo is offered but collapsed when results appear

- **WHEN** the shelf photo has been analyzed and the results are shown
- **THEN** the screen offers the captured photo for reference
- **AND** the photo is not expanded, so the identified books remain visible without
  scrolling past it

#### Scenario: Reader expands and collapses the photo

- **WHEN** the reader expands the shelf photo from the results screen
- **THEN** the photo is shown
- **AND** collapsing it returns the results to their previous layout

#### Scenario: Photo is available when nothing was recognized

- **WHEN** the analysis returns no recognized books
- **THEN** the captured photo is still offered for reference, so the reader can see what
  was in frame rather than only being advised to retake it

#### Scenario: Retaking replaces the photo

- **WHEN** the reader captures a new shelf photo from the results screen
- **THEN** the newly captured photo is the one offered for reference, and the previous one
  is no longer shown

#### Scenario: The photo is not persisted

- **WHEN** the add-by-shelf flow ends
- **THEN** the captured photo was never uploaded or stored, and is not retrievable
  afterwards

### Requirement: The shelf photo can be viewed full screen

The system SHALL let the reader open the shelf photo full screen from the results screen, so
individual spines are legible rather than merely visible — an inline photo on a phone is too
small to read a spine, which is the reason for consulting it. The full-screen view SHALL be
dismissible, returning to the results.

#### Scenario: Opening the photo full screen

- **WHEN** the reader activates the shelf photo shown on the results screen
- **THEN** the photo is presented full screen, sized so spine text can be read

#### Scenario: Dismissing returns to the results

- **WHEN** the reader dismisses the full-screen photo
- **THEN** the results screen is shown again, with the reader's progress unchanged
