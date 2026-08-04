## Context

The catalog already tracks what the household owns (`copies`), reads (`readingEvents`), lends (`loans`, #39), and wants (`wishlistItems`, #37). None of that says "this book is part of a saga, and here's what's missing from it." `docs/data-model.md`'s reserved-entities table sketched a shape for this back in #5 (`book.workKey` + a future `series` doc) but nothing ever populated `workKey` — grepping the codebase turns up zero writers of that field outside its own schema/type. Explored in `/opsx:explore 38`.

## Goals / Non-Goals

**Goals:**
- Track a saga as an ordered list of volumes, each either owned (`bookId` set) or missing (no `bookId`, just a snapshot).
- Surface it from three places without a dedicated series-detail route: the book detail (a "Serie" section), the catalog browse (a "Serie" badge), and a settings index (`/ajustes/series`) listing every tracked series with its completion.
- Let a missing volume convert straight into a wishlist item, closing the loop with #37.

**Non-Goals:**
- Auto-detecting series membership from title patterns or an external metadata source (Open Library/Google Books). Curation is manual, same trust model as a household member typing in a wishlist item.
- A dedicated "view/edit this one series" route or page — everything happens in one reusable dialog.
- Distinguishing "book exists in the catalog" from "a copy is on a shelf" for a volume's owned state (see Decision D3) — v1 keeps one boolean.
- Resurrecting or populating `book.workKey` — this change doesn't touch `lib/types/book.ts` at all.

## Decisions

### D1. `series` is its own top-level collection; `book` is untouched
A `series` document owns an ordered array of volumes; a book has no reference back to any series. Membership is discovered by scanning the (small, household-scale) `series` collection in memory for a volume whose `bookId` matches — the same "load everything, derive in memory" approach `services/catalog`, `services/wishlist`, and `services/loans` already use, so no new Firestore index and no denormalized field on `book`.
- *Why not put `seriesId`/`position` on `book`?* That's the model the original reserved-entities table implied (`book.workKey` doubling as the link), but it assumes one book belongs to at most one series and forces every book write path to know about series. A book appearing in two series (an omnibus, a crossover) falls out for free with the collection-owns-the-link direction; it costs nothing extra.
- *Why not resurrect `workKey`?* `workKey` groups **editions of the same volume** (hardcover vs. paperback of book 2); a series orders **distinct volumes**. They're orthogonal groupings that happen to share a doc comment. Conflating them would mean a volume's identity is a slug derived from title/author instead of an explicit `bookId`, which is strictly weaker for matching and adds a normalization step this doesn't need.

### D2. Each volume carries a full snapshot, not just a title
```
series: {
  id, name, createdAt, updatedAt,
  volumes: [
    { position: number, title, authors: string[], isbn13?, coverUrl?, bookId: string | null }
  ]
}
```
Same snapshot shape `wishlistItems`/`loans` already denormalize (title/authors/cover/ISBN) so a missing volume renders a real-looking card — and hands `AddToWishlistButton` a ready-made `WishSnapshot` with no extra lookup. `position` is a plain integer or float re-ordering is possible without rewriting siblings.

### D3. Volume state: "Tenés" iff `bookId` is set — no copy/read distinction in v1
A volume reads as owned purely from `bookId != null`; it does not check for a `copy` or a finished `readingEvent`. This mirrors how `wishlistItems`' "en casa" badge already works (book exists → treated as owned) rather than the stricter check `loans`/`copies` use elsewhere.
- *Why:* keeps the first cut simple and matches the existing wishlist precedent instead of introducing a third state pattern in the same session. A `book` with no `copy` is already a possible-but-rare state elsewhere in the app (e.g. a wishlist item marked read without ever being acquired).
- *Revisit if:* it turns out books get added to a series without ever getting a copy often enough to be confusing — then add a `copies`-derived "en biblioteca, sin ejemplar" badge, the same way `loans` distinguishes "prestado" from "vencido".

### D4. Two dialogs (view/edit, and link-a-book), no series-detail route
`components/series/series-dialog.tsx` renders an existing series' full volume list (status per
volume, "Agregar a deseos" per missing one) and, in an edit sub-view, lets a reader rename the
series and add/reorder/remove volumes. It opens from:
1. The book detail's "Serie" section, when the book already has one (pre-scoped to it).
2. `/ajustes/series`'s list (one row per series; opens the dialog for that row).

A second, small dialog — `components/series/link-series-dialog.tsx` — handles the "this book isn't
part of any series yet" case from the book detail: pick "nueva serie" or an existing one (a plain
button list, the same shape wishlist's `ShelfSheet` uses), then confirm the volume's position. This
is deliberately a separate flow from `series-dialog.tsx` rather than a create-mode of the same
component: it needs to reconcile the linked book against a possibly-already-existing placeholder
volume at that position (see `reconcileVolumes` in `components/series/link.ts`), which the
rename/reorder/remove edit surface doesn't need to know about.

*Revised during apply:* the catalog browse's "Serie" badge turned out to not fit as a third entry
point — nesting a clickable open-dialog control inside the result's own `<Link>` is an invalid
(and inaccessible) nested-interactive-element pattern. The badge stays informational only, exactly
like the existing "prestado" indicator; viewing/editing a series always starts from the book detail
or `/ajustes/series`. Specs updated to match.

`/ajustes/series` itself is a thin list page — same shape as the existing `/ajustes/qr` settings sub-page (a `Card` + `Link` on `/ajustes`, not a bottom-nav entry) — that fetches `/api/series` and renders name + "N de M tomos" per row.

### D5. API surface mirrors `loans`/`wishlistItems`
`server/routes/series.ts`: public `GET /series`, `GET /series/:id`; `requireAuth` on `POST /series` (create), `PATCH /series/:id` (rename, reorder/add/remove/link volumes — a single whole-array replace, since the household-scale volume count per series is small and a dialog always has the full list in hand), `DELETE /series/:id`. No per-volume sub-resource; the volumes array is replaced wholesale on every edit, same simplicity trade-off `wishlistItems`' snapshot fields already make.

## Risks / Trade-offs

- **[Risk]** Manual curation drifts — a household member forgets to link a newly-acquired book to its waiting volume slot. → **Mitigation:** accepted; same trust model as wishlist/loans, no reconciliation job planned. The catalog "Serie" badge and `/ajustes/series` completion count make a stale "Falta" visible enough to notice.
- **[Trade-off]** Whole-array `PATCH` for volumes is simpler than a volumes sub-collection but means two concurrent editors of the same series can clobber each other. → Accepted: two-reader household, same accepted risk as every other collection here (no optimistic-concurrency handling exists anywhere in this codebase yet).
- **[Risk]** A book can end up unreachable from any series if its `bookId` was linked and the book is later deleted. → **Mitigation:** none needed at delete time (unlike `loans`, a dangling volume `bookId` just degrades that volume back to looking like a snapshot-only "missing" entry — no integrity guard required, and no data is lost since the snapshot is already independent of the live book).

## Migration Plan

Purely additive: a new collection, routes, and UI; no existing document shape changes. An empty `series` collection is a valid initial state (no badges, no `/ajustes/series` rows, book detail's "Serie" section simply doesn't render). `docs/data-model.md` moves Series from reserved to implemented, replacing the original `book.workKey`-based sketch with this design. Normal PR revert is sufficient rollback.
