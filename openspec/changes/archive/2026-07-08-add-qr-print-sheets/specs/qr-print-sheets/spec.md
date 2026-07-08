## ADDED Requirements

### Requirement: Render the three action QR codes

The system SHALL render three QR codes client-side, one per action (`dashboard`, `agregar`, `finish`), each encoding the absolute URL `<origin>/scan?action=<action>` computed from `window.location.origin` at render time. No server request SHALL be made to generate a QR.

#### Scenario: Three QR codes render on the page

- **WHEN** the QR print page loads
- **THEN** three QR codes are drawn, one for each action, each encoding an absolute `/scan?action=...` URL for the current origin

#### Scenario: QR encodes the running origin

- **WHEN** the page is opened on a different origin (e.g. `localhost` vs. the deployed domain)
- **THEN** the encoded URL reflects that origin, with no hardcoded domain

### Requirement: Each QR has a legible label

Each QR code SHALL be paired with a real-text label naming its action in Spanish (e.g. "Ver dashboard", "Agregar libro", "Registrar leído") — not conveyed by the QR's content alone, so a person can identify which code is which without scanning it.

#### Scenario: Labels are visible text

- **WHEN** the page renders
- **THEN** each QR has an adjacent text label naming its action, readable without scanning

### Requirement: Print-friendly sheet layout

The system SHALL provide a print stylesheet (`@media print`) that hides the app's chrome (header, navigation) and lays out the three QRs with fixed physical-unit sizing and margins suitable for printing and cutting out individually, triggered via a "Imprimir" action that calls `window.print()`.

#### Scenario: Print view hides app chrome

- **WHEN** the page is printed
- **THEN** the header and navigation are hidden, leaving only the QR codes and their labels

#### Scenario: Imprimir triggers the browser print dialog

- **WHEN** the reader activates "Imprimir"
- **THEN** the browser's print dialog opens via `window.print()`

### Requirement: Accessible from Settings

The system SHALL provide an entry point to the QR print page from `/ajustes`, consistent with the other setup/admin actions already there (shelves, readers). The page itself SHALL NOT require authentication to view, consistent with `/ajustes`'s existing behavior — printing a QR sheet is a read-only, non-attributed action.

#### Scenario: Settings links to the QR print page

- **WHEN** a reader is on `/ajustes`
- **THEN** they can navigate to the QR print page from a link/action there

#### Scenario: QR print page loads without a session

- **WHEN** a signed-out visitor opens the QR print page directly
- **THEN** the page renders the three QR codes without requiring sign-in
