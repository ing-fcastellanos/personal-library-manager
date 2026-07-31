## Why

The household can already tell what it owns and has read, but not what's missing from a saga — there's no way to say "this is book 2 of 3" and see that book 3 isn't home yet. `book.workKey` was reserved for this (#38) but was never implemented; grouping *editions of one book* isn't the same problem as ordering *distinct volumes of a series*, and no code populates it today.

## What Changes

- New `series` capability: a manually-curated, ordered list of volumes (title/authors/cover/ISBN snapshot + an optional `bookId` once owned). A volume without a `bookId` is a missing tomo.
- A "Serie" section on the book detail page for any book that's part of a tracked series, listing every volume with its status ("Tenés" / "Falta") and an "Agregar a deseos" action per missing volume (reusing `AddToWishlistButton`).
- A dialog, opened from the book detail, to create a new series or add the current book to an existing one — the only place a series is authored. No dedicated series-detail route.
- A "Serie" badge on catalog browse results for any book belonging to a tracked series, opening the same dialog.
- `/ajustes/series`: a settings sub-page (same shape as the existing `/ajustes/qr`) listing every tracked series with its completion ("2 de 3 tomos"), each opening the same dialog.

## Capabilities

### New Capabilities
- `series`: track a saga's volumes in order, flag which ones the household doesn't own yet, and surface that from the book detail, the catalog badge, and a settings index — with no data on `book` itself and no new capability needed to read it.

### Modified Capabilities
- `catalog-search`: the book detail view gains a "Serie" section (volumes + status + add-missing-to-wishlist); the catalog browse view gains a "Serie" badge.
- `data-model`: document the `series` collection; remove Series from the reserved-entities table (its originally sketched shape, `book.workKey` + a series doc, is superseded — see design.md).

## Impact

- New: `services/series/*`, `server/routes/series.ts`, `lib/types/series.ts`, `components/series/*`, `app/ajustes/series/page.tsx`.
- Modified: `components/catalog/book-detail.tsx` (Serie section), `components/catalog/catalog-browse.tsx` (Serie badge), `app/ajustes/page.tsx` (new settings card), `components/settings/backup.ts` (include `series`), `docs/data-model.md`.
- No change to `lib/types/book.ts` — `workKey` stays reserved, unused, and untouched; series membership lives entirely in the new `series` collection.
