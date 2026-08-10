## MODIFIED Requirements

### Requirement: Network-first cache-on-visit for same-origin GETs

The service worker SHALL intercept same-origin `GET` requests **other than API requests**, attempt the network first, cache a copy of any successful (`200`) response, and serve the cached copy only when the network request fails. The worker SHALL NOT serve a cached response when the network succeeds. API requests are excluded from this requirement and are governed by "API requests are never cached or served from cache".

#### Scenario: Successful visit is cached

- **WHEN** a same-origin non-API `GET` request succeeds with `200` while online
- **THEN** the response is stored in the offline cache
- **AND** the live network response is what the client receives

#### Scenario: Cached page serves when offline

- **WHEN** a same-origin non-API `GET` request is made for a URL previously cached, and the network is unavailable
- **THEN** the cached response is served instead of a network error

#### Scenario: Never-visited route offline falls through

- **WHEN** a same-origin non-API `GET` request is made for a URL with no cached entry, and the network is unavailable
- **THEN** the request fails and the browser's native offline error page is shown

#### Scenario: Network takes priority over cache when both are available

- **WHEN** a same-origin non-API `GET` request has both a cached entry and a working network
- **THEN** the network response is returned, not the cached one

## ADDED Requirements

### Requirement: API requests are never cached or served from cache

The service worker SHALL NOT intercept any same-origin request whose path is `/api` or begins with `/api/`, regardless of method. Such requests SHALL pass through to the network exactly as they would with no service worker installed: the worker SHALL NOT write their responses to the cache, and SHALL NOT serve a cached response for them when the network fails.

This exists because API responses are session-shaped: `GET /api/auth/me` resolves the signed-in reader from the session cookie, so caching it both persists session state to disk beyond the session's control (cache storage is scoped per origin, not per session, and survives logout) and allows a stale response — including a signed-out `{"reader":null}` — to be replayed on any transient network failure.

#### Scenario: API response is not written to the cache

- **WHEN** a same-origin `GET /api/...` request succeeds with `200` while online
- **THEN** no copy of the response is written to the offline cache

#### Scenario: API request offline fails instead of serving a stale response

- **WHEN** a same-origin `GET /api/...` request is made while the network is unavailable
- **THEN** the request fails with a network error
- **AND** no cached response is substituted, even if a response for that URL was cached by an earlier version of the service worker

#### Scenario: Session identity is not replayed after a network blip

- **WHEN** `GET /api/auth/me` fails because of a transient network failure
- **THEN** the failure is surfaced to the caller
- **AND** no previously cached reader identity — signed-in or signed-out — is returned in its place

### Requirement: A cache strategy change purges responses cached under the previous strategy

The service worker SHALL name its cache with a version marker, and on activation SHALL delete every cache belonging to the origin whose name does not match the current one. When the set of responses eligible for caching is narrowed, the version marker SHALL be advanced, so that responses cached under the previous, broader strategy are removed from the device rather than left readable.

#### Scenario: Previously cached API responses are removed on upgrade

- **WHEN** a client that cached API responses under a previous version of the service worker loads the app after the caching strategy is narrowed to exclude them
- **THEN** the newly activated service worker deletes the previous cache in its entirety
- **AND** the previously cached API responses are no longer present on the device or retrievable from any cache

#### Scenario: Static assets are re-cached after the purge

- **WHEN** the previous cache has been deleted on activation
- **THEN** static assets are cached again on the next successful visit to each, with no manual action required from the reader
