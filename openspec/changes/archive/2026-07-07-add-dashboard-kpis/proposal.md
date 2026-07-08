## Why

The dashboard (home, `/`) is still a placeholder with hardcoded "—" KPIs. With the
library (M2), copies, and readings (M4) all in place, the reader should land on a
screen that shows the real state of their library at a glance. #27 delivers the
dashboard **layout + KPI cards** — the foundation the later M5 widgets (charts #28,
recent-reads/trends #29, goals #30) hang off. Every number is computable from
existing endpoints, so this is UI + pure aggregation, no new backend.

## What Changes

- **Real KPI dashboard** at `/` (replaces the placeholder): a responsive grid of
  count cards fed by live data.
- **KPIs**: total **libros**, total **ejemplares**, **leídos** vs **pendientes**,
  unique **autores**, unique **editoriales** (and categorías), plus **por lector**
  (each reader's finished count).
- **Client-side aggregation** over existing list endpoints (`GET /api/books`,
  `/api/copies`, `/api/reading-events`, `/api/readers`) in pure, unit-tested
  helpers — reusing the #26 pattern. "Leído" = a book with any `finished`
  ReadingEvent; "pendiente" = a book with none.
- **States**: loading (skeletons) and empty ("sin libros todavía") — data loads
  efficiently in one parallel fetch.
- **Number formatting**: `Intl.NumberFormat("es-AR")` for the counts.
- **Out of scope (deferred):** charts by category/author/publisher (#28), recent
  reads + per-reader time trends (#29), annual reading goals (#30), and a
  server-side `/api/stats` aggregation endpoint (a future optimization; the data
  is small enough to aggregate client-side today).

## Capabilities

### New Capabilities

- `dashboard`: the library dashboard — a KPI overview of the collection and reading
  state, computed from existing data. Extended later by charts (#28), recent reads
  / trends (#29), and reading goals (#30).

### Modified Capabilities

<!-- None. -->

## Impact

- **Modified UI**: `app/page.tsx` — from a static placeholder to a client dashboard
  that fetches and renders real KPIs.
- **New UI**: dashboard components — `components/dashboard/dashboard.tsx` (fetch +
  layout), `kpi-card.tsx` (reusable card), and pure `dashboard-stats.ts` helpers
  (`computeKpis(...)`, per-reader breakdown).
- **Reused (no change)**: `GET /api/books`, `/api/copies`, `/api/reading-events`,
  `/api/readers` (all list endpoints), `useAuth()`, the `Card`/`Skeleton` primitives,
  `formatReadingDate` / number formatting.
- **No backend changes**: all KPIs derive from existing endpoints; aggregation is
  client-side and pure.
- **Tests**: aggregation helpers (counts, read/pending, per-reader, uniques);
  dashboard render (KPIs, loading, empty).
