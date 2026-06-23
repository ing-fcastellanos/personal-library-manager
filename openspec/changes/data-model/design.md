## Context

The domain split is fixed by ADR-0007 (Book / Copy / ReadingEvent + Reader / Shelf)
and the storage by ADR-0002 (Firestore, accessed server-side via the Admin SDK).
`readers` is already implemented and sets the house conventions:

- Top-level collection, **auto-id** documents (`collection().doc()`).
- Timestamps as **ISO-8601 strings** (`createdAt` / `updatedAt`).
- Absent values stored as **`null`** (explicit `mapDoc`), never `undefined`.
- **zod** schema + inferred type + `create`/`update` input schemas in `lib/types`.
- No unique constraints → uniqueness enforced by query / transaction.

This change turns the ADRs into a concrete Firestore schema and the shared types
that #12 will implement against. It writes **no** repositories, endpoints, indexes,
or rules — only the contract (`docs/data-model.md` + `lib/types/*`).

Target scale is a 2-reader household: hundreds to low-thousands of books. That scale
is the single biggest design lever — it lets "simple and derived" win over
"denormalized and maintained" almost everywhere.

## Goals / Non-Goals

**Goals:**
- A reviewed, concrete Firestore schema for `books`, `copies`, `readingEvents`,
  `shelves` (alongside `readers`), consistent with the `readers` conventions.
- Shared zod/TS types in `lib/types` that mirror `reader.ts`.
- A composite-index plan covering the known M2–M7 queries.
- Documented "reserved" shapes for future entities so they slot in without a repaint.

**Non-Goals:**
- Repositories, `/api` endpoints, runtime validation wiring → **#12**.
- Deployed `firestore.indexes.json` / security rules → **#12 / #42**.
- Author/category normalization logic and metadata fetching → **#13**.
- Dedup logic → **#16**. Full-text/external search index → out of scope (free tier).
- Implementing Series / Loan / Wishlist / AuditLog / ImportSession / goals.

## Decisions

