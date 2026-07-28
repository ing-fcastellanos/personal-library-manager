## Context

#37 asks for a wishlist of books the household does not own yet, addable manually / by ISBN / by photo-AI **without creating a `Copy`**, convertible into a library book on acquisition, and scoped per reader.

`docs/data-model.md` already reserved a shape for this: *"`book` sin `copy` + marcador de wishlist por lector"*. Exploration surfaced a fact that invalidates it: `services/catalog/service.ts` loads **all** books via `listBooks()` and `services/catalog/join.ts` maps over every one of them — there is no ownership filter anywhere in browse, search or facets. Book-without-copy is already a legal state (data-model Decision C, for imported readings of unowned books), so wishlist books stored that way would appear in the catalog alongside owned ones, and suppressing them would mean threading an ownership filter through catalog, search, facets and the dashboard KPIs.

This design therefore supersedes the reserved shape. The rest follows from three conventions the repo already committed to: derived state over denormalized flags (Decision D), denormalized snapshots so Firestore never needs a join (Decision C), and in-memory joins at household scale (`services/catalog`).

## Goals / Non-Goals

**Goals:**

- Record a wish without touching `books` or `copies`, and without creating a `Copy`.
- Two lists — per-reader "want to read", household "want to buy" — that require no manual tick-off.
- Reuse the existing intake, duplicate-detection and text-similarity machinery rather than growing parallel implementations.
- Leave catalog browse/search behavior exactly as it is.

**Non-Goals:**

- Sharing or publishing a wishlist outside the household.
- Price tracking, store links, or purchase automation.
- A "borrowed / library loan" acquisition path — see D3; physical lending is #39.
- Turning the wishlist into a general "to read" queue over already-owned books. An owned unread book is already derivable ("pendiente" = no finished event) and is not materialized here; a wish for an owned book is legal (D3) but arrives through the wishlist, not automatically.

## Decisions

**D1 — A separate `wishlistItems` collection, superseding the shape reserved in `docs/data-model.md`.**
The reserved alternative (a `book` with no `copy` plus a per-reader marker) is rejected because the catalog does not filter by ownership (`services/catalog/service.ts:31`, `join.ts:37`): wished-for books would surface in browse, search, facets and KPIs, and hiding them would require an ownership predicate in every one of those places. A dedicated collection isolates the feature completely — no existing read path changes. It is also isomorphic to `readingEvents` (top-level collection, required `readerId`, optional entity reference, denormalized snapshot), so it inherits an established pattern rather than inventing one. Cost: one more collection to back up and to guard on delete; both are handled below.

**D2 — `bookId` is optional; the item always carries a book snapshot.**
Directly parallel to data-model Decision C, which made `ReadingEvent.copyId` optional because imported or unowned readings have no `Copy`. Here: a wish may predate any catalogued edition, and forcing a `Book` at add time would recreate exactly the catalog pollution D1 avoids. The snapshot (`bookTitle`, `bookAuthors`, `isbn13`, `coverUrl`) keeps both lists renderable with zero joins. `bookId` is filled in when the item is linked to an existing catalog book (added from a book detail, or matched by dedup) or on acquisition.

**D3 — No `intent` field: "want to read" and "want to buy" are two views over one truth.**
Considered storing `intent: "read" | "buy" | "both"`. Rejected: an enum is only justified if "want to read but **not** buy" exists — i.e. the reader intends to borrow it. Confirmed with the reader that this case does not occur in this household, which makes wanting an unowned book equivalent to wanting to buy it. So:

```
wishlistItems (status = wanted)                  ← one stored truth: "I want this"
   ├─ /deseos   items(readerId) ∧ ∄ readingEvent(readerId, bookId, finished)
   └─ /comprar  ∪ items ∧ ∄ copy(bookId)
```

The distinction the issue asks for is fully preserved, in the query rather than in a column. The payoff is that **neither list needs manual maintenance**: registering the purchase (intake, which creates the `Copy`) removes it from `/comprar`, and logging the reading removes it from `/deseos`. A stored flag would drift out of sync with both. Consistent with Decision D, which already refused a denormalized read flag for the same reason.

