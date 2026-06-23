## Why

The auth + readers surface (M1) is done, but the rest of the app — catalog, AI
ingestion, reading log, dashboard, export (M2–M7) — has no data contract to build
against. ADR-0007 fixed the domain split (Book / Copy / ReadingEvent + Reader /
Shelf) and ADR-0002 fixed Firestore + Admin SDK, but there is no concrete Firestore
schema: no collection layout, no reference/denormalization decisions, no index plan,
and only `Reader` exists in `lib/types`. This change produces that contract so #12
(repositories + endpoints) and every downstream feature implement against a fixed,
reviewed shape instead of improvising one per PR.

## What Changes

- Add `docs/data-model.md`: the canonical Firestore schema — collections, document
  shapes, reference vs. subcollection decisions, denormalization rules, and the
  composite-index plan — derived from ADR-0007/0002/0008 and the existing `readers`
  conventions.
- Add shared TypeScript + zod schemas in `lib/types` for the new entities:
  `book.ts`, `copy.ts`, `reading-event.ts`, `shelf.ts` (mirroring the existing
  `reader.ts` pattern: zod schema, inferred type, create/update input schemas).
- Establish modeling defaults (accepted in exploration): all top-level
  reference-based collections; `Book` = edition-level keyed by auto-id with indexed
  `isbn13`/`isbn10`; `ReadingEvent` snapshots book metadata and has an optional
  `copyId`; "read vs pending" is **derived** from reading events; dashboard
  aggregation via Firestore `count()` (no counter docs); full-text search is out of
  scope (filters + lowercased prefix only); authors/categories stored as display
  arrays plus normalized `*Keys` slug arrays.
- Reserve (document but do **not** model) the future entities so they slot in later:
  Series (#38), Loan (#39), Wishlist (#37), AuditLog (#40), ImportSession (#22/#35),
  reading goals (#30).

This is a **contract-only** change: no repositories, no API endpoints, no deployed
indexes, no runtime validation wiring — those are #12.

## Capabilities

### New Capabilities
- `data-model`: the Firestore schema contract for the library domain — the
  `books`, `copies`, `readingEvents`, `shelves` collections (alongside existing
  `readers`), their document shapes and relationships, denormalization and key
  strategy, the composite-index plan, and the shared zod/TS type definitions.

### Modified Capabilities
<!-- None. `readers` already exists and is unchanged; this only adds the
     remaining domain entities as a contract. -->

## Impact

- **New docs**: `docs/data-model.md` (schema of record for M2–M7).
- **New types**: `lib/types/book.ts`, `lib/types/copy.ts`,
  `lib/types/reading-event.ts`, `lib/types/shelf.ts`.
- **Consumes**: ADR-0007 (domain split), ADR-0002 (Firestore/Admin SDK), ADR-0008
  (metadata sources), and the `lib/types/reader.ts` + `services/readers/repository.ts`
  conventions (ISO-string timestamps, null for absent, auto-id, query-based
  uniqueness).
- **Unblocks**: #12 (collections + repositories + endpoints + `firestore.indexes.json`),
  and through it the catalog/AI/reading/dashboard/export milestones.
- **No runtime/behavior change**: nothing imports these types yet; no Firestore
  rules or indexes are deployed in this change.
