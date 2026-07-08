## Why

The dashboard (#27) shows KPI counts but no sense of the collection's _shape_ —
which categories, authors, and publishers dominate, and what gets actually read.
#28 adds distribution charts so the reader can see composition at a glance. All
the underlying data (`Book.authorKeys`/`categoryKeys`/`publisher`,
`ReadingEvent.status`/`bookId`) is already loaded by the dashboard; this change
computes distributions from it and renders them as lightweight, accessible SVG
bar charts — no new dependency, no backend.

## What Changes

- **New dashboard section "Composición"** below the existing KPI grid and
  per-reader list: distribution charts for **libros por categoría**, **libros
  por autor**, **libros por editorial**, and **lecturas por categoría** (of
  finished readings).
- **Custom SVG bar chart component** (`components/dashboard/bar-chart.tsx`):
  horizontal bars, real text labels + values (not color-only), built on the M0
  design tokens. No charting library added — matches the project's existing
  pattern of hand-rolled SVG over the design system (star rating, barcode
  scanner UI) instead of a new dependency.
- **Top-N + "Otros" bucketing**: each distribution shows the top 6 entries by
  count, collapsing the remainder into an "Otros" bucket, so the chart stays
  readable regardless of how many distinct categories/authors/publishers exist.
- **"Categoría" and "género" are the same data** (`categoryKeys`) — the model has
  no separate genre field; the issue's two mentions are treated as synonyms, not
  two axes. Documented as a scope simplification.
- **Client-side aggregation**, reusing the dashboard's already-loaded `books` and
  `events` (no new fetches, no aggregation endpoint) — same approach as #27.
- **Out of scope (deferred):** any new backend aggregation endpoint (not needed
  at this data size); recent-reads / time-based trends (#29); reading goals
  (#30); drill-down/filtering from a chart into the catalog.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `dashboard`: extends the KPI overview with distribution charts (books by
  category/author/publisher, readings by category). Adds requirements; existing
  #27 requirements are unchanged.

## Impact

- **Modified UI**: `components/dashboard/dashboard.tsx` (renders the new
  "Composición" section using the data it already fetches).
- **New UI**: `components/dashboard/bar-chart.tsx` (the SVG bar chart primitive)
  and pure distribution helpers added to `components/dashboard/dashboard-stats.ts`
  (e.g. `topN(...)` / category, author, publisher, and readings-by-category
  breakdowns).
- **Reused (no change)**: the data already fetched by `Dashboard` (`GET
/api/books`, `/api/reading-events`); no new endpoints.
- **No backend changes.**
- **Tests**: distribution/top-N helpers (grouping, sorting, "Otros" bucketing,
  ties, empty input); bar chart component (labels, values, empty state);
  dashboard renders the new section with real + empty data.
