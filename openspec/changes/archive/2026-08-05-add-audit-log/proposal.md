## Why

With two readers editing the same library, "who changed this?" has no answer today beyond guessing. #15 (edit-book) quietly laid a foundation for this — `services/audit/repository.ts` already logs field-level diffs on `PATCH /books/:id` and `PATCH /copies/:id` — but it stops there: no create/delete coverage, no reading events, no entity-name snapshot (so a deleted entity's trail becomes unreadable), and, by its own comment, "no query UI here." `docs/data-model.md` was never updated to reflect that `auditLog` already exists, so it still reads as reserved/unimplemented.

## What Changes

- Extend the existing audit write path (not replace it): cover create and delete for `book`/`copy`, add `readingEvent` as a third auditable entity (currently has zero coverage), and snapshot an `entityLabel` so a log entry stays legible after its entity is deleted.
- Fix the no-op guard: it currently skips logging whenever there are no changed fields, which is correct for a no-op edit but would wrongly swallow every create/delete (which have no "changed fields" by nature).
- A read API and two views: `/ajustes/actividad` (a global recent-activity feed, same settings-sub-page shape as `/ajustes/series`) and an "Actividad" section on the book detail — named to avoid colliding with the existing "Historial de lecturas" (#26) — showing everything logged against that book, its copies, and its reading events together.
- Update `docs/data-model.md` to document `auditLog` as implemented and correct the stale reserved-entities entry.

## Capabilities

### New Capabilities
- `audit-log`: the `auditLog` collection's full shape (action, entity type/id/label, actor, changed fields, timestamp), the read API, and the global `/ajustes/actividad` feed.

### Modified Capabilities
- `catalog-edit`: the existing "Minimal change log" requirement only covers edits and explicitly defers any query UI to this feature — broadened to also cover create/delete, and that deferral is resolved.
- `catalog-search`: the book detail view gains an "Actividad" section aggregating audit entries for the book, its copies, and its reading events.
- `data-model`: document the `auditLog` collection (already partially implemented) and remove AuditLog from the reserved-entities table.

## Impact

- Modified: `services/audit/repository.ts` (extended shape, action-aware no-op guard), `server/routes/{books,copies,reading-events,intake}.ts` (new/updated `recordChange` call sites), `services/audit/diff.ts` (unchanged, reused as-is).
- New: `lib/types/audit-log.ts`, `server/routes/audit-log.ts`, `components/audit/*`, `app/ajustes/actividad/page.tsx`.
- `reading-events` routes gain their first-ever audit coverage (currently none).
