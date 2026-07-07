## Context

#24 shipped the mark-as-read flow: `ConfirmReadingSheet` creates a `finished`
`ReadingEvent` via `POST /api/reading-events`, and the book detail shows a
per-reader status row. The `ReadingEvent` model already carries `rating`
(`int 1–5`, nullish) and `review` (string, nullish), and `PATCH
/api/reading-events/:id` already validates and persists both. So #25 is UI only:
capture rating/review at mark time, edit them later, and display them.

Current state to build on:

- `components/reading/confirm-reading-sheet.tsx` — the shared sheet (create only today).
- `components/reading/mark-read.ts` — `readingEventCreateBody(...)` (omits rating/review today).
- `components/catalog/book-detail.tsx` — "Lectura" rows: avatar + name + status badge; active reader gets the inline "Marcar leído" button; loads `/api/books/:id/reading-events`.

## Goals / Non-Goals

**Goals:**

- Optional rating (1–5) + optional review in the confirm sheet on create.
- A dual-mode sheet (`create` → POST, `edit` → PATCH) that preloads an event in edit.
- Book detail shows each reader's rating (stars) + review; active reader can edit theirs.
- An accessible, reusable star-rating control.

**Non-Goals:**

- Editing arbitrary past events / re-reads, and the history timeline → #26.
- CSV export / Goodreads link → M7 (data is merely captured here).
- A configurable rating scale (fixed 1–5; no settings plumbing exists).
- Backend changes (POST/PATCH/model already support rating + review).

## Decisions

- **Dual-mode `ConfirmReadingSheet` (Decision 1 → A).** Add a `mode: "create" |
"edit"` (default `create`) and, for edit, an `event: ReadingEvent` prop. Create
  → `POST` (as today, now including rating/review); edit → `PATCH
/api/reading-events/:id` with the changed fields, preloading date/copy/rating/
  review from the event. _Alternative:_ a separate lightweight edit sheet —
  rejected to avoid two sheets drifting; the header/attribution/actions are
  already shared, so extending is cheaper than duplicating.

- **Both rating and review optional (Decision 2).** A reading can be marked with
  neither; the create body sends `rating`/`review` only when set (else null),
  matching the "editable later" intent.

- **Edit targets the reader's latest event on the book (Decision 3).** The book
  detail already derives the newest event per reader (`statusByReader`); the
  "Editar" action opens that event in edit mode. Editing older events / re-reads
  is #26's concern.

- **Star widget: accessible radio-group of 5 stars (Decision 4).** A dedicated
  `star-rating.tsx`: `role="radiogroup"`, 5 star buttons `role="radio"`
  (`aria-checked`), arrow-key + number support, and a way to clear back to no
  rating (e.g. re-selecting the current value or a "sin calificar" affordance).
  Fixed integer 1–5; no half-stars (model is `int`).

- **Active reader edits own; others read-only (Decision 5).** Only the row whose
  `readerId` matches `useAuth().reader?.id` exposes "Editar"; all rows render
  stars/review read-only when present.

- **Payload helpers in `mark-read.ts`.** Extend `readingEventCreateBody` to carry
  `rating`/`review`, and add `readingEventUpdateBody(...)` for the PATCH shape.
  Keep them pure and unit-tested (existing convention).

## Risks / Trade-offs

- **Sheet complexity creep** → Mitigate by keeping `mode` a thin branch (only the
  submit verb + preloaded initial state differ); the fields are shared.
- **Clearing a rating vs. "not set"** → Both map to `rating: null`; the star
  control must offer an explicit clear so a reader can un-rate. PATCH with
  `rating: null` persists the clear.
- **Multiple events per reader (re-reads)** → Editing the _latest_ could surprise
  a reader who meant an older one; acceptable for #25 (single latest), fully
  addressed when the history UI lands (#26).
- **Long reviews** → No model max; the textarea should be comfortable but we
  won't impose a hard limit beyond what the backend accepts.

## Migration Plan

Additive UI. Extend the sheet + helpers, add the star control, augment the book
detail rows. No data migration; events created before #25 simply have null
rating/review and render without stars until edited. Ships on
`feat/reading-rating-review` → PR → deploy.

## Open Questions

- Exact clear-rating affordance (tap-again vs. an explicit "sin calificar" link) —
  resolve against the Claude Design handoff.
- Whether the review has a soft character counter — decide during design; not a
  spec requirement.
