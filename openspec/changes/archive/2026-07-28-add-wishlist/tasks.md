## 1. Type

- [x] 1.1 Create `lib/types/wishlist-item.ts` following `lib/types/reader.ts` conventions: `wishlistItemSchema` with `readerId` (required), `bookId` (optional, design D2), `status` `"wanted" | "dismissed"` (D9), `priority` `"high" | "normal" | "low"` defaulting to `"normal"` (D8), `addedVia` `"manual" | "isbn" | "ai" | "catalog"` (D7), snapshot `bookTitle`/`bookAuthors`/`isbn13`/`coverUrl`, match keys `titleKey`/`authorKeys` (D6), ISO timestamps. Plus `wishlistItemCreateSchema` (server manages id/timestamps/match keys) and `wishlistItemUpdateSchema`.
- [x] 1.2 Unit tests in the emulator-free lane: valid item accepted; empty `readerId` rejected; item with no `bookId` accepted; `priority` defaults to `normal`; no acquired/read field exists on the schema.

## 2. Repository

- [x] 2.1 Create `services/wishlist/repository.ts` mirroring `services/reading-events/repository.ts`: `COLLECTION = "wishlistItems"`, explicit `mapDoc` with `?? null` for every optional, `listWishlistItems`, `getWishlistItem`, `createWishlistItem` (pure write), `updateWishlistItem`, `deleteWishlistItem`.
- [x] 2.2 Relationship reads: `listWishlistItemsByReader(readerId)`, `listWishlistItemsByBook(bookId)`.
- [x] 2.3 Integrity guards mirroring `readerHasEvents`/`bookHasEvents`: `readerHasWishlistItems(readerId)` and `unlinkWishlistItemsByBook(bookId)` (nulls `bookId` on each referencing item, design D10).
- [x] 2.4 Emulator-backed integration tests for the CRUD, both relationship reads, and both integrity helpers.

## 3. Matching (pure)

- [x] 3.1 Create `services/wishlist/match.ts` consuming `lib/text/slug` and `lib/text/similarity` **directly** — not `services/duplicates/matcher.ts`, whose `classifyMatch` expects a `Book` on the right-hand side (design D5). Expose a single `sameBook(a, b)` cascade: `bookId` → `isbn13` → equal `titleKey` **with** the `sharedAuthorKeys` guard that rejects same-title/disjoint-author pairs.
- [x] 3.2 Expose `groupWishlistItems(items)` built on `sameBook`, returning one entry per distinct book with the list of readers wanting it (for the household buy list).
- [x] 3.3 Unit tests: same `bookId` matches; same ISBN-13 with differing titles matches; equal `titleKey` with a shared author matches; equal `titleKey` with disjoint authors does **not** match; grouping merges two readers' items for the same book and keeps genuinely different same-titled books apart.

## 4. Service