### A. `Book` = edition-level, single entity (collapse Work/Edition/Copy → Book/Copy)
One `book` document represents a **canonical edition** (≈ one ISBN). We do **not**
model a separate Work level. To still group editions/translations of the same work
(for series #38 and "same work, different edition"), `book` carries an optional
`workKey` (a normalized slug) used only for soft grouping — no separate collection.

- *Why:* a 3-level Work→Edition→Copy hierarchy is overkill for 2 readers; it adds
  joins and ambiguity ("did you read the work or this edition?") with little payoff.
- *Alternative considered:* full Work/Edition split (Goodreads-style). Rejected as
  premature; `workKey` buys us 90% of the grouping value at ~0 cost.

### B. Key strategy: auto-id + indexed `isbn13` / `isbn10`
`book` docs use Firestore auto-ids (like `readers`); ISBNs live in indexed fields,
not the document key.

- *Why:* keying by ISBN would give free dedup but breaks for books without an ISBN
  (old/rare/local editions) and for multiple editions of one work. Dedup is a #16
  concern (ISBN exact + title/author fuzzy), not a key concern.
- *Alternative considered:* `books/{isbn13}`. Rejected — brittle for no-ISBN books.

### C. `ReadingEvent` snapshots book metadata; `copyId` optional
Each `readingEvent` stores `readerId` (required), `bookId` (required), `copyId`
(**optional**), `dateStarted?`, `dateFinished`, `rating?`, `review?`, plus a
**denormalized snapshot** of the book at the time of the event: `bookTitle`,
`bookAuthors`, `isbn13?`, `coverUrl?`.

- *Why snapshot:* Firestore has no joins. History (#26), recent-reads (#29), CSV
  export (#34) and the Goodreads link (#34) must not do a per-event `book` fetch.
- *Why `copyId` optional:* imports from Goodreads/StoryGraph (#35) and "read a book
  I don't physically own" have no `Copy`. The book read is what matters for stats.
- *Alternative considered:* store only references, join on read. Rejected at this
  scale for the read-heavy dashboard/export paths.

### D. "Read vs pending" is **derived**, not stored
A book is "read by reader X" iff ∃ `readingEvent(readerId = X, bookId = book,
status = finished)`. We do **not** denormalize a `readStatus` onto `copy`/`book`.
"Pending" is therefore per-reader-per-book and computed from events.

- *Why:* avoids a denormalized flag that must be kept consistent across two readers
  and re-reads. With `count()`/equality queries this is cheap at our scale.
- *Trade-off:* a "pending shelf" view runs a query per reader rather than reading a
  flag. Acceptable; revisitable if it ever feels slow.

### E. Dashboard aggregation via Firestore `count()` + server-side rollups
KPIs (totals, read vs pending, unique authors/publishers, per-reader counts) use
Firestore **aggregation `count()`** and small server-side scans; charts (#28) scan
the relevant collection and group in the server. **No counter documents / triggers.**

- *Why:* counters add write-time transactions and a whole consistency surface for a
  library that changes a few times a day. `count()` bills for index reads, not full
  document reads.
- *Trade-off:* very large libraries would eventually favor counters. Flagged as
  follow-up; ADR-0002 already notes watching dashboard read volume.

### F. Authors & categories: display arrays + normalized `*Keys`
`book.authors: string[]` and `book.categories: string[]` hold **display** strings;
`book.authorKeys: string[]` and `book.categoryKeys: string[]` hold **normalized
slugs** (lowercased, accent-stripped) for filtering/grouping and "unique authors".

- *Why:* Firestore `array-contains` filters one value and cannot group by array
  members; charts scan + group in the server, and "unique authors" needs a canonical
  key ("J.R.R. Tolkien" vs "Tolkien, J.R.R."). The slug is the join key.
- *Boundary:* the **slugging/normalization rules live in #13** (metadata). #5 only
  fixes the field shape; #12 may add a trivial slug helper, real normalization is #13.
- *Alternative considered:* authors as their own collection/entity. Rejected as
  heavier than the household needs; `workKey`/`authorKeys` slugs suffice.

### Collections & shapes (summary; full detail in `docs/data-model.md`)

```
readers (exists)
books         { id, title, subtitle?, authors[], authorKeys[], publisher?,
                publishedYear?, isbn13?, isbn10?, categories[], categoryKeys[],
                coverUrl?, pageCount?, language?, description?, workKey?, source?,
                createdAt, updatedAt }
copies        { id, bookId→books, shelfId?→shelves, condition?, acquiredAt?,
                notes?, createdAt, updatedAt }
readingEvents { id, readerId→readers, bookId→books, copyId?→copies,
                status('finished'|'reading'|'abandoned'), dateStarted?, dateFinished?,
                rating?(1–5), review?, bookTitle, bookAuthors[], isbn13?, coverUrl?,
                createdAt, updatedAt }
shelves       { id, name, location?, description?, createdAt, updatedAt }
```
All references are **id strings** to top-level collections (mirrors `readers`).

### Composite-index plan (documented now, deployed in #12)

```
readingEvents : (readerId ASC, dateFinished DESC)   history/recent per reader  #26 #29
readingEvents : (bookId   ASC, dateFinished DESC)   per-book history           #26
readingEvents : (readerId ASC, status, dateFinished DESC)  read/pending derive #27
copies        : (shelfId  ASC, createdAt DESC)       what's on a shelf          #18
copies        : (bookId   ASC)                        copies of a book           #16
books         : single-field on isbn13, isbn10, authorKeys[], categoryKeys[]    #16 #28
```
Search (#17): no substring/full-text in Firestore → filters + a lowercased
`titlePrefix`/`titleKey` field for prefix matches; an external index is out of scope.

### Reserved (documented, not modeled)
Series (#38) → `book.workKey` + future `series` doc; Loan (#39) → field/subcol on
`copy`; Wishlist (#37) → `book` without `copy` + per-reader wishlist marker;
AuditLog (#40) → `auditLog` collection (actor, entity, ts); ImportSession
(#22/#35) → `importSessions` collection; reading goals (#30) → subdoc on `reader`
or `readingGoals`. Shapes sketched in the doc so they slot in later.

## Risks / Trade-offs

- **Denormalized snapshot drift** (a book is edited after a reading event) →
  Mitigation: the snapshot is intentionally historical ("what it was when read");
  the live `bookId` reference is the source of truth when current data is needed.
- **Derived read/pending costs a query per reader** (Decision D) → Mitigation:
  equality + `count()` is cheap at household scale; revisit with counters only if
  measured slow.
- **No full-text search** (Decision F/search) → Mitigation: filters + title prefix
  cover the household need; an external index stays an explicit, deferred option.
- **`*Keys` normalization split across #5/#13** → Mitigation: #5 fixes the field
  contract; #13 owns the algorithm. Document the boundary so #12 doesn't invent one.
- **Contract churn** if #12 finds the shape impractical → Mitigation: types are zod
  schemas, cheap to evolve; this change ships no data, so there is no migration cost
  yet.

## Migration Plan

No data migration: no documents of these types exist yet and nothing imports the new
types. Deploying is purely additive (new doc + new files). Rollback = delete the new
files; nothing else references them until #12.

## Open Questions

- Exact `condition` enum for `copies` (e.g. new / good / worn) — deferred to #12/#15;
  modeled as an open string for now.
- Whether reading goals (#30) live as a `reader` subdoc or a `readingGoals`
  collection — reserved, decided when M5/#30 is built.
