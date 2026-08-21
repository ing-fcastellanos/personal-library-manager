## Why

Shelf-capture AI identification reads spines reliably for title/author but never sees the
front cover, so publisher and cover art are frequently wrong. High-confidence reads land in
the shelf review's "auto" bucket (`classifyShelfBook` only weighs title confidence,
enrichment match, and duplicates — never publisher) and go straight into the collection
read-only, with no way to fix the publisher or swap in the right cover first. The same gap
exists for already-saved books: the standalone Edit Book form's "Re-enriquecer" / "Usar
portada de Google" path is ISBN-only and offers a single best guess, with no way to search a
cover by publisher when the ISBN is missing or the guess is wrong. Google Books' `inpublisher:`
query syntax exists for exactly this and is unused anywhere in the codebase today.

## What Changes

- Add publisher-scoped cover search to the enrichment layer: `services/enrichment/google-books.ts`
  gains field-restricted query support (`intitle:`/`inauthor:`/`inpublisher:`) so a search can
  be scoped to title + author + a specific publisher, returning multiple ranked candidates
  (not just one).
- Expose that search over a new `GET /api/enrich/cover-by-publisher` endpoint (title, authors,
  publisher in; up to 5 ranked candidates with cover URL + a `year · publisher` caption out —
  binding/format like "tapa blanda" is dropped from the caption since Google Books does not
  reliably expose it).
- Add a reusable, presentational `PublisherCoverSearch` component (`components/books/`) with a
  publisher text input and phase-driven states (`idle | searching | multi | single | none`):
  editing the publisher field debounces ~500ms and auto-triggers the new search; multiple
  results render as a pickable horizontal cover carousel; a single confident match auto-applies
  with an inline confirmation; no results leaves the existing cover untouched (never
  destructive).
- Wire that component into the shelf-capture "auto" bucket (`components/books/add-book-by-shelf.tsx`):
  each row gets a pencil/edit icon-button (alongside the existing info + include-toggle icons,
  which shrink from 36px to 32px to keep the row comfortable) that expands the row inline,
  accordion-style, to reveal the widget. Only one row expands at a time.
- Wire the same component into the standalone Edit Book form (`components/books/book-fields.tsx`),
  attached directly under the existing Editorial field, always available (no toggle needed).
- **BREAKING**: none — purely additive; existing enrichment/classification/intake behavior is
  unchanged.

## Capabilities

### New Capabilities

(none — this extends existing enrichment, shelf-review, and edit-book capabilities rather than
introducing a standalone one)

### Modified Capabilities

- `catalog-enrichment`: adds the publisher-scoped cover search endpoint and the underlying
  field-restricted Google Books query support.
- `ai-shelf-add`: the shelf review's "auto" bucket rows gain an inline publisher-edit /
  cover-search affordance (previously read-only).
- `catalog-edit`: the Edit Book form's Editorial field gains the same inline publisher-edit /
  cover-search affordance.

## Impact

- **New**: `components/books/publisher-cover-search.tsx` (or similar name — presentational,
  no fetching inside it, caller owns debounce/state, matching the existing `re-enrich-dialog.tsx`
  / `ReviewItem` separation of pure UI from data-fetching), a query builder for field-restricted
  Google Books search, `server/routes/enrich.ts` gains the new route (or an extended existing
  one — decide in design.md).
- **Modified**: `services/enrichment/google-books.ts`, `services/enrichment/service.ts` (reuse
  the existing 429-retry wrapper from `fix-shelf-enrich-rate-limit` for the new query path),
  `components/books/add-book-by-shelf.tsx`, `components/books/book-fields.tsx`.
- **Unchanged**: `services/ai/shelf.ts::classifyShelfBook` (publisher intentionally stays out of
  bucket classification — out of scope), intake/Firestore write path, AI identification layer.
- **Design reference**: an interactive Claude Design prototype (`Editorial y Portada.dc.html` +
  `Editorial Cover Panel.dc.html`, both read in full while planning this change) is the source
  of truth for exact copy (Spanish), layout, and the phase state machine driving this proposal.
