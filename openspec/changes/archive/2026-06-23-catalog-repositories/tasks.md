## 1. Foundations (slug helper + emulator test lane)

- [x] 1.1 Add `lib/text/slug.ts`: pure `slugify(input)` (lowercase, strip diacritics,
      collapse to kebab) and `arraySlugs(values)`; export types if useful (D2)
- [x] 1.2 Add `lib/text/slug.test.ts` unit tests (node lane): diacritics, casing,
      collapsing, empty/edge inputs, determinism
- [x] 1.3 Add `integration` project to `vitest.config.ts` (include
      `**/*.integration.test.ts`), excluded from the `node`/`jsdom` includes (D6)
- [x] 1.4 Add `test:emulator` script to `package.json`:
      `firebase emulators:exec --only firestore 'vitest run --project integration'`
- [x] 1.5 Add an integration test helper (point Admin SDK at `FIRESTORE_EMULATOR_HOST`,
      clear collections between tests) under a shared test-utils location

## 2. Shelves (CRUD-only, simplest)

- [x] 2.1 `services/shelves/repository.ts`: `mapDoc`, list/get/create/update/delete
      against `shelves`, following the readers pattern
- [x] 2.2 `server/routes/shelves.ts`: zod-validated list/get/create/update/delete on
      `/api/shelves`; reads public, writes `requireAuth` (D4)
- [x] 2.3 `services/shelves/repository.integration.test.ts`: CRUD round-trip against emulator

## 3. Books (CRUD + derived slugs)

- [x] 3.1 `services/books/repository.ts`: CRUD against `books`; on create/update compute
      `authorKeys`/`categoryKeys`/`titleKey` via `lib/text/slug` (D2)
- [x] 3.2 `server/routes/books.ts`: zod-validated CRUD on `/api/books`; reads public,
      writes `requireAuth`
- [x] 3.3 `services/books/repository.integration.test.ts`: CRUD + asserts slugs derived
      on create and recomputed on update

## 4. Copies (CRUD + parent validation + shelf desasociation)

- [x] 4.1 `services/copies/repository.ts`: CRUD against `copies`; `listByBook(bookId)`;
      `unshelveByShelf(shelfId)` (batch-null `shelfId`)
- [x] 4.2 Validate `bookId` exists (and `shelfId` if provided) on copy create; reject
      missing parent (D3)
- [x] 4.3 `server/routes/copies.ts`: zod-validated CRUD on `/api/copies` + book→copies
      relationship read; writes `requireAuth`
- [x] 4.4 Extend shelf delete to desasociate copies via `unshelveByShelf` (D3)
- [x] 4.5 `services/copies/repository.integration.test.ts`: CRUD, missing-parent rejection,
      shelf-delete desasociation

## 5. Reading events (snapshot service + attribution + integrity)

- [x] 5.1 `services/reading-events/repository.ts`: CRUD against `readingEvents`;
      `listByBook(bookId)`, `listByReader(readerId)`
- [x] 5.2 `services/reading-events/service.ts`: create composes the book snapshot
      (`bookTitle`/`bookAuthors`/`isbn13`/`coverUrl`) and validates
      `readerId`/`bookId`/`copyId` exist (D1, D3)
- [x] 5.3 `server/routes/reading-events.ts`: zod-validated CRUD on `/api/reading-events` + book→events and reader→events relationship reads; attribute to body `readerId`
      (D4); writes `requireAuth`
- [x] 5.4 Enforce book delete-integrity (block on copies/events, 409) in the book route;
      expose `readerHasEvents` guard for reader deletion (owned by #6) to consume (D3)
- [x] 5.5 `services/reading-events/service.integration.test.ts`: snapshot composition,
      missing-reference rejection, block-on-children delete

## 6. Indexes, wiring, and verification

- [x] 6.1 Add `firestore.indexes.json` with composite indexes for the relationship/
      ordered queries; reference it from `firebase.json` (D5)
- [x] 6.2 Mount the four routers in `server/index.ts` (`app.use("/api", ...)`)
- [x] 6.3 Run `npm run lint`, `npm test` (fast lane), and `npm run test:emulator`
      (integration lane) — all green
- [x] 6.4 Manual smoke check: create a book → copy → reading event via `/api` and read
      back the relationship endpoints
