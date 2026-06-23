## 1. Foundations (slug helper + emulator test lane)

- [ ] 1.1 Add `lib/text/slug.ts`: pure `slugify(input)` (lowercase, strip diacritics,
      collapse to kebab) and `arraySlugs(values)`; export types if useful (D2)
- [ ] 1.2 Add `lib/text/slug.test.ts` unit tests (node lane): diacritics, casing,
      collapsing, empty/edge inputs, determinism
- [ ] 1.3 Add `integration` project to `vitest.config.ts` (include
      `**/*.integration.test.ts`), excluded from the `node`/`jsdom` includes (D6)
- [ ] 1.4 Add `test:emulator` script to `package.json`:
      `firebase emulators:exec --only firestore 'vitest run --project integration'`
- [ ] 1.5 Add an integration test helper (point Admin SDK at `FIRESTORE_EMULATOR_HOST`,
      clear collections between tests) under a shared test-utils location

## 2. Shelves (CRUD-only, simplest)

- [ ] 2.1 `services/shelves/repository.ts`: `mapDoc`, list/get/create/update/delete
      against `shelves`, following the readers pattern
- [ ] 2.2 `server/routes/shelves.ts`: zod-validated list/get/create/update/delete on
      `/api/shelves`; reads public, writes `requireAuth` (D4)
- [ ] 2.3 `services/shelves/repository.integration.test.ts`: CRUD round-trip against emulator

## 3. Books (CRUD + derived slugs)

- [ ] 3.1 `services/books/repository.ts`: CRUD against `books`; on create/update compute
      `authorKeys`/`categoryKeys`/`titleKey` via `lib/text/slug` (D2)
- [ ] 3.2 `server/routes/books.ts`: zod-validated CRUD on `/api/books`; reads public,
      writes `requireAuth`
- [ ] 3.3 `services/books/repository.integration.test.ts`: CRUD + asserts slugs derived
      on create and recomputed on update

## 4. Copies (CRUD + parent validation + shelf desasociation)

- [ ] 4.1 `services/copies/repository.ts`: CRUD against `copies`; `listByBook(bookId)`;
      `unshelveByShelf(shelfId)` (batch-null `shelfId`)
- [ ] 4.2 Validate `bookId` exists (and `shelfId` if provided) on copy create; reject
      missing parent (D3)
- [ ] 4.3 `server/routes/copies.ts`: zod-validated CRUD on `/api/copies` + book→copies
      relationship read; writes `requireAuth`
- [ ] 4.4 Extend shelf delete to desasociate copies via `unshelveByShelf` (D3)
- [ ] 4.5 `services/copies/repository.integration.test.ts`: CRUD, missing-parent rejection,
      shelf-delete desasociation

## 5. Reading events (snapshot service + attribution + integrity)

- [ ] 5.1 `services/reading-events/repository.ts`: CRUD against `readingEvents`;
      `listByBook(bookId)`, `listByReader(readerId)`
- [ ] 5.2 `services/reading-events/service.ts`: create composes the book snapshot
      (`bookTitle`/`bookAuthors`/`isbn13`/`coverUrl`) and validates
      `readerId`/`bookId`/`copyId` exist (D1, D3)
- [ ] 5.3 `server/routes/reading-events.ts`: zod-validated CRUD on `/api/reading-events` + book→events and reader→events relationship reads; attribute to body `readerId`
      (D4); writes `requireAuth`
- [ ] 5.4 Enforce delete-integrity: block `book` delete with copies/events (409) and
      `reader` delete with events (409) via named errors → 409 in routes (D3)
- [ ] 5.5 `services/reading-events/service.integration.test.ts`: snapshot composition,
      missing-reference rejection, block-on-children delete

## 6. Indexes, wiring, and verification

- [ ] 6.1 Add `firestore.indexes.json` with composite indexes for the relationship/
      ordered queries; reference it from `firebase.json` (D5)
- [ ] 6.2 Mount the four routers in `server/index.ts` (`app.use("/api", ...)`)
- [ ] 6.3 Run `npm run lint`, `npm test` (fast lane), and `npm run test:emulator`
      (integration lane) — all green
- [ ] 6.4 Manual smoke check: create a book → copy → reading event via `/api` and read
      back the relationship endpoints
