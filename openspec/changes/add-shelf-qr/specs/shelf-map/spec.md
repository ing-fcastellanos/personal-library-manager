## ADDED Requirements

### Requirement: Per-shelf QR

Each shelf in the Shelves Manager SHALL offer a "Ver QR" action that opens a dialog showing a QR code encoding `/scan?action=add&shelf=<id>` for that shelf, identified by real text (the shelf's name), not the QR alone.

#### Scenario: Ver QR opens the shelf's code

- **WHEN** a reader chooses "Ver QR" for a shelf
- **THEN** a dialog opens showing that shelf's QR code and its name as a label

#### Scenario: The QR encodes the add action for that shelf

- **WHEN** the shelf's QR is decoded
- **THEN** it resolves to `/scan?action=add&shelf=<that shelf's id>`

### Requirement: Print a single shelf's QR

The dialog SHALL offer a way to print just that shelf's QR tile — not the rest of the Settings page, and not other shelves' QRs — sized and margined consistently with the action QRs from #31 (physical cm units, a solid border as the cut line).

#### Scenario: Printing from the dialog prints only the one tile

- **WHEN** a reader prints while a shelf's QR dialog is open
- **THEN** the printed output contains only that shelf's QR tile, not the Settings page content or the dialog's own screen chrome