- [x] 4.1 Create `services/wishlist/service.ts`. `createWishlistItem(input)`: validate `readerId` exists and `bookId` exists when supplied, throwing the same `ReferenceNotFoundError` shape `services/reading-events/service.ts` uses; derive `titleKey`/`authorKeys` server-side with `slugify`/`arraySlugs` (D6); insert via the repository.
- [x] 4.2 `checkAlreadyOwned(candidate)`: thin wrapper over the existing `findBookDuplicates` (#16) — it already takes loose metadata and attaches the existing-copy count, so reuse it as-is and do not modify it.
- [x] 4.3 `acquireWishlistItem(id, copyInput)` (design D12): if the item has a `bookId`, `createCopy({ bookId, ...copyInput })`; otherwise call `intakeBook({ book: <snapshot>, copy: copyInput })` and backfill the item's `bookId`. The item is **not** deleted.
- [x] 4.4 Emulator-backed integration tests: create validates references; acquiring an item with no `bookId` creates exactly one book and one copy and backfills the link; acquiring an already-linked item creates a copy and no second book; acquiring leaves the item present.

## 5. Derived views (pure)

- [x] 5.1 Create `services/wishlist/views.ts`. `wantToReadFor(readerId, items, events)`: the reader's `wanted` items minus any whose book has a finished `ReadingEvent` for that reader, matching via `sameBook` so items with a null `bookId` still resolve (design D4/D5).
- [x] 5.2 `wantToBuy(items, copies)`: every reader's `wanted` items whose book has no copy, grouped via `groupWishlistItems`, ordered by priority then recency (design D3/D13).
- [x] 5.3 Unit tests: a finished reading removes the item from the reader's list; a finished reading by the *other* reader does not; an item with a null `bookId` is still matched by ISBN and by title+author; a book with a copy is absent from the buy list; `dismissed` items appear in neither view.
- [x] 5.4 Settle the open question from design.md — whether `abandoned` (and `reading`) also removes an item from the want-to-read list — and encode the decision in `wantToReadFor` with a test that documents it.

## 6. API

- [x] 6.1 Create `server/routes/wishlist.ts` mirroring `server/routes/reading-events.ts`: public `GET /wishlist-items`, `GET /readers/:readerId/wishlist-items`, `GET /wishlist-items/:id`; `requireAuth` on `POST /wishlist-items`, `PATCH /wishlist-items/:id`, `DELETE /wishlist-items/:id`, and `POST /wishlist-items/:id/acquire`. Map `ReferenceNotFoundError` to `400`.
- [x] 6.2 Register the router in `server/index.ts` alongside the existing routers.
- [x] 6.3 Route tests: reads work unauthenticated; writes rejected without a session; unknown `readerId` yields `400`; acquire returns the created book/copy.

## 7. Integrity and backup wiring

- [x] 7.1 Wire `unlinkWishlistItemsByBook` into the book delete path so deleting a book referenced only by wishlist items succeeds and unlinks them, instead of blocking (design D10) — and confirm a book with copies or reading events still returns `409`.
- [x] 7.2 Wire `readerHasWishlistItems` into the reader delete guard, alongside the existing `readerHasEvents`.
- [x] 7.3 Add `wishlistItems` to `components/settings/backup.ts` (`Backup` interface, the `Promise.all` over `/api/wishlist-items`, and the returned object). This file enumerates collections by hand, so omitting it produces a silently incomplete backup.
- [x] 7.4 Extend the backup unit test to assert the `wishlistItems` key is present and populated.
- [x] 7.5 Declare the needed composite index in `firestore.indexes.json`: `wishlistItems (readerId ASC, createdAt DESC)` for `listWishlistItemsByReader`. Reconciled from the original three-index plan — status/ownership are filtered **in memory** in the derived views (like the catalog), so the status-composites would never be exercised; single-field `bookId`/`status` reads use automatic indexes (design updated to match).

## 8. Add-a-wish entry points

- [x] 8.1 Shared "add to wishlist" flow that takes resolved book metadata, runs `checkAlreadyOwned` first and surfaces the owned-copy warning without blocking, then creates the item with the right `addedVia`.
- [x] 8.2 Wire the four entry points: manual, ISBN/barcode, photo/AI, and an action on the catalogued book detail page (which supplies `bookId` directly, `addedVia: "catalog"`). _Shared helpers in `components/wishlist/add.ts` (`createWishItem` + `checkOwned`) and a reusable `components/wishlist/add-to-wishlist-button.tsx` (owned-warning built in). Wired: **manual** (`add-wish-dialog.tsx` on `/deseos`), **catalog** (`components/catalog/book-detail.tsx`, `bookId` + known copy count), **ISBN** (`components/books/add-book-by-code.tsx` confirm sheet), **photo/AI** (`components/books/add-book-by-photo.tsx` action bar)._
- [x] 8.3 Tests: each entry point records the correct `addedVia`; the owned-book warning appears with the copy count and the reader can proceed anyway. _`components/wishlist/add.test.ts` (helpers) + `components/wishlist/add-to-wishlist-button.test.tsx` (addedVia recorded per entry point; owned-warning with copy count → «Agregar igual» proceeds; duplicate pre-check runs when ownership unknown)._

## 9. UI

- [x] 9.1 `app/deseos/page.tsx` — reader-scoped "quiero leer" list: priority ordering, priority control, dismiss action, an "en casa" badge when the household already owns it, and an empty state.
- [x] 9.2 `app/comprar/page.tsx` — household "quiero comprar" list: grouped entries showing which readers want each book, priority ordering, an "already acquired" action that runs `acquire`, and an empty state.
- [x] 9.3 Nav entries for both routes, consistent with the existing `/libros`, `/leido`, `/catalogo`, `/ajustes` entries.
- [x] 9.4 Component tests: `/deseos` shows only the active reader's items and hides one whose book the reader has finished; `/comprar` shows one grouped entry for a book both readers want and drops a book once a copy exists.

## 10. Docs

- [x] 10.1 Update `docs/data-model.md`: add the `wishlistItems` collection (fields, relationships, index plan), remove Wishlist from the reserved-entities table, and record why the implemented shape supersedes the one originally reserved — the catalog reads every book unfiltered, so a `book`-without-`copy` wish would surface in browse/search/facets (design D1).

## 11. Verify

- [x] 11.1 Run `npm test` (jsdom + node lanes) green; typecheck + lint clean.
- [x] 11.2 Exercise the loop end to end against the emulator: add a wish by ISBN → it appears in `/deseos` and `/comprar` → acquire it → it disappears from `/comprar` and the book plus copy exist → mark it read → it disappears from `/deseos` and the item document still exists.
- [x] 11.3 Download a backup and confirm the `wishlistItems` array is present and complete.

## 12. Claude Design handoff (#37)

- [x] 12.1 Generate the specific Claude Design prompt for the two wishlist screens: empty and populated states, the grouped multi-reader entry on `/comprar`, priority affordance, the "already owned" warning on add, responsive mobile-first, accessibility, and M0 design tokens.
- [x] 12.2 Produce the design in Claude Design and validate it against the base design system.
- [x] 12.3 Integrate the handoff: map the markup/code to Next components + tokens/styles.
- [ ] 12.4 QA: responsive visual pass + accessibility pass on both screens.
