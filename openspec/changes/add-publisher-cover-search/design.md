## Context

See `proposal.md` for motivation. Two existing surfaces need the same behavior and currently
have none of it:

- The shelf review's auto bucket (`components/books/add-book-by-shelf.tsx`) renders each
  `ProcessedBook` as a read-only row (cover, title, author, an info dialog, an include toggle).
  `classifyShelfBook` (`services/ai/shelf.ts`) never looks at publisher, so a book with a
  perfectly-read title still lands here with a wrong publisher/cover and no way to fix it before
  intake.
- The Edit Book form (`components/books/book-fields.tsx`, inside `edit-book-form.tsx`) has a
  plain Editorial `Input` with no search behavior attached. The existing "Re-enriquecer" /
  "Usar portada de Google" paths (`re-enrich-dialog.tsx`, `server/routes/cover.ts`) are
  ISBN-keyed and single-best-guess only — no publisher scoping, no alternatives.

`services/enrichment/google-books.ts` sends every query as an unscoped string (`?q=<query>`).
Google Books supports field-restricted search operators (`intitle:`, `inauthor:`,
`inpublisher:`) that are simply never used today.

The interactive Claude Design prototype the user built and handed off —
`Editorial y Portada.dc.html` (both host contexts) and `Editorial Cover Panel.dc.html` (the
widget itself) — is the reference for exact copy, layout, and the state machine below. Read
both in full before implementing; this design section ports their already-validated prop
contract rather than re-deriving it.

## Goals / Non-Goals

**Goals:**

- One reusable, presentational widget driving both surfaces from the same phase state machine.
- Publisher-scoped search that degrades honestly when real data (binding/format) isn't
  available, rather than fabricating it.
- Never destructive: a search that finds nothing leaves the existing cover alone.

**Non-Goals:**

- Changing `classifyShelfBook`'s auto/review split — publisher accuracy intentionally stays out
  of that classification (per the earlier explore-mode discussion with the user).
- Open Library publisher-scoped search — Google Books is the only source scoped this way for
  now; Open Library remains an ISBN/free-text fallback elsewhere, unchanged.
- Reworking the existing ISBN-only "Usar portada de Google" stock-cover path
  (`server/routes/cover.ts`) — it continues to exist alongside this new capability rather than
  being replaced by it.
- Binding/format ("tapa blanda" vs "tapa dura") in captions — see Decisions below.

## Decisions

### Component contract ports the prototype's `Editorial Cover Panel` almost verbatim

New file `components/books/publisher-cover-search.tsx`, presentational only (no fetching
inside it — the caller owns debounce, the network call, and state), matching this codebase's
existing separation of pure UI from data-fetching (`re-enrich-dialog.tsx`, `ReviewItem` in
`add-book-by-shelf.tsx`):

```ts
type Phase = "idle" | "searching" | "multi" | "single" | "none";

interface CoverOption {
  id: string;
  caption: string;
  coverUrl: string;
}

interface PublisherCoverSearchProps {
  publisher: string;
  onPublisherChange: (value: string) => void;
  phase: Phase;
  options: CoverOption[]; // populated only when phase === "multi"
  selectedId: string | null;
  onPick: (id: string) => void;
  singleCaption: string; // populated only when phase === "single"
  onDone: () => void; // collapses the row (shelf) / resets phase (form)
  showHeader?: boolean; // "Editando editorial de «título»" — shelf only
  bookTitle?: string;
  inputId: string;
}
```

This is a direct, renamed port of the prototype's props (`publisher`, `phase`, `showHeader`,
`bookTitle`, `inputId`, `selectedId`, `options`, `singleCaption`, `onChange`→
`onPublisherChange`, `onPick`, `onDone`). Renaming `onChange` avoids colliding with the native
input-event convention used elsewhere in this codebase (`BookFields`'s `set()` pattern passes a
plain string, not a `ChangeEvent`).

### Debounce and search live in each caller, not the shared component

