## 1. Type

- [x] 1.1 Create `lib/types/audit-log.ts` following `lib/types/loan.ts` conventions: `auditLogEntrySchema` with `readerId` (required), `action` (`"create"|"update"|"delete"`, required), `entityType` (`"book"|"copy"|"readingEvent"`, required), `entityId` (required), `entityLabel` (required), `changedFields` (optional array, only meaningful for `update`), `createdAt` (ISO, required — renamed from the existing writer's `at`).
- [x] 1.2 Unit tests: valid entry accepted; `changedFields` optional and absent for `create`/`delete`; missing `entityLabel` rejected.

## 2. Extend the existing writer

- [x] 2.1 Update `services/audit/repository.ts`: widen `AuditEntity` → `entityType: "book"|"copy"|"readingEvent"`, add `action` and `entityLabel` to `ChangeRecord`, rename the stamped timestamp field from `at` to `createdAt`. The no-op guard becomes action-aware: skip only when `action === "update" && changedFields.length === 0`; always write for `create`/`delete`.
- [x] 2.2 Add `listAuditLog({ entityType?, entityId?, limit? })` reading the collection ordered by `createdAt desc`, filterable in memory (household-scale, matches `services/catalog`/`services/loans`/`services/series`'s existing in-memory-filter pattern — no new composite index).
- [x] 2.3 Update `services/audit/repository.integration.test.ts` for the new shape (`createdAt` instead of `at`, `action`/`entityLabel` present) and add coverage for `listAuditLog` and the action-aware no-op guard (a `create`/`delete` with no `changedFields` still writes).

## 3. Wire the missing call sites

- [x] 3.1 `server/routes/books.ts`: add `recordChange` (`action: "create"`) to `POST /books`, and (`action: "delete"`) to `DELETE /books/:id` before the delete succeeds (label from the fetched book). Update the existing `PATCH` call site for the renamed/widened shape.
- [x] 3.2 `server/routes/copies.ts`: same for `POST`/`DELETE /copies`, plus updating the existing `PATCH` call site. Label includes the owning book's title where cheaply available.
- [x] 3.3 `server/routes/reading-events.ts`: add `recordChange` to all three of `POST`/`PATCH`/`DELETE /reading-events` (currently zero coverage) — `PATCH` needs the same "fetch existing, diff against parsed input" shape `books.ts`/`copies.ts` already use.
- [x] 3.4 `server/routes/cover.ts`: update its existing `recordChange` call site for the renamed/widened shape (stays `action: "update"`).
- [x] 3.5 `server/routes/intake.ts`: after a successful intake, log one `action: "create"` entry for the book and one for the copy it creates.
- [x] 3.6 Route tests: creating/updating/deleting a book/copy/reading-event calls `recordChange` with the right `action`/`entityType`/`entityLabel`; a no-op `PATCH` doesn't call it; intake logs both the book and the copy. New `books.test.ts`/`copies.test.ts`/`reading-events.test.ts` (none existed before); extended `cover.test.ts`/`intake.test.ts`.

## 4. Read API

- [x] 4.1 Create `server/routes/audit-log.ts`: public `GET /audit-log?entityType=&entityId=&limit=`.
- [x] 4.2 Register the router in `server/index.ts`.
- [x] 4.3 Route tests: unfiltered list, filtered by `entityType`+`entityId`, `limit` respected.

## 5. UI: book detail "Actividad" section

- [x] 5.1 In `components/catalog/book-detail.tsx`, fetch the book's own audit entries plus one query per already-loaded copy/reading-event id, merge by `createdAt desc`, and render an "Actividad" section (distinct from the existing "Historial de lecturas") showing actor (resolved from the already-loaded `readers` list), action, and what changed. Shared `components/audit/{format,activity,activity-row}.ts(x)`.
- [x] 5.2 Component tests: a book with a logged edit and a copy with a logged edit both appear in "Actividad", most recent first; an entity with no logged activity renders no section.

## 6. UI: /ajustes/actividad

- [x] 6.1 `app/ajustes/actividad/page.tsx` (mirrors `app/ajustes/qr/page.tsx`'s settings-sub-page shape) rendering a `components/audit/activity-feed.tsx`: the most recent entries across every entity, actor + action + entity label + relative time; an empty state when nothing's logged yet.
- [x] 6.2 Add an "Actividad" card to `app/ajustes/page.tsx` linking to `/ajustes/actividad`, alongside the existing Series/QR/Backup/Apariencia cards.
- [x] 6.3 Component tests: the feed lists entries most recent first across entity types; an entry for a since-deleted entity still renders a readable label; the empty state renders with none.

## 7. Docs

- [x] 7.1 Update `docs/data-model.md`: add the `auditLog` collection (fields, no new composite index — filtered in memory like `loans`/`series`), remove AuditLog from the reserved-entities table, and record that it was already partially live (edit-only, from #15) before this change added create/delete, `readingEvent` support, and the read side.

## 8. Verify

- [x] 8.1 `npm test` (node + jsdom lanes) green (637/637); `typecheck` and `lint` clean.
- [~] 8.2 Partially exercised against the emulator: got the emulators + dev server running (unlike prior sessions, blocked by an occupied port) and confirmed `/catalogo` and a book's detail render real seeded Firestore data correctly, including the "Serie" and correctly-hidden "Actividad" (no entries yet) sections. Did not complete an authenticated write through the browser (the magic-link sign-in flow needs hand-rolling Auth-emulator REST calls) to see a live entry appear — that exact path is covered by the `books.test.ts`/`copies.test.ts`/`reading-events.test.ts`/`cover.test.ts`/`intake.test.ts` `recordChange` assertions instead.

## 9. Claude Design handoff

- [x] 9.1 Generate the specific Claude Design prompt for the activity views: the book-detail "Actividad" section (distinct from "Historial de lecturas"), `/ajustes/actividad`, how an action/entity type reads at a glance, and the since-deleted-entity case — responsive mobile-first, accessibility, M0 tokens.
- [x] 9.2 Produce the design in Claude Design and validate against the base design system (`Actividad.dc.html`, same project/tokens as the rest of the design system).
- [x] 9.3 Integrate the handoff: map markup/code to Next components + tokens/styles. Adopted: flat hairline-separated rows (no card border, deliberately distinct from "Historial de lecturas"), the action icon badged on the avatar's corner instead of trailing, changed-fields + relative-time sharing one meta line, the `SquarePen` edit icon (was `Pencil`), never destructive-red for "borró", a book-detail subtitle ("Este libro, sus ejemplares y sus lecturas"), a row-shaped loading skeleton, the empty state's second line, `/ajustes/actividad`'s footer note, and bumping the feed limit to 200 to match the handoff's stated retention copy.
- [ ] 9.4 QA: responsive visual pass + accessibility pass.
