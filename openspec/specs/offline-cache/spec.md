# offline-cache Specification

## Purpose

TBD - created by archiving change add-pwa-offline-catalog. Update Purpose after archive.

## Requirements

### Requirement: Service worker registration

The system SHALL register a service worker from the client shell on first load, without blocking initial render, so subsequent visits are covered by the offline cache.

#### Scenario: Service worker registers on load

- **WHEN** a client loads the app in a browser that supports service workers
- **THEN** `navigator.serviceWorker.register()` is called for `/sw.js`
- **AND** the app's initial render is not delayed waiting for registration to resolve

### Requirement: Network-first cache-on-visit for same-origin GETs

The service worker SHALL intercept same-origin `GET` requests, attempt the network first, cache a copy of any successful (`200`) response, and serve the cached copy only when the network request fails. The worker SHALL NOT serve a cached response when the network succeeds.

#### Scenario: Successful visit is cached

- **WHEN** a same-origin `GET` request succeeds with `200` while online
- **THEN** the response is stored in the offline cache
- **AND** the live network response is what the client receives

#### Scenario: Cached page serves when offline

- **WHEN** a same-origin `GET` request is made for a URL previously cached, and the network is unavailable
- **THEN** the cached response is served instead of a network error

#### Scenario: Never-visited route offline falls through

- **WHEN** a same-origin `GET` request is made for a URL with no cached entry, and the network is unavailable
- **THEN** the request fails and the browser's native offline error page is shown

#### Scenario: Network takes priority over cache when both are available

- **WHEN** a same-origin `GET` request has both a cached entry and a working network
- **THEN** the network response is returned, not the cached one

### Requirement: Writes are unaffected by the offline cache

The service worker SHALL NOT intercept or cache non-`GET` requests (`POST`, `PATCH`, `DELETE`). Such requests SHALL pass through to the network unmodified, failing with the application's existing error handling when offline.

#### Scenario: Write request offline fails normally

- **WHEN** a `POST`/`PATCH`/`DELETE` request is made while offline
- **THEN** it fails with a network error surfaced through the app's existing error handling
- **AND** no cached response is substituted
