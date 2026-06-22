## ADDED Requirements

### Requirement: Reusable reader picker

The system SHALL provide a reusable `ReaderPicker` that displays the household readers (avatar + name) and lets the user select one. It SHALL be controlled (`value` + `onChange`), keyboard-accessible, and mobile-first.

#### Scenario: Select a reader
- **WHEN** the user activates a reader option in the picker
- **THEN** the picker reports that reader's id via `onChange` and indicates the selection

#### Scenario: Controlled value
- **WHEN** the picker is given a `value`
- **THEN** it shows that reader as selected without internal state overriding it

### Requirement: Attribution is not gated

The reader picker SHALL NOT require a PIN or any authentication step to change the selection (ADR-0013): selecting an attributed reader is not a security boundary.

#### Scenario: No PIN on selection
- **WHEN** the user switches the selected reader in the picker
- **THEN** the change takes effect immediately with no PIN prompt

### Requirement: Household readers loader

The system SHALL provide a `useReaders` hook that loads the household readers from `/api/readers` and exposes loading state, shared by the picker and future consumers.

#### Scenario: Readers available to the picker
- **WHEN** the picker mounts without explicit `readers`
- **THEN** it renders the household readers returned by the loader

### Requirement: Switch reader by re-login

The system SHALL offer a "switch reader" action that signs the current reader out and routes to login, so another reader signs in fresh (ADR-0013). It SHALL NOT establish another reader's session via the PIN.

#### Scenario: Switch reader signs out and prompts login
- **WHEN** the active reader chooses "switch reader"
- **THEN** the session is cleared and the login view is shown for the next reader

### Requirement: PIN lock re-confirms the active reader

The system SHALL provide a lock that, on a shared device, gates access behind the **active reader's** PIN (reusing the PIN verify backend). Unlocking SHALL only re-confirm the same authenticated reader; it SHALL NOT switch to a different reader.

#### Scenario: Lock then unlock with the correct PIN
- **WHEN** the active reader locks the device and later enters their correct PIN
- **THEN** access is restored for the same reader

#### Scenario: Wrong PIN keeps it locked
- **WHEN** an incorrect PIN is entered on the lock screen
- **THEN** access remains locked (and repeated failures are rate-limited by the backend)
