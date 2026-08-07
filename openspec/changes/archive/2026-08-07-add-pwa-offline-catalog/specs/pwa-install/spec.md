## ADDED Requirements

### Requirement: Complete installable manifest with icon set

The system SHALL serve a `manifest.webmanifest` declaring icons at 192×192 and 512×512 (purpose `any`) plus a maskable icon, so mobile browsers can offer "Add to Home Screen" with a correctly-rendered icon on Android.

#### Scenario: Manifest lists required icon sizes

- **WHEN** a client fetches `/manifest.webmanifest`
- **THEN** it lists at least a 192×192 icon, a 512×512 icon, and one icon with `purpose: "maskable"`

### Requirement: iOS home screen icon

The system SHALL declare an `apple-touch-icon` link in the document head, so iOS Safari shows a correct icon when the app is added to the home screen (Safari does not read the web manifest's icons).

#### Scenario: Apple touch icon present

- **WHEN** a client requests any page
- **THEN** the response HTML includes a `<link rel="apple-touch-icon">` pointing to a PNG icon
