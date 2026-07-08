## Why

The dashboard shows collection composition (#28) but nothing about _reading
activity over time_ — recent progress, momentum, or how the two readers compare.
#29 adds a "recent reads" glance and per-reader time trends (monthly pace,
streaks) so the dashboard reflects not just what's in the library but how it's
being read. All data (`ReadingEvent.dateFinished`/`readerId`) is already loaded
by the dashboard; this is computation + UI, no backend.

## What Changes

- **"Últimos leídos" widget** on the dashboard: the 5 most recent finished
  readings across both readers, reusing the `ReadingEventCard` from #26, with a
  link to the full history (`/leido` → Historial tab).
- **Per-reader time stats**, computed all-time (no rolling window):
  - **Libros/mes**: average finished books per active month (months with at
    least one finished reading).
  - **Racha** ("streak"): current consecutive months (up to and including the
    present month) with ≥1 finished reading, and the longest such streak ever.
  - **Ritmo** ("pace"): average number of days between consecutive finished
    readings — a complementary, more intuitive read than books/month ("un libro
    cada ~18 días").
- **Comparativa entre lectores**: the two readers' stats shown side by side so
  it's easy to compare pace/streaks at a glance.
- **Client-side computation**, reusing the dashboard's already-loaded `events`
  (no new fetch, no aggregation endpoint) — same approach as #27/#28.
- **Out of scope (deferred):** any new backend aggregation endpoint; a rolling/
  windowed view (e.g. "last 12 months") — all-time only for now; reading goals
  (#30); editing/interacting with a reading from this widget (view-only, editing
  stays in `/leido`).

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `dashboard`: extends the KPI + composition views with a recent-reads widget
  and per-reader time trends (pace, streaks, comparison). Adds requirements;
  existing #27/#28 requirements are unchanged.

## Impact

- **Modified UI**: `components/dashboard/dashboard.tsx` (renders the new
  "Últimos leídos" and "Tendencias" sections using data it already fetches).
- **New UI**: `components/dashboard/recent-reads.tsx` (the last-5 widget,
  reusing `ReadingEventCard` from `components/reading/`) and
  `components/dashboard/reader-trends.tsx` (per-reader stat cards); pure trend
  helpers added to `components/dashboard/dashboard-stats.ts` (e.g.
  `recentReads(...)`, `readerTrend(...)`: books/month, current + longest streak,
  average days between reads).
- **Reused (no change)**: the data already fetched by `Dashboard` (`GET
/api/reading-events`, `/api/readers`); `ReadingEventCard` from #26; no new
  endpoints.
- **No backend changes.**
- **Tests**: trend helpers (books/month, streak current/longest, average
  days-between, empty/single-event edge cases); recent-reads widget (top 5,
  ordering, empty state); reader-trends comparison (two readers, one with zero
  readings); dashboard renders the new sections with real + empty data.