`add-book-by-shelf.tsx` and `book-fields.tsx` each own a small `usePublisherCoverSearch(book)`-
shaped hook (new file `components/books/use-publisher-cover-search.ts`, shared by both callers)
that: debounces the publisher value (500ms, matching the prototype's user-facing copy), calls
the new endpoint, and derives `phase`/`options`/`selectedId` from the response. Single-owner
hook avoids duplicating the debounce/fetch/race-handling logic between the two call sites while
keeping the visual component itself dumb and easy to reason about.

### New endpoint: `GET /api/enrich/cover-by-publisher`

Added alongside the existing `GET /api/enrich` in `server/routes/enrich.ts` rather than
extended as a third query-parameter mode on it — `/api/enrich`'s contract is "exactly one of
`isbn` or `q`" (see `catalog-enrichment` spec); bolting a `publisher` variant onto that
mutual-exclusion contract would complicate it for a shape (multi-field, always-ranked-list) that
doesn't fit the existing isbn-vs-q split. The new route always returns a ranked list (0-5
items), same shape as `/api/enrich?q=` but never a single-candidate response.

`services/enrichment/google-books.ts` gains a query builder:

```ts
function fieldRestrictedQuery(parts: {
  title?: string;
  author?: string;
  publisher?: string;
}): string;
```

building `intitle:"…" inauthor:"…" inpublisher:"…"` (each part quoted and present only when
given), reusing the existing `fetchVolumes`/`GoogleBooksRateLimitError`/retry machinery
unchanged. Publisher values containing `"` are escaped (stripped) before quoting to keep the
built query well-formed — user-typed free text should never be able to break the query
structure.

### Caption format: `year · publisher`, no binding/format segment

The prototype's mock captions read "2019 · Debolsillo · tapa blanda". Google Books'
`volumeInfo` does not reliably expose binding/format (hardcover vs paperback) — only
`publishedDate` and `publisher` are dependable. Real captions drop that third segment:
`"2019 · Debolsillo"`. This is a deliberate, visible downgrade from the mock rather than a
fabricated field — flagged explicitly per the proposal's "known gap."

### Shelf-row cover override flows through existing intake, not a new field

When a shelf row's publisher/cover is corrected, the row's `ProcessedBook.best` (title,
authors, publisher, coverUrl, …) is updated in place with the corrected values before intake —
the existing `shelfIntakePayload`/`intakeBook` path (which already re-hosts whatever
`coverSourceUrl` it's given, per the `fix-shelf-enrich-rate-limit`-era research) needs no
change. This is why the `ai-shelf-add` spec delta modifies "Auto bucket added after a preview"
rather than adding an intake-side special case.

### Icon row: 36px → 32px only when the pencil button is present

Matches the prototype's before/after toggle exactly: adding a third icon button (pencil) to the
row shrinks all three icon buttons from `size-9` (36px) to 32px so the row stays comfortable at
390px wide. This only affects the auto-bucket row; the edit form's field-based layout is
unaffected.

## Risks / Trade-offs

- **[Google Books data sparsity for lesser-known publishers]** → the `none` phase is a first-class,
  clearly-labeled state (not an error), and never blocks adding/saving the book — the spec
  requires the original cover to survive untouched.
- **[Debounced search racing a fast-typing user]** → the shared hook keys each in-flight request
  to the publisher value it was issued for and discards a response that no longer matches the
  current input, matching the existing rate-limit-retry pattern's "don't act on a stale result"
  discipline already established in `services/enrichment/service.ts`.
- **[Query-string injection via a publisher containing quotes/operators]** → publisher (and
  title/author) values are quote-escaped before being embedded in the `intitle:`/`inauthor:`/
  `inpublisher:` query string, same discipline the endpoint's `400` validation already applies
  to missing fields.
- **[Two callers duplicating the search hook drifting apart over time]** → mitigated by sharing
  one `use-publisher-cover-search.ts` hook; the two `.tsx` callers differ only in how they
  render `PublisherCoverSearch` (accordion row vs. always-visible form field) and in what they
  do with a resolved cover (mutate `ProcessedBook.best` vs. update form state), not in how the
  search itself works.

## Migration Plan

Purely additive — no data migration, no schema change, no flag needed. New endpoint, new
component, two call sites wired in. Safe to ship behind normal PR review; nothing to roll back
beyond reverting the change if the endpoint needs to come down.
