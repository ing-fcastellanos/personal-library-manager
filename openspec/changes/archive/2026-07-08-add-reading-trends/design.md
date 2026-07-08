## Context

The dashboard already fetches all `ReadingEvent`s in one parallel call (#27) and
computes distributions client-side (#28). #29 needs no new data — `dateFinished`
and `readerId` on each `finished` event are enough for recency, monthly pace,
streaks, and inter-reading pace. #26 already has a `ReadingEventCard` component
(book-led, with edit affordance) and `eventDate`/`formatReadingDate` helpers in
`components/reading/history.ts` — directly reusable for the recent-reads widget.

## Goals / Non-Goals

**Goals:**

- A compact "últimos leídos" widget (top 5, both readers) linking to the full
  history.
- Per-reader trend stats: monthly pace, current/longest streak, average
  days-between-reads.
- A side-by-side comparison of the two readers' stats.

**Non-Goals:**

- A rolling/windowed view (e.g. "last 12 months") — all-time only.
- A backend aggregation endpoint.
- Editing from this widget — view-only; editing lives in `/leido`.
- Reading goals (#30).

## Decisions

- **"Racha" = consecutive active months (Decision A).** A month counts if the
  reader finished ≥1 book in it. Current streak walks backward from the present
  month while consecutive months are active; longest streak scans all months
  from the reader's first finished reading to now for the longest such run.
  _Alternative:_ weekly granularity — rejected; a personal library's data is too
  sparse for weekly streaks to carry signal, and it would misalign with the
  monthly "libros/mes" stat.

- **"Ritmo" = average days between consecutive finishes (Decision B).**
  Distinct from "libros/mes" (an aggregate monthly rate): ritmo sorts a reader's
  `dateFinished` values and averages the gaps, giving an intuitive "a book every
  ~N days." _Alternative:_ make ritmo a synonym for libros/mes — rejected; the
  proposal explicitly wants two distinct, complementary metrics.

- **All-time window, no rolling range (Decision D).** Consistent with #27/#28's
  approach of aggregating everything already loaded; a personal library's total
  history is small enough that this isn't a performance concern, and it avoids
  the extra complexity of a date-range picker in this pass.

- **Recent-reads reuses `ReadingEventCard` (Decision C is folded into UI reuse).**
  `components/dashboard/recent-reads.tsx` takes the dashboard's `events` +
  `readers`, sorts by `eventDate` (from #26's `history.ts`) descending, takes the
  top 5, and renders each with `ReadingEventCard` (`showBook`, not editable — this
  is a passive glance, not the edit flow). A "Ver historial completo" link points
  to `/leido` (Historial tab).

- **New `reader-trends.tsx` + pure helpers in `dashboard-stats.ts`.**
  `readerTrend(events, readerId)` returns `{ finished, activeMonths,
booksPerMonth, currentStreak, longestStreak, avgDaysBetween }` for one reader;
  the component calls it once per reader and renders two cards side by side (or
  stacked on narrow viewports).

- **Undefined vs. zero for missing data.** Pace/ritmo return `null` (not `0` or
  `NaN`) when not computable (0 events for pace-by-month; <2 events for
  days-between), and the UI shows "—" rather than a misleading zero.

## Risks / Trade-offs

- **Sparse data → streaks/pace feel noisy** → Acceptable for a personal library;
  the metrics are illustrative, not statistically rigorous. `null`-safe display
  avoids nonsense values.
- **Timezone/date-boundary edges for "current month"** → Use the same
  `YYYY-MM-DD`-slicing approach as #26's `eventDate`/`formatReadingDate` (local,
  no UTC shift) for consistency across the app.
- **Multiple readings in one book, or on the same day** → Both are already
  handled by #24-#26's model (multiple `ReadingEvent`s per book/reader); streaks
  and days-between naturally collapse same-day finishes to a 0-day gap, which is
  correct, not an error.

## Migration Plan

Additive UI. New `recent-reads.tsx` + `reader-trends.tsx` + new pure helpers in
`dashboard-stats.ts`; `Dashboard` gains two new sections using data it already
has. No data migration, no route changes. Ships on `feat/reading-trends` → PR →
deploy.

## Open Questions

- Exact visual treatment for streaks (badge vs. number vs. small flame-style
  icon) — resolve against the Claude Design handoff.
- Whether "días entre lecturas" needs a friendlier phrasing than a raw number —
  decide during design (e.g. "cada ~18 días").
