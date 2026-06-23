## Context

#5 (data-model) froze the `Book`/`Copy`/`ReadingEvent`/`Shelf` zod types and their
relationships; #6 shipped the only existing producer, `services/readers/repository.ts`

- `server/routes/readers.ts`. That pair establishes the house pattern: a thin
  repository (one Firestore collection, a `mapDoc`, `*CreateInput`/`*UpdateInput`
  contracts, conflict errors as named exceptions) behind a zod-validated Express router
  mounted on `/api`, with reads public and writes behind `requireAuth` (ADR-0006/0009).
  Server access goes through the Firebase Admin SDK, which **bypasses Firestore security
  rules** — so authorization is enforced in Express, not in `firestore.rules`.

#4 added Vitest with two projects (`node`, `jsdom`) plus an already-configured
`firebase emulators` script. Until now there was no producer for the catalog types and
no emulator-backed test lane. This change adds both.

## Goals / Non-Goals

**Goals:**

- A reusable repository + API layer for the four catalog collections, matching the
  readers pattern so the codebase stays uniform.
- Enforce the data-model's implicit invariants (parent existence, snapshot, slugs,
  delete policy) in one place rather than scattering them across future features.
- A real, emulator-backed test lane proving the data layer works, kept off the fast CI
  lane so unit/CI stays fast and emulator-free.

**Non-Goals:**

- Real metadata/slug normalization (#13), `condition` enum (#15), `workKey` grouping
  (#38), CSV export (#34) — this change only fixes field/behavior shape.
- Catalog UI (M2 #14+), search ranking (#17), pagination beyond simple ordering.
- Deploying the indexes (the deploy pipeline is #3); this change only _declares_ them.

## Decisions

### D1 — Layering: thin repos + a service only where ops span entities

Repositories stay single-collection and Firestore-pure, exactly like `readers`. A thin
**service layer** is introduced only where an operation crosses entities or enforces an
invariant that needs another collection: `ReadingEvent` create (read book → compose
snapshot, validate `readerId`/`bookId`/`copyId`) and the delete-integrity checks
(count children before deleting; desasociate copies on shelf delete). `books` and
`shelves` are CRUD-only and stay repository+route.

- _Alternative — push cross-entity logic into the route:_ fewer files, but routes get
  fat and the integrity logic becomes the unit the emulator tests must drive through
  HTTP. Rejected: the service is the natural test seam.
- _Alternative — a repo method that calls another repo:_ blurs the "one collection per
  repo" rule and creates repo↔repo cycles. Rejected.

### D2 — Slugs via a pure `lib/text/slug.ts`, computed in the book repo on write

A deterministic `slugify` (lowercase, strip diacritics, collapse to kebab) and an
`arraySlugs` helper live in `lib/text/`, pure and unit-tested in the `node` lane. The
book repository calls them on create/update to fill `authorKeys`/`categoryKeys`/
`titleKey`. #13 later swaps the algorithm without touching callers.

- _Alternative — compute slugs in the route:_ duplicated across create/update and
  untestable without HTTP. Rejected.

### D3 — Referential integrity: validate-on-create, policy-on-delete

Create paths verify referenced parents exist before writing. Delete paths run a
child-count query first: `book`/`reader` with children → `409` (named error →
`409` in route, mirroring `ReaderEmailConflictError`); `shelf` → always succeeds and
desasociates copies (batch-null `shelfId`). Firestore has no foreign keys, so this is
enforced in the service layer.

- _Trade-off:_ check-then-write is not atomic against concurrent inserts. For a
  single-household app the race is negligible; where it matters (uid uniqueness in
  readers) a transaction is already the established tool and can be applied later.
  Documented as a risk rather than solved with transactions everywhere now.

### D4 — Auth in Express, attribution from body

Writes reuse `requireAuth`; reads are unguarded — same as readers. `ReadingEvent`
create reads `readerId` from the validated body (ADR-0013 reader-picker), not from the
session, so one logged-in device can log readings for any household member. The
`readerId` is validated to exist as part of D3.

### D5 — Indexes declared in `firestore.indexes.json`

Relationship/ordered queries (`copies where bookId == x`, `readingEvents where bookId
== x order by ...`, `readingEvents where readerId == x order by ...`) get explicit
composite-index entries. Single-field equality/order queries that Firestore indexes
automatically are _not_ declared. `firebase.json` gains a `firestore.indexes` pointer.

### D6 — Emulator test lane as a third Vitest project

Add an `integration` Vitest project (include `**/*.integration.test.ts`) run via a new
`test:emulator` script: `firebase emulators:exec --only firestore 'vitest run --project
integration'`. The default `npm test` keeps running only `node`+`jsdom`. A small test
helper points the Admin SDK at the emulator (`FIRESTORE_EMULATOR_HOST`) and clears
collections between tests.

- _Alternative — fold emulator tests into the `node` project:_ would force every CI
  run (and the pre-commit hook) to boot the emulator. Rejected: keeps the fast lane fast.

## Risks / Trade-offs

- **Check-then-write races on integrity** → accept for a single-household app; reserve
  transactions for cases that demonstrably need them (D3).
- **Snapshot drift**: an event's book snapshot can grow stale if the book is later
  edited → intentional (ADR-0007 records the book _at event time_); no back-propagation.
- **Emulator lane flakiness/CI time** → keep it off the default/pre-commit lane; run it
  as an explicit `test:emulator` step so a flaky emulator never blocks a commit.
- **Index drift**: a new query without a matching index fails only in prod → the spec
  requires every composite-needing query to have a declared entry; reviewed in PR.
- **Slug placeholder churn**: #13 will change normalized values → acceptable because
  slugs are server-derived and recomputable; no client contract depends on the exact form.

## Migration Plan

No data migration — these collections are empty. Deploy order is just code: land the
repos/services/routes/indexes, mount the routers, add the test lane. Index _deployment_
is owned by #3; until then queries work against the emulator and any dev project with
indexes auto-created on first use. Rollback = revert the change; no schema to undo.

## Open Questions

- None blocking. `condition` enum (#15) and richer slug normalization (#13) are
  explicitly deferred and tracked by their own issues.
