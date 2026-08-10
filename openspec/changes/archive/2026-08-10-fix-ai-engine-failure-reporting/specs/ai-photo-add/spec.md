## MODIFIED Requirements

### Requirement: Photo capture entry point

The "Agregar" experience SHALL offer a photo entry point that captures an image using the
device camera (mobile-first) and sends it to `/api/ai/identify`. While the request is in
flight the UI SHALL show an analyzing state; a failed request SHALL show a recoverable
error.

The error SHALL distinguish an unavailable identification service from a photo the AI ran
against but could not recognize. When the request fails because the service is unavailable,
the UI SHALL NOT attribute the failure to the photo, and SHALL NOT suggest that retaking it
would help.

#### Scenario: Capture and analyze

- **WHEN** a reader takes a photo from the add-by-photo entry point
- **THEN** the photo is sent to `/api/ai/identify` and the UI shows an analyzing state
  until candidates return

#### Scenario: Identification error is recoverable

- **WHEN** `/api/ai/identify` fails or no engine is available
- **THEN** the UI shows an error with a way to retry, and nothing is saved

#### Scenario: An unavailable service is not blamed on the photo

- **WHEN** `/api/ai/identify` responds that no AI engine is available
- **THEN** the UI states that the identification service is unavailable
- **AND** does not say the photo was unclear, nor advise retaking it with better light or
  framing

#### Scenario: An unrecognized book still points at the photo

- **WHEN** `/api/ai/identify` succeeds but returns no candidate
- **THEN** the UI reports that the book was not recognized and may suggest retaking the
  photo, since a clearer photo can plausibly change the outcome
