# design-system Specification

## Purpose
TBD - created by archiving change design-system-base. Update Purpose after archive.
## Requirements
### Requirement: Design tokens as single source of truth

The system SHALL define design tokens (color, typography scale, spacing, radius, shadow, breakpoints) as CSS variables that are mapped into the Tailwind theme, so that both Claude Design handoffs and application code reference one canonical set of tokens (ADR-0010).

#### Scenario: Tokens drive Tailwind utilities
- **WHEN** a component uses a themed Tailwind utility (e.g. a background or text color)
- **THEN** the rendered style resolves to the corresponding CSS variable token
- **AND** changing the token value updates every consumer without code edits

#### Scenario: Tokens are the documented contract
- **WHEN** a new UI screen is built via the Claude Design handoff
- **THEN** it consumes the existing tokens rather than introducing ad-hoc colors or spacing

### Requirement: Light and dark theming

The system SHALL support light and dark themes by switching token values, SHALL expose a control to change the theme, and SHALL persist the user's choice across sessions.

#### Scenario: Toggle theme
- **WHEN** the user switches the theme
- **THEN** the UI updates to the selected theme using the token values
- **AND** the choice persists on reload

### Requirement: Accessible primitive component library

The system SHALL provide a base library of accessible UI primitives (at minimum: button, input, select, dialog, toast, card, skeleton, empty state, badge, tabs, avatar, dropdown) built on shadcn/ui, with no domain-specific components in this layer.

#### Scenario: Primitive is keyboard and screen-reader accessible
- **WHEN** a user operates a primitive (e.g. opens a dialog) via keyboard
- **THEN** focus is managed correctly and ARIA semantics are present

#### Scenario: Primitives reflect tokens
- **WHEN** primitives render
- **THEN** their colors, radii and spacing come from the design tokens

### Requirement: Responsive app shell

The system SHALL provide an app shell that presents a **bottom navigation bar on mobile** and a **sidebar on desktop**, exposing the five sections: Dashboard, Add, Mark-read, Catalog, Settings.

#### Scenario: Mobile layout
- **WHEN** the app is viewed on a mobile viewport
- **THEN** the navigation appears as a bottom bar with the five sections

#### Scenario: Desktop layout
- **WHEN** the app is viewed on a desktop viewport
- **THEN** the navigation appears as a sidebar with the five sections

### Requirement: Deep-link landing

The system SHALL allow the shell to open directly on a specific action route (e.g. Add or Mark-read) without first routing through the home screen, so QR deep-links (#32) land on their action.

#### Scenario: Direct action route
- **WHEN** the app is opened at an action route (e.g. `/add`)
- **THEN** the shell renders that action's screen directly with navigation present

### Requirement: Installable PWA base

The system SHALL ship a web app manifest, icons, viewport and theme-color so the app is installable on mobile, without offline/service-worker behavior (which is out of scope, handled by #41).

#### Scenario: Installable
- **WHEN** the app is loaded on a supported mobile browser
- **THEN** it offers installation and launches standalone with the configured name, icons and theme color

### Requirement: Style-guide reference

The system SHALL provide a style-guide page that renders the design tokens and the primitive components, to serve as the living reference that Claude Design handoffs target.

#### Scenario: Style guide renders tokens and primitives
- **WHEN** a contributor opens the style-guide page
- **THEN** it shows the token palette/scales and a gallery of the primitive components in their states

