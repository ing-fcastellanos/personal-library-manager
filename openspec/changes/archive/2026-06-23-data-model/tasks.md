## 1. Schema document

- [x] 1.1 Add `docs/data-model.md`: overview, the `books`/`copies`/`readingEvents`/`shelves` collections (alongside `readers`), and an ER-style diagram of the id-string references
- [x] 1.2 Document the accepted decisions (A–F): Book = edition-level + `workKey`; auto-id + indexed ISBN; ReadingEvent snapshot + optional `copyId`; derived read/pending; `count()` aggregation; authors/categories display arrays + normalized `*Keys`
- [x] 1.3 Document the composite-index plan and the search limitation (filters + lowercased title prefix; external full-text out of scope)
- [x] 1.4 Document the reserved (not-modeled) entities: Series, Loan, Wishlist, AuditLog, ImportSession, reading goals — and where each slots in

## 2. Shared types (mirror `lib/types/reader.ts`)

- [x] 2.1 Add `lib/types/book.ts`: `bookSchema` (title required; `authors`/`authorKeys`/`categories`/`categoryKeys` arrays; optional `isbn13`/`isbn10`/`workKey`/cover/etc.; ISO timestamps), `Book` type, `bookCreateSchema`/`bookUpdateSchema`
- [x] 2.2 Add `lib/types/copy.ts`: `copySchema` (`bookId` required, `shelfId?`, `condition?`, `acquiredAt?`, `notes?`, ISO timestamps), `Copy` type, create/update schemas
- [x] 2.3 Add `lib/types/reading-event.ts`: `readingEventSchema` (`readerId`+`bookId` required, `copyId?`, `status`, `dateStarted?`/`dateFinished?`, `rating?` 1–5, `review?`, snapshot `bookTitle`/`bookAuthors`/`isbn13?`/`coverUrl?`, ISO timestamps), type, create/update schemas
- [x] 2.4 Add `lib/types/shelf.ts`: `shelfSchema` (`name` required, `location?`, `description?`, ISO timestamps), `Shelf` type, create/update schemas
- [x] 2.5 Confirm no denormalized per-reader `readStatus`/`read` field exists on `Book`/`Copy` (read state lives only in `readingEvents`)

## 3. Verification

- [x] 3.1 `npm run typecheck` passes with the new types
- [x] 3.2 Quick scratch parse check: valid Book/Copy/ReadingEvent/Shelf validate; missing `title`/`bookId`/`readerId`+`bookId`/`name` are rejected; Copy without `shelfId` and ReadingEvent without `copyId` validate
- [x] 3.3 `openspec validate data-model` passes
