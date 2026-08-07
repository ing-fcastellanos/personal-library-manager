## ADDED Requirements

### Requirement: Rate-limiting on write requests

The system SHALL rate-limit non-`GET` requests under `/api/*` per client, rejecting requests beyond the limit with `429`, so an accidental or malicious write loop cannot exhaust the server or the database. The limit SHALL be generous enough that legitimate bursty operations (bulk restore, CSV import) do not trigger it in normal use.

#### Scenario: Writes within the limit succeed normally

- **WHEN** a client's non-`GET` `/api/*` requests stay under the configured limit within the window
- **THEN** every request is handled normally, with no change in behavior

#### Scenario: Writes beyond the limit are rejected

- **WHEN** a client exceeds the configured number of non-`GET` `/api/*` requests within the window
- **THEN** further requests in that window receive `429` instead of reaching the route handler

#### Scenario: Reads are never rate-limited

- **WHEN** a client sends any number of `GET` requests under `/api/*`
- **THEN** none of them are subject to the write rate limit