**D4 — Leaving the "want to read" list is derived from `readingEvents`, not stored.**
An item disappears from `/deseos` when a finished `ReadingEvent` exists for that reader and book. Nothing is written to the item — its `status` stays `wanted`, so the row remains available for a "deseos cumplidos" view later without a schema change. See Open Questions for `abandoned` / `reading`.

**D5 — One matching primitive, three uses: `bookId` → `isbn13` → `titleKey` + `authorKeys`.**
The three places this change needs to answer "are these the same book?" are dedup on add, grouping the household buy list, and D4's derivation for items with no `bookId`. All three resolve with the same cascade, built on `lib/text/similarity.ts` — whose docstring already declares it the single shared definition, consumed by enrichment ranking (#13) and the duplicate matcher (#16). The wishlist becomes its third consumer.
`services/duplicates/matcher.ts:52` is **not** reused directly for item↔item comparison: `classifyMatch(candidate, book: Book)` expects a `Book` on the right-hand side. Consuming `lib/text/similarity` directly avoids reshaping items into pseudo-books and requires **no change to existing matcher code**. `findBookDuplicates` *is* reused as-is for dedup on add, since it already takes loose metadata (no `bookId`) and already attaches the existing-copy count.

**D6 — The item persists `titleKey` and `authorKeys` — a deliberate deviation from the `readingEvents` snapshot.**
`readingEvents` stores only display fields because it always has a `bookId` to fall back on. A wishlist item may not (D2), so it must carry its own match keys to be groupable and matchable. Derived server-side at create with `slugify`/`arraySlugs`, exactly as the server derives a book's `*Keys` on write (data-model Decision F).

**D7 — `addedVia`, not `source`.**
`book.source` already means *metadata provenance* (`google-books | open-library | manual | ai`). The wishlist needs *entry point* (`manual | isbn | ai | catalog`) — a different concept that would sit next to `book.source` in the same backup JSON under the same name. Renamed to remove the ambiguity.

**D8 — `priority` is a 3-value enum (`high | normal | low`), not an integer.**
`ReadingEvent.rating` uses `1–5` because it mirrors an external standard (Goodreads). Priority has no such standard, and 3 buckets sort and render without inventing meaning for a middle number.

**D9 — `status` has exactly two values: `wanted | dismissed`.**
"Acquired" and "read" are derived (D3/D4), so storing them would create two sources of truth. `dismissed` covers the only transition that cannot be derived: the reader no longer wants the book, without having read or bought it.

**D10 — Referential integrity: desasociate on book delete, guard on reader delete.**
Deleting a `book` with wishlist items **nulls their `bookId`** rather than blocking with `409` — the item keeps its snapshot and stays a perfectly valid wish, exactly like `shelf` deletion unshelving its copies rather than blocking (`catalog-api`, "Referential integrity on delete"). Deleting a `reader` is different: a wish with no owner is meaningless, so a `readerHasWishlistItems` guard mirrors the existing `readerHasEvents` so reader deletion refuses rather than orphans.

**D11 — Uniqueness enforced in memory, not by query.**
Firestore has no unique constraints and the repo's convention is "unicidad por query/transacción". At household scale, both screens already load the full item set to render; the duplicate check reuses that same in-memory set via D5's cascade — the same trade-off `services/catalog` already makes for its cross-collection join.

**D12 — Acquisition reuses `intakeBook`; the item survives it.**
`POST /api/wishlist-items/:id/acquire` → if the item has a `bookId`, `createCopy({ bookId })`; otherwise `intakeBook({ book: <snapshot>, copy })`, which also handles cover re-hosting, then backfill `bookId`. The item is **not** deleted: it leaves `/comprar` automatically (D3) but legitimately remains a "want to read" until read (D4). This is what "convert a wishlist item into a library book" means here — the conversion produces the `Copy`, it does not consume the wish.

