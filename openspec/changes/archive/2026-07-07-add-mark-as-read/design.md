## Context

M4 registers finished readings. The backend is already complete: the
`ReadingEvent` model (`lib/types/reading-event.ts`) has `readerId`, `bookId`,
`copyId`, `status`, `dateStarted`, `dateFinished`, `rating`, `review`, plus a
denormalized book snapshot; the service (`services/reading-events/service.ts`)
validates references and composes the snapshot; and `POST /api/reading-events`
(auth-gated, Zod-validated) creates the event. So #24 is **UI only**: compose the
existing endpoints into a flow that finds a book and creates a `finished` event.

Reused building blocks (all exist):

- Active reader: `useAuth()` → `{ reader, loading }` (`components/auth/auth-provider.tsx`).
- Catalog search (M2): `GET /api/catalog/search?q=…` → `{ items: Book[], … }`.
- Photo identify (M3): `POST /api/ai/identify` → `{ best, alternatives }`; pattern in `components/books/add-book-by-photo.tsx`.
- Copies: `GET /api/books/:bookId/copies` → `Copy[]`.
- UI patterns: `/agregar` 2×2 mode selector (`app/agregar/page.tsx`), bottom-sheet `role="dialog"` (`add-book-by-code.tsx`), `useToast()`.
- The disabled "Marcar como leído" button already sits in `book-detail.tsx:262-276`.

## Goals / Non-Goals

**Goals:**

- A dedicated `/leido` flow: pick method (search / photo) → find book → confirm → create.
- Enable the book-detail "Marcar como leído" button to open the same confirmation step.
- Attribute to the active reader; capture finish date (default today), optional start date, and copy.
- Graceful empty/error/no-reader states; book detail reflects the new "Leído" status.

**Non-Goals:**

- Rating/review capture and later editing → #25.
- Reading history timeline / filters → #26.
- Any backend/model/route change (all already exist).
- Marking books that are **not** in the library (photo matches must resolve to a library book; otherwise offer to add first).

## Decisions

- **Reuse the `/agregar` shape for `/leido`.** A 2×2-style method selector
  (Buscar / Foto) mirrors the established mode-selector so the UX is consistent
  and we reuse the radiogroup pattern. _Alternative:_ a bespoke layout — rejected
  for inconsistency and extra design cost.

- **Single shared `ConfirmReadingSheet` component** used by both entry points
  (dedicated flow and book-detail button). It takes a resolved `book` + its
  copies and owns the date/copy fields and the POST. _Alternative:_ duplicate the
  confirm UI per entry point — rejected (drift risk).

- **Attribution via explicit `readerId` in the body** (ADR-0013), read from
  `useAuth()`. If `reader` is null, block creation and prompt sign-in rather than
  relying on server session inference. _Alternative:_ implicit from session —
  rejected per existing ADR.

- **Photo path resolves to a library book before confirming.** After
  `POST /api/ai/identify`, match the candidate to an existing library book (by
  isbn13, falling back to a catalog search on title/author). If no library match,
  show "solo libros de la biblioteca" and offer a link to `/agregar`. _Alternative:_
  create the book on the fly — rejected; adding is M3's job and keeps #24 focused.

- **Finish date defaults to today, editable; start date optional.** Dates are ISO
  `YYYY-MM-DD` strings sent as `dateFinished` / `dateStarted`. Use a native
  `<input type="date">` for mobile-friendliness and zero deps.

- **Copy selector only when copies exist.** Fetch `GET /api/books/:id/copies`;
  if empty, omit `copyId` (event created with `copyId: null`, which the model
  allows). If one copy, preselect it; if many, let the reader choose.

- **Success refresh on book detail.** After a create initiated from book detail,
  re-fetch reading-events (or optimistically set the reader's status) so the
  "Lectura" section shows "Leído" without a full reload.

## Risks / Trade-offs

- **Photo→library matching is fuzzy** → Mitigate by matching on isbn13 first
  (exact), then a scoped catalog search; when ambiguous, show candidates and let
  the reader pick, and always allow "no está en la biblioteca → agregar".
- **Double-marking (same book/reader/day)** → Out of scope to hard-block; the
  model supports multiple events (needed for re-reads, #26). A lightweight
  "ya marcaste este libro hoy" hint can be deferred; not blocking creation.
- **No active reader / expired session** → Gate the confirm action on
  `useAuth().reader`; surface a sign-in prompt instead of a 401 from the POST.
- **`/leido` discoverability** → Add a nav entry; the book-detail button covers
  the "I'm already looking at the book" case.

## Migration Plan

Pure additive UI. New route `/leido` + components; one modification to
`book-detail.tsx` (enable button + refresh). No data migration, no rollback
concerns — reverting the change removes the flow with no residual state (events
already created remain valid). Ships on `feat/mark-as-read` → PR → deploy.

## Open Questions

- Exact placement of the `/leido` nav entry (bottom nav vs. menu) — resolve
  against the design-system handoff during integration.
- Whether the photo entry ships in this change or defers to a follow-up if the
  library-matching UX proves heavy — the dedicated flow can launch search-only
  and add photo without a spec change.
