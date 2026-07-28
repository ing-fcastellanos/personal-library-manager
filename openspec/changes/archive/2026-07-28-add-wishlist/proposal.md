## Why

The app tracks what the household **owns** (`copies`) and what each reader **has read** (`readingEvents`), but there is nowhere to record what a reader **wants** — neither "the book I want to read next" nor "the book we should buy". Today those live outside the app (a note, a browser tab, memory), so they are lost and never reconciled against the shelf: a reader can buy a book the household already owns, or forget a wish entirely (#37).

## What Changes

- New `wishlistItems` Firestore collection: a per-reader record of a wanted book, carrying a denormalized book snapshot and an **optional** `bookId`, so a wish never requires creating a `Book` for something the household does not own.
- Four ways to add a wish, reusing the existing intake entry points: manual, by ISBN/barcode, by photo/AI, and from a catalogued book's detail page. **No `Copy` is created.**
- Duplicate awareness on add: reuse `findBookDuplicates` (#16) to warn when the wanted book already exists in the catalog and how many copies the household holds.
- Two screens over one truth:
  - `/deseos` — **"quiero leer"**, scoped to the active reader.
  - `/comprar` — **"quiero comprar"**, scoped to the household: the union of every reader's wanted items that the household does **not** own yet, grouped per book and showing who wants it.
- Both lists self-maintain, with no manual tick-off: an item leaves `/comprar` when a `Copy` for it exists, and leaves `/deseos` when a finished `ReadingEvent` for that reader and book exists. Both are **derived**, consistent with data-model Decision D.
- Acquiring a wish reuses `intakeBook` (#14): create the `Book` (if the item has no `bookId`) plus the owned `Copy`, then backfill the item's `bookId`.
- The full JSON backup (#36) starts including `wishlistItems`.

## Capabilities

### New Capabilities

- `wishlist`: recording, prioritizing and browsing the books a reader wants — as a per-reader "want to read" list and a household "want to buy" list — and converting a wish into an owned library book on acquisition.

### Modified Capabilities

- `json-backup`: the backup file must include the new `wishlistItems` collection; the current requirement enumerates only books, copies, reading events, readers and shelves, so a wishlist would be silently missing from every backup.
- `catalog-api`: referential integrity extends to the new collection — creating an item validates `readerId` (and `bookId` when present); deleting a `book` desasociates referencing items instead of blocking; a `readerHasWishlistItems` guard protects reader deletion.
- `data-model`: `docs/data-model.md` must document `wishlistItems` as an implemented collection with its index plan, and drop Wishlist from the reserved-entities table — where it is currently sketched with a **different** shape ("`book` sin `copy` + marcador de wishlist por lector") that this change deliberately supersedes (see design D1).

## Impact

- **New code:** `lib/types/wishlist-item.ts`; `services/wishlist/{repository,service}.ts`; `server/routes/wishlist.ts` (registered in `server/index.ts`); `app/deseos/page.tsx` and `app/comprar/page.tsx` plus their components; a nav entry.
- **Existing code touched (small):** `components/settings/backup.ts` (add the collection — it enumerates endpoints by hand, so omitting it produces a silently incomplete backup); `server/routes/books.ts` delete path (desasociate wishlist items); the readers delete guard.
- **Reused as-is, not modified:** `services/intake/service.ts` (acquisition), `services/duplicates/service.ts` (dedup on add — it already accepts loose metadata and returns the existing-copy count), `lib/text/similarity.ts` + `lib/text/slug.ts` (match keys — the wishlist becomes their third consumer, after enrichment ranking #13 and the duplicate matcher #16).
- **New Firestore indexes** for `wishlistItems` (see design).
- **No change** to `books`, `copies`, `readingEvents` or `shelves` document shapes, and **no change** to catalog browse/search behavior — isolating the feature in its own collection is precisely what keeps the catalog untouched (design D1).
- **Out of scope:** sharing or gifting a wishlist outside the household; price tracking or store links; a "borrowed, not bought" acquisition path (the reader confirmed the "want to read but not buy" case does not exist — see design D3).
