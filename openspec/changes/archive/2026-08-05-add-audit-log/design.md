## Context

Two readers edit the same household library. #15 built a minimal, deliberately unfinished audit trail as a byproduct of the book-edit work: `services/audit/repository.ts` (`recordChange`) and `services/audit/diff.ts` (`changedFields`, a real before/after comparison, not just "which keys were sent"), wired into `PATCH /books/:id`, `PATCH /copies/:id`, and `POST /books/:id/cover`. `docs/data-model.md` was never updated to reflect that `auditLog` already exists — it still lists AuditLog as reserved. This change finishes the feature: full CRUD coverage, `readingEvent` support, a label snapshot, and the read side that was explicitly deferred ("no query UI here").

## Goals / Non-Goals

**Goals:**
- Every create/update/delete of a `book`, `copy`, or `readingEvent` is logged with actor, timestamp, and (for updates) which fields changed.
- A log entry stays legible after its entity is deleted.
- A global feed and a per-book view, reusing the same read API.

**Non-Goals:**
- Reverting a change from the log (the issue marks this explicitly optional; it needs before/after value snapshots, not just field names — a materially bigger feature, left for later).
- Auditing `loans`/`wishlistItems`/`series` writes — the issue scopes to "libro, ejemplar, lectura"; the pattern established here extends cleanly to them later if wanted.
- Storing old/new field *values* — only field *names* change, matching what `services/audit/diff.ts` already computes. Showing "shelf: A → B" instead of "shelf changed" is a possible future enhancement, not required by the issue's acceptance criteria.

## Decisions

### D1. Extend the existing shape in place; don't introduce a parallel one
`recordChange`/`ChangeRecord` already exist and are already called from three routes. Rather than adding a new writer, extend the record:
- `entity` → `entityType`, widened to `"book" | "copy" | "readingEvent"`.
- Add `action: "create" | "update" | "delete"`.
- Add `entityLabel: string` — a title/description snapshot (book title, or `"<bookTitle> · ejemplar"`, or `"<bookTitle> · lectura de <readerName>"` for a reading event) so an entry survives its entity's deletion, the same denormalization every other feature this session has used (`loans`, `wishlistItems`, `series`).
- Formalize as a zod schema in `lib/types/audit-log.ts` (this codebase's standard for shared types), matching the existing collection name (`auditLog`) and field names where they're already correct (`readerId`, `changedFields`) to minimize churn at the three existing call sites. One rename: the existing writer stamps the timestamp field as `at`; renamed to `createdAt` to match every other collection in this app (`loans`, `wishlistItems`, `series`, ...) — the existing collection is sparse enough (only live since #15, household scale) that this isn't a real migration, just updating the one writer and its test.
- *Why not a fresh `auditEntries` collection instead:* the existing one already has real data (however sparse) once deployed; no reason to fork it.

### D2. The no-op guard becomes action-aware
Today: `if (record.changedFields.length === 0) return;` — correct for a no-op edit, but would silently swallow every create/delete, which have no "changed fields" by nature. Becomes: skip only when `action === "update" && changedFields.length === 0`.

### D3. Actor is a live lookup, not a snapshot
Unlike `entityLabel` (essential — books/copies/events *do* get deleted), the acting reader is not worth denormalizing: readers are set up once per household and essentially never deleted. The view fetches `/api/readers` once (already a pattern used everywhere — book detail, wishlist, loans) and maps `readerId → name` client-side. Keeps the audit write path exactly as small as it is today.

### D4. Coverage: where the missing call sites go
- `books.ts`: add to `POST` and `DELETE` (already on `PATCH`).
- `copies.ts`: add to `POST` and `DELETE` (already on `PATCH`).
- `reading-events.ts`: add to all three — zero coverage today. `PATCH` needs the same "fetch existing, diff against the parsed input" shape the book/copy routes already use (`getReadingEvent` before `updateReadingEvent`).
- `intake.ts`: one `action: "create"` entry for the book and one for the copy it creates in the same session — this is the household's actual primary way books enter the library (scan/photo/AI), and skipping it would miss most real creation events. `services/intake/service.ts` calls `services/books/repository.ts` directly (no service layer for books), so the log call is made from the route handler after the intake service returns, using its result — no repository/service layering is touched.
- Deliberately not touched: `loans`, `wishlistItems`, `series` writes (out of scope per the issue; see Non-Goals).

### D5. Read API and the two views
`GET /api/audit-log?entityType=&entityId=&limit=` (public read, consistent with every other read endpoint in this app — loans, wishlist, series — in a private household app there's no confidentiality boundary between the two readers). Two callers:
- **`/ajustes/actividad`** (new settings sub-page, same shape as `/ajustes/series`): the most recent N entries across everything, no filter.
- **Book detail "Actividad" section**: not just `entityType=book&entityId=<id>` — the household's mental model is "what happened to this book," which includes its copies and its reading events too. The book detail already loads its `copies` and `events`, so the section fetches the book's own entries plus one query per copy/event id it already has in hand and merges them by `createdAt`. Named "Actividad" specifically to avoid colliding with the existing "Historial de lecturas" (#26) section on the same page.

## Risks / Trade-offs

- **[Risk]** Every write on three entity types now costs one extra Firestore write. → Accepted: household scale, same cost trade-off already made for `loans`/`wishlistItems`/`series`.
- **[Trade-off]** No field-level before/after values, only field *names*. → Accepted per the issue's acceptance criteria ("quién y cuándo"); revisit only if revert (explicitly optional) gets picked up later.
- **[Risk]** The book detail's "Actividad" section issues one query per copy/reading-event id rather than a single indexed query. → Accepted at household scale (a handful of copies/events per book); revisit only if that stops being true.

## Migration Plan

Extends an already-partially-implemented collection: existing `auditLog` documents (from `PATCH` calls made since #15 shipped) are missing `action`/`entityLabel`/the widened `entityType` — the read side treats their absence gracefully (`action` defaults to `"update"` for legacy docs missing it, `entityLabel` falls back to the raw id). No backfill required; the collection self-heals going forward as new writes use the fuller shape. `docs/data-model.md` moves AuditLog from reserved to implemented, noting it was already partially live before this change formalized it.
