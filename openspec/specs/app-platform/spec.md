# app-platform Specification

## Purpose
TBD - created by archiving change scaffold-app. Update Purpose after archive.
## Requirements
### Requirement: Single-process Express + Next.js server

The system SHALL run as a single Node process in which an Express server renders the Next.js (App Router) application for all non-API routes, so that web and API are served from one deployable unit (per ADR-0003).

#### Scenario: Web route is server-rendered
- **WHEN** a client requests a non-API route (e.g. `/`)
- **THEN** the Express server delegates to the Next.js request handler
- **AND** responds with `200` and server-rendered HTML

#### Scenario: API and web share one server
- **WHEN** the application is started with `npm start`
- **THEN** a single process listens on the configured port serving both `/api/*` and the Next.js app

### Requirement: Health endpoint

The system SHALL expose `GET /api/health` handled by Express, returning HTTP `200` with a JSON body indicating service status, so that Cloud Run and CI can verify liveness (per ADR-0001).

#### Scenario: Health check succeeds
- **WHEN** a client sends `GET /api/health`
- **THEN** the server responds with status `200`
- **AND** a JSON body `{ "status": "ok" }`

### Requirement: Configurable port and environment

The system SHALL read its listening port from the `PORT` environment variable (defaulting to `3000`) and load local environment variables via `dotenv`, so the same image runs locally and on Cloud Run.

#### Scenario: Port from environment
- **WHEN** the server starts with `PORT=8080` set
- **THEN** it listens on port `8080`

#### Scenario: Default port
- **WHEN** the server starts with no `PORT` set
- **THEN** it listens on port `3000`

### Requirement: Reproducible scripts and type safety

The system SHALL provide npm scripts `dev`, `build`, `start` and `typecheck`, and the codebase MUST pass `typecheck` with no errors, so contributors and CI have a consistent entrypoint.

#### Scenario: Production build and start
- **WHEN** a contributor runs `npm run build` followed by `npm start`
- **THEN** the build completes successfully and the server serves the app in production mode

#### Scenario: Type checking passes
- **WHEN** `npm run typecheck` is run on a clean checkout
- **THEN** it exits with code `0`

