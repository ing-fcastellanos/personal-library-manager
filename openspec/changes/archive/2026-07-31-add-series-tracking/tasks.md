## 1. Type

- [x] 1.1 Create `lib/types/series.ts` following `lib/types/loan.ts` conventions: `seriesSchema` with `name` (required), `volumes` (array of `{ position, title, authors, isbn13?, coverUrl?, bookId? }`, `bookId` nullish denotes missing), ISO timestamps. Plus `seriesCreateSchema`/`seriesUpdateSchema` (whole-volumes-array replace on update, per design D5).
- [x] 1.2 Unit tests: valid series accepted; a volume with no `bookId` accepted (missing); a series with zero volumes rejected on create; no `seriesId` field exists on the book schema (`lib/types/book.ts` untouched).

## 2. Repository

- [x] 2.1 Create `services/series/repository.ts` mirroring `services/loans/repository.ts`: `COLLECTION = "series"`, `listSeries`, `getSeries`, `createSeries`, `updateSeries` (replaces `name`/`volumes` wholesale), `deleteSeries`.
- [x] 2.2 Emulator-backed integration tests: CRUD round-trip, a volume's `bookId` persisted as `null` when omitted.

## 3. Derived views (pure)

- [x] 3.1 Create `services/series/views.ts`: `seriesForBook(bookId, seriesList)` → the series (if any) containing a volume with that `bookId`; `volumeCounts(series)` → `{ owned, total }`; `isMissing(volume)`.
- [x] 3.2 Unit tests: a book linked as a volume is found by `seriesForBook`; a book in no series returns nothing; `volumeCounts` counts owned vs. total correctly.

## 4. API

- [x] 4.1 Create `server/routes/series.ts`: public `GET /series`, `GET /series/:id`; `requireAuth` on `POST /series` (create), `PATCH /series/:id` (rename/edit volumes), `DELETE /series/:id`.
- [x] 4.2 Register the router in `server/index.ts`.
- [x] 4.3 Route tests: reads work unauthenticated; writes rejected without a session; create/update/delete happy paths.

## 5. Backup wiring

- [x] 5.1 Add `series` to `components/settings/backup.ts` (`Backup` interface, the `Promise.all` over `/api/series`, and the returned object); extend the backup unit test to assert the `series` key is present and populated.

## 6. Book detail: Serie section

- [x] 6.1 Book detail (`components/catalog/book-detail.tsx`): load `/api/series`, derive this book's series via `seriesForBook`. If found, a "Serie" section listing every volume in order with owned/missing status and, per missing volume, an "Agregar a deseos" action (reuse `AddToWishlistButton` with a snapshot built from the volume). If not found, an action to open the link-series dialog.
- [x] 6.2 Create `components/series/series-dialog.tsx` (view + edit an existing series: rename, add/reorder/remove volumes) and `components/series/link-series-dialog.tsx` (add the current book to a new or existing series, reconciling a matching placeholder volume by position). Shared row rendering in `components/series/volume-row.tsx`, shared array-editing helpers in `components/series/link.ts`.
- [x] 6.3 Component tests: a book that's a volume of a series shows the "Serie" section with correct owned/missing per volume; adding a missing volume to the wishlist creates the item from its snapshot; a book in no series offers to start one.

## 7. Catalog browse: Serie badge

- [x] 7.1 In `components/catalog/catalog-browse.tsx`, fetch `/api/series` (mirrors the existing loans "Afuera" fetch) and show an informational "Serie" indicator (like the "prestado" one) on any result whose book is linked as a volume — no click target nested in the result's link (design D4, revised during apply); viewing/editing stays on the book detail and `/ajustes/series`.
- [x] 7.2 Component tests: a book linked to a series shows the indicator; a book in no series does not.

## 8. Settings: /ajustes/series

- [x] 8.1 `app/ajustes/series/page.tsx` (mirrors `app/ajustes/qr/page.tsx`'s settings-sub-page shape) rendering `components/series/series-index.tsx`: list every series with its completion ("N de M tomos"), each row opening `series-dialog`; an empty state when no series exist.
- [x] 8.2 Add a "Series" card to `app/ajustes/page.tsx` linking to `/ajustes/series`, alongside the existing QR/Backup/Apariencia cards.
- [x] 8.3 Component tests: the index shows completion per series; the empty state renders with none.

## 9. Docs

- [x] 9.1 Update `docs/data-model.md`: add the `series` collection (fields, relationships, no new composite index needed since it's loaded wholesale like `wishlistItems`/`loans` are for their derived views), remove Series from the reserved-entities table, and record why the implemented shape (a `series` collection whose volumes reference `bookId`) supersedes the reserved one (`book.workKey` groups editions of one volume, not distinct volumes of a saga, and was never populated).

## 10. Verify

- [x] 10.1 `npm test` (node + jsdom lanes) green; `typecheck` and `lint` clean. (`server/routes/intake.test.ts` hit the known pre-existing `beforeAll` timeout flake under full-suite load — passes 3/3 in isolation, untouched by this change.)
- [ ] 10.2 Exercise the loop against the emulator: create a series from a book's detail with one missing volume → the book detail, the catalog badge, and `/ajustes/series` all reflect it → add the missing volume to the wishlist → link a newly-acquired book to that volume → all three surfaces update to "owned"; backup includes `series`.

## 11. Claude Design handoff (#38)

- [x] 11.1 Generate the specific Claude Design prompt for series tracking: the book-detail "Serie" section, the series dialog (view + edit, add/reorder/remove/link volumes), the catalog "Serie" badge, `/ajustes/series`, and the missing-volume → wishlist action — responsive mobile-first, accessibility, M0 tokens.
- [x] 11.2 Produce the design in Claude Design and validate against the base design system (`Series.dc.html`, same project/tokens as the rest of the design system).
- [x] 11.3 Integrate the handoff: map markup/code to Next components + tokens/styles. Adopted from the handoff: cover swatches + full-width wishlist action per volume, the "este libro" bookmark line, the header "Editar" placement + explicit "Cerrar" in view mode, disabled state on the boundary move buttons, the collapsible "agregar tomo faltante" form, the stepper buttons around the position field, and the `Book` icon (was `Layers`) across the series surfaces. Confirmed by the handoff: the catalog badge stays informational-only, matching the mid-apply correction.
- [ ] 11.4 QA: responsive visual pass + accessibility pass.