**D13 — Two routes: `/deseos` (reader-scoped) and `/comprar` (household-scoped).**
Spanish paths, consistent with `/libros`, `/leido`, `/agregar`, `/catalogo`, `/ajustes`. `/comprar` groups items by matched book (D5) so a title wanted by both readers appears once, showing who wants it, and sorts by priority — which is the whole reason `readerId` stays required on an item even though the list is household-wide.

**Resulting shape** (`lib/types/wishlist-item.ts`, following `lib/types/reader.ts` conventions):

```ts
{
  id, readerId,                 // required → readers
  bookId,                       // OPTIONAL → books (D2)
  status:   z.enum(["wanted", "dismissed"]),           // D9
  priority: z.enum(["high", "normal", "low"]).default("normal"),  // D8
  addedVia: z.enum(["manual", "isbn", "ai", "catalog"]),          // D7
  bookTitle, bookAuthors, isbn13, coverUrl,            // snapshot (D2)
  titleKey, authorKeys,                                // match keys (D6)
  createdAt, updatedAt
}
```

**Index plan** (same format as the existing plan in `docs/data-model.md`):

```
wishlistItems : (readerId ASC, createdAt DESC)   per-reader list read (listWishlistItemsByReader)  #37
```

Only one composite index is required, because status and ownership are filtered in
memory in the derived views (D3/D4), not by Firestore queries — the same in-memory
approach `services/catalog` takes. `bookId`- and `readerId`-equality reads
(`listWishlistItemsByBook`, `readerHasWishlistItems`, `unlinkWishlistItemsByBook`) and
the unfiltered `listWishlistItems` ordered read use Firestore's automatic single-field
indexes and need no composite declaration. Earlier drafts planned
`(readerId, status, createdAt)` and `(status, createdAt)` composites; they were dropped
once the views settled on in-memory status derivation, so no query would ever exercise
them.

## Risks / Trade-offs

- **[Risk]** Grouping by `titleKey` in `/comprar` could merge two genuinely different books sharing a title. → **Mitigation:** the cascade prefers `bookId`, then `isbn13`, and only falls back to `titleKey` **with** the author check `lib/text/similarity.sharedAuthorKeys` already implements — the duplicate matcher uses the same rule to reject same-title/disjoint-author pairs.
- **[Risk]** Derived disappearance (D4) can read as data loss: the reader logs a reading and the wish silently vanishes. → **Mitigation:** nothing is deleted (D4 stores no state), so a "deseos cumplidos" view is a query away; surface a toast on the mark-as-read path if it proves confusing in use.
- **[Risk]** `components/settings/backup.ts` enumerates collections by hand, so forgetting the new one yields a backup that is silently incomplete — the worst failure mode for a backup. → **Mitigation:** it is both a spec requirement (`json-backup` delta) and an explicit task, with a test asserting the key is present.
- **[Trade-off]** One more collection to guard, back up and index (D1) in exchange for zero changes to catalog read paths. Accepted: the alternative spreads an ownership predicate across four read surfaces that are currently filter-free.
- **[Trade-off]** In-memory duplicate checking (D11) is O(items) per add. Irrelevant at a two-reader household's scale; revisit only if the item count ever approaches the catalog's.

## Migration Plan

Purely additive: a new collection, new routes, new screens. No existing document shape changes and no backfill is required — an empty `wishlistItems` collection is a valid initial state, and every derived list renders empty. `docs/data-model.md` is updated in the same change (moving Wishlist from reserved to implemented). Normal PR revert is sufficient rollback; a reverted deploy leaves orphaned `wishlistItems` documents that nothing reads.

## Open Questions

- **Does `abandoned` (or `reading`) also remove an item from `/deseos`?** — **Settled during implementation.** `finished` **and** `abandoned` both resolve a wish and drop it from the want-to-read list (both are terminal for "want to read"); `reading` keeps the item visible (active progress, a UI may highlight it). Encoded as `RESOLVED_STATUSES` in `services/wishlist/views.ts` with a test that documents it. No stored data was affected, as anticipated.
