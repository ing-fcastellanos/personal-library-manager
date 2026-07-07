## Context

`/` (`app/page.tsx`) is a static placeholder rendering hardcoded "—" KPI cards. All
the data needed for real KPIs already exists behind list endpoints — no aggregation
endpoint exists, but the library is small enough to aggregate client-side (the #26
history did exactly this over `/reading-events`). The Explore map confirmed:

- `GET /api/books` → `Book[]` (has `authorKeys`, `categoryKeys`, `publisher` for uniques).
- `GET /api/copies` → `Copy[]` (count).
- `GET /api/reading-events` → `ReadingEvent[]` (finished → read/pending, per reader).
- `GET /api/readers` → `Reader[]`.
- No charting library is installed (not needed for #27 — counts only).
- Reusable: `formatReadingDate` (#26), `useAuth`, `Card`/`Skeleton` primitives.

## Goals / Non-Goals

**Goals:**

- Replace the placeholder with a real, responsive KPI dashboard.
- Compute all counts client-side in pure, unit-tested helpers.
- Loading + empty + resilient states.

**Non-Goals:**

- Charts (#28), recent reads / trends (#29), reading goals (#30).
- A server-side `/api/stats` endpoint (future optimization; unnecessary now).
- Any backend change.

## Decisions

- **Client-side aggregation in pure helpers (Fork A).** A `dashboard-stats.ts`
  exposes `computeKpis(books, copies, events, readers)` returning the counts +
  per-reader breakdown. Pure and testable; the dashboard component just fetches and
  renders. _Alternative:_ a `/api/stats` endpoint — deferred; the data is small and
  reusing list endpoints keeps #27 backend-free, matching M4's approach.

- **Uniques from books, not catalog facets.** Count unique authors/publishers/
  categories by de-duping `authorKeys` / `publisher` / `categoryKeys` over
  `/api/books`. _Alternative:_ call `GET /api/catalog/search?q=` for its precomputed
  facets — rejected: it joins books+copies+events server-side (heavier) and returns
  a bespoke shape; de-duping keys client-side is simpler and keeps the four sources
  as plain list endpoints.

- **Read/pending is global (Fork B).** A book is **read** if any `finished` event
  exists for its `bookId`; **pending** otherwise. `read + pending === books.total`.
  Per-reader finished counts are a separate KPI. _Alternative:_ per-reader read/
  pending — deferred to #29's per-reader stats; the headline KPI is the collection view.

- **Single parallel fetch, resilient.** One `Promise.all` of the four endpoints with
  the `okJson` + `Array.isArray` coercion pattern (from book-detail/#24 resilience),
  so a failing source degrades to empty rather than crashing.

- **Client component with states (Fork E).** `app/page.tsx` renders a client
  `<Dashboard />` that owns fetch + loading skeletons + empty state. Counts are public
  reads, but a client component matches the app's pattern and gives clean states.

- **`KpiCard` primitive.** A small reusable card (icon + label + value) formatted with
  `Intl.NumberFormat("es-AR")`, reused across the KPI grid and by later M5 widgets.

## Risks / Trade-offs

- **Fetching full lists for counts** → For a personal library this is negligible; if
  it ever grows, introduce `/api/stats` (out of scope now). No silent truncation —
  we load everything.
- **"Unique authors" over `authorKeys`** → A book with multiple authors contributes
  each key; de-dupe across all books gives the true unique-author count (matches how
  catalog facets already work).
- **Category vs género** → The issue mentions "categorías"; the data has `categoryKeys`
  only (no separate genre field). #27 counts categorías; a genre split, if any, is #28.
- **Definition drift for "leído"** → Fixed here as global-finished; documented so #29's
  per-reader view stays consistent.

## Migration Plan

Additive/replacement UI on `/`. New `components/dashboard/*` + pure helpers; no data
migration. Reverting restores the placeholder with no residual state. Ships on
`feat/dashboard-kpis` → PR → deploy.

## Open Questions

- Exact KPI set/order and whether categorías is a headline card or secondary —
  resolve against the Claude Design handoff (the helper computes all; the layout
  picks which to feature).
- Whether "por lector" is a row of mini-cards or a compact list — decide during design.
