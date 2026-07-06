# barcode-add Specification

## Purpose

TBD - created by archiving change add-isbn-barcode-scan. Update Purpose after archive.

## Requirements

### Requirement: "Por código" entry point

The "Agregar" experience SHALL offer a barcode-scan entry point ("Por código") alongside
the existing Por foto / Por estante / Manual options, write-gated like the others (a
signed-out reader gets the sign-in prompt).

#### Scenario: Reader opens the barcode scanner

- **WHEN** a signed-in reader selects "Por código"
- **THEN** the barcode scan flow opens (live camera, or the manual-entry fallback if the
  camera is unavailable)

#### Scenario: Signed-out reader is gated

- **WHEN** a signed-out reader opens "Agregar"
- **THEN** the sign-in prompt is shown and the scanner is not started

### Requirement: Decode ISBN barcodes with a fallback decoder

The scanner SHALL decode EAN-13 book barcodes from a live camera stream, using the native
`BarcodeDetector` API when available and falling back to a lazily-loaded JavaScript decoder
otherwise, so the flow works across browsers (including those without the native API). The
decoder choice SHALL be transparent to the rest of the flow.

#### Scenario: Native decoder path

- **WHEN** the browser provides `BarcodeDetector`
- **THEN** the scanner uses it and does not download the JavaScript fallback

#### Scenario: Fallback decoder path

- **WHEN** the browser lacks `BarcodeDetector`
- **THEN** the scanner lazily loads the JavaScript decoder and scans with it

### Requirement: Only valid book ISBNs are accepted

A scanned code SHALL be accepted only when it is a 13-digit EAN with a `978`/`979` prefix
and a valid EAN-13 checksum; any other decode (EAN-5 supplement, product barcode, or a
mis-read) SHALL be ignored so scanning continues. The validation SHALL be a pure,
unit-testable function.

#### Scenario: Valid book ISBN is accepted

- **WHEN** the camera decodes a 13-digit `978…`/`979…` code with a valid checksum
- **THEN** it is accepted as an ISBN and enrichment is attempted

#### Scenario: Non-book or malformed code is ignored

- **WHEN** the camera decodes a non-978/979 EAN, an EAN-5 supplement, or a checksum-invalid
  code
- **THEN** it is ignored and the scanner keeps scanning without interrupting the reader

### Requirement: Continuous scan → confirm → save loop

Scanning SHALL run continuously: on a valid ISBN the loop pauses, the book is resolved via
the existing ISBN enrichment, and a confirm card (cover/title/author) is shown. Confirming
saves the book via the existing intake to the batch shelf and resumes scanning; discarding
resumes without saving. Pausing on detection prevents the same in-frame barcode from being
re-processed repeatedly. All books saved in the session accumulate into the shared import
summary, shown when the reader finishes.

#### Scenario: Scan, confirm, and continue

- **WHEN** a valid ISBN is scanned and the reader confirms the resolved book
- **THEN** it is saved to the batch shelf and the scanner resumes for the next book

#### Scenario: Discard keeps scanning

- **WHEN** the reader discards the confirm card
- **THEN** nothing is saved and the scanner resumes

#### Scenario: The same in-frame barcode is not re-processed

- **WHEN** a barcode stays in frame after being confirmed or discarded
- **THEN** it is not immediately re-opened as a new detection

#### Scenario: Finishing shows the summary

- **WHEN** the reader ends the session after scanning one or more books
- **THEN** the shared import summary lists what was added / added-as-copy, with per-item undo

### Requirement: Duplicates and batch shelf are reused

The flow SHALL run the existing duplicate check on each resolved ISBN and, for a book
already in the library, offer the existing "add as copy" / skip handling. A single shelf
selector SHALL apply to every book saved in the session, as in the shelf batch flow.

#### Scenario: Scanned book already in the library

- **WHEN** a scanned ISBN resolves to a book already owned
- **THEN** the reader is offered to add it as a copy or skip it, rather than creating a
  duplicate book

#### Scenario: Batch shelf applies to all scans

- **WHEN** the reader picks a shelf and scans several books
- **THEN** every saved book's copy is assigned to that shelf

### Requirement: Manual ISBN entry and camera fallback

The flow SHALL provide a manual ISBN input that resolves through the same enrichment path,
usable both for books without a barcode and when the camera cannot start. When the camera
permission is denied or no camera is available, the flow SHALL present the manual input
(with a way to retry the camera) rather than dead-ending.

#### Scenario: Manual ISBN entry

- **WHEN** the reader types a valid ISBN (10 or 13) into the manual input
- **THEN** it resolves through the same enrichment + confirm + save path as a scan

#### Scenario: Camera denied or unavailable

- **WHEN** `getUserMedia` is denied or no camera exists
- **THEN** the manual ISBN input is shown with an option to retry the camera, and the flow
  remains usable
