## 1. Trend helpers

- [x] 1.1 In `components/dashboard/dashboard-stats.ts`, add `recentReads(events, n = 5)`: `finished` events sorted newest-first by `eventDate` (reuse `eventDate` from `components/reading/history.ts`), sliced to `n`.
- [x] 1.2 Add `readerTrend(events, readerId)`: filters to that reader's `finished` events; returns `{ finished, activeMonths, booksPerMonth, currentStreak, longestStreak, avgDaysBetween }`. `booksPerMonth`/`avgDaysBetween` are `null` when not computable (0 events / <2 events respectively).
- [x] 1.3 Streak logic: derive the set of active `YYYY-MM` months from finished dates; current streak walks back from the present month while months are active; longest streak scans the full active-month set for the longest consecutive run.
- [x] 1.4 Unit tests: `recentReads` (ordering, slicing, empty); `readerTrend` (books/month with multiple active months, current streak incl. a broken streak = 0, longest streak differing from current, avgDaysBetween with 2+ events, null cases for 0/1 events, same-day finishes).

## 2. Recent reads widget

- [x] 2.1 Create `components/dashboard/recent-reads.tsx`: renders `recentReads(events)` via `ReadingEventCard` (from `components/reading/reading-event-card.tsx`, non-editable), a "Ver historial completo" link to `/leido`, and an empty state.
- [x] 2.2 `recent-reads.test.tsx`: renders up to 5 cards newest-first; link present; empty state with no finished readings.

## 3. Reader trends widget

- [x] 3.1 Create `components/dashboard/reader-trends.tsx`: one stat card per reader (avatar/name, libros/mes, racha actual, racha más larga, ritmo), laid out side by side (stacked on narrow viewports) for direct comparison; "—" for null stats.
- [x] 3.2 `reader-trends.test.tsx`: renders both readers' stats; a reader with zero finished readings still appears with "—" placeholders, not omitted.

## 4. Dashboard integration

- [x] 4.1 In `components/dashboard/dashboard.tsx`, render "Últimos leídos" (RecentReads) and "Tendencias" (ReaderTrends) sections below the existing Composición section, using the already-fetched `events`/`readers`.
- [x] 4.2 Update `dashboard.test.tsx`: both new sections render with real data; hidden/empty-consistent when the library or reading history is empty.

## 5. Verify

- [x] 5.1 Run `npm test` (jsdom + node) green; typecheck + lint clean.

## 6. Claude Design handoff (#29)

- [x] 6.1 Generate the specific Claude Design prompt for "últimos leídos" + reader trends: recent-reads card list, per-reader trend card anatomy (pace/streak/ritmo), comparison layout, empty/zero states, mobile-first responsive, accessibility, M0 tokens.
- [x] 6.2 Produce the design in Claude Design and validate against the base design system.
- [x] 6.3 Integrate the handoff: map markup/code to Next components + tokens/styles.
- [ ] 6.4 QA: visual responsive + accessibility pass.
