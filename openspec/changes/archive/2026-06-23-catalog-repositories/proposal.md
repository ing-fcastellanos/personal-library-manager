## Why

The data model from M0 (#5) defined the `Book`, `Copy`, `ReadingEvent`, and `Shelf`
types and their relationships, but only the `readers` collection has a repository and
API behind it (#6). The rest of the catalog has types with no producer: nothing writes
the derived slugs (`authorKeys`/`categoryKeys`/`titleKey`), assembles the `ReadingEvent`
book snapshot, or enforces the referential rules the model assumes. M2's catalog CRUD
(#14+) and every feature above it need a tested, reusable repository + API layer first.

## What Changes

- Add Firestore repositories for `books`, `copies`, `readingEvents`, and `shelves`,
  following the existing `services/readers/repository.ts` pattern (thin, single-collection
  Firestore ops with a `mapDoc` + `*CreateInput`/`*UpdateInput` contract from #5's types).
- Add a thin **service layer** only where operations span entities: `ReadingEvent`
  creation (read the book → compose the denormalized snapshot) and the delete-integrity
  checks. Single-collection entities (`books`, `shelves`) stay repository-only.
- Compute derived slugs on write (`authorKeys`, `categoryKeys`, `titleKey`) via a new
  trivial, pure `lib/text/slug.ts` helper. Real normalization is deferred to enrichment
  (#13); this only fills the field shape so filtering/grouping/prefix-search work.
- Enforce **referential integrity**: validate that a referenced parent exists on create
  (`Copy.bookId`/`shelfId`, `ReadingEvent.readerId`/`bookId`/`copyId`); on delete,
  **block** a `book`/`reader`/`shelf` that still has children with `409`, except deleting
  a `shelf` **desasociates** its copies (nulls their `shelfId`) rather than blocking.
- Add zod-validated REST endpoints under `/api` for all four entities: `list`/`get`/
  `create`/`update`/`delete`, plus three relationship reads (book→copies, book→events,
  reader→events). Reads are public; writes require a session (ADR-0006/0009); a
  `ReadingEvent` is attributed to the validated `body.readerId` (ADR-0013).
- Declare the required Firestore **composite indexes** in a new `firestore.indexes.json`
  and wire it into `firebase.json`.
- Add an **emulator-backed integration test lane** (new Vitest `integration` project run
  via `firebase emulators:exec`), kept out of the default `npm test` so the fast unit/CI
  lane stays emulator-free. Repositories and services are covered against the emulator;
  the slug helper is covered by pure unit tests in the existing `node` lane.

## Capabilities

### New Capabilities

- `catalog-api`: Server-mediated repository, service, and REST layer for the `books`,
  `copies`, `readingEvents`, and `shelves` collections — CRUD, typed relationship
  queries, derived-slug computation, `ReadingEvent` snapshot composition, referential
  integrity rules, required composite indexes, and the emulator-backed test lane.

### Modified Capabilities

<!-- None. #5 (data-model) types and #6 (readers) requirements are unchanged; this change
     implements producers for the existing data-model contract. -->

## Impact

- **New code**: `services/{books,copies,reading-events,shelves}/repository.ts`, the
  cross-entity service(s), `server/routes/{books,copies,reading-events,shelves}.ts`,
  `lib/text/slug.ts`.
- **Modified code**: `server/index.ts` (mount four new routers), `firebase.json`
  (indexes ref), `vitest.config.ts` (add `integration` project), `package.json`
  (`test:emulator` script).
- **New config**: `firestore.indexes.json`.
- **APIs**: ~23 new `/api` endpoints. Reads public, writes session-gated.
- **Dependencies**: none new (reuses Firebase Admin SDK, Express, zod, Vitest, the
  Firebase emulators already configured for the `emulators` script).
- **Deferred / unaffected**: real slug normalization (#13), `condition` enum (#15),
  `workKey` grouping (#38), CSV export (#34) — this change only fixes field/behavior shape.
