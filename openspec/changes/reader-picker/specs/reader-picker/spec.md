## ADDED Requirements

### Requirement: Reusable reader picker

The system SHALL provide a reusable `ReaderPicker` component that displays the household readers (avatar + name) and lets the user select one. It SHALL be controlled (`value` + `onChange`), keyboard-accessible, and mobile-first.

#### Scenario: Select a reader
- **WHEN** the user activates a reader option in the picker
- **THEN** the picker reports that reader's id via `onChange`
- **AND** the selected reader is visually indicated

#### Scenario: Controlled value
- **WHEN** the picker is given a `value`
- **THEN** it shows that reader as selected without internal state overriding it

### Requirement: Attribution is not gated

The reader picker SHALL NOT require a PIN or any authentication step to change the selection (ADR-0013): selecting an attributed reader is not a security boundary.

#### Scenario: No PIN on selection
- **WHEN** the user switches the selected reader in the picker
- **THEN** the change takes effect immediately with no PIN prompt

### Requirement: Household readers loader

The system SHALL provide a `useReaders` hook that loads the household readers from the server (`/api/readers`) and exposes loading state, so the picker and future consumers share one source.

#### Scenario: Readers available to the picker
- **WHEN** the picker mounts
- **THEN** it renders the household readers returned by the loader
