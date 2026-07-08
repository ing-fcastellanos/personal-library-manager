## 1. Distribution helpers

- [x] 1.1 In `components/dashboard/dashboard-stats.ts`, add `topN(entries: { key: string; label: string; count: number }[], n = 6)`: sorts by count desc, keeps the top `n`, collapses the rest into a single `{ key: "otros", label: "Otros", count }` entry (omitted when nothing remains).
- [x] 1.2 Add `booksByCategory(books)`, `booksByAuthor(books)`, `booksByPublisher(books)`: group/count from `categoryKeys`/`authorKeys`/`publisher`, return `topN(...)` output. Reuse the label-resolution approach from `computeKpis` (first-seen label per key).
- [x] 1.3 Add `readingsByCategory(books, events)`: for each `finished` event, look up its book by `bookId`, count each of the book's `categoryKeys`; skip events whose book isn't found. Return `topN(...)`.
- [x] 1.4 Unit tests: `topN` (fewer than N, more than N with correct "Otros" sum, ties, empty); each distribution helper (grouping counts, multi-author/category books contribute to each key, empty input → empty array).

## 2. Bar chart component

- [x] 2.1 Create `components/dashboard/bar-chart.tsx`: horizontal SVG bars sized against the max value, each with a real text label + count (not color/length-only); an empty-state message when given no data.
- [x] 2.2 `bar-chart.test.tsx`: renders one bar per entry with label + value text; empty data shows the empty message; bar widths scale relative to the max.

## 3. Dashboard "Composición" section

- [x] 3.1 In `components/dashboard/dashboard.tsx`, compute the four distributions from the already-fetched `books`/`events` and render a "Composición" section (below KPI grid + per-reader list) with the four `BarChart`s: libros por categoría, por autor, por editorial, lecturas por categoría.
- [x] 3.2 Section renders only when the library is non-empty (consistent with the existing empty-library state); readings-by-category shows its own empty state when there are books but no finished readings.
- [x] 3.3 Update `dashboard.test.tsx`: the new section renders with real data; hidden when the library is empty; readings-by-category empty state when no finished readings.

## 4. Verify

- [x] 4.1 Run `npm test` (jsdom + node) green; typecheck + lint clean.

## 5. Claude Design handoff (#28)

- [x] 5.1 Generate the specific Claude Design prompt for the charts section: bar chart anatomy (label/value/bar), the four distributions, "Otros" bucket treatment, empty/loading states, mobile-first responsive, accessibility (contrast, text-not-color-only), M0 tokens.
- [x] 5.2 Produce the design in Claude Design and validate against the base design system.
- [x] 5.3 Integrate the handoff: map markup/code to Next components + tokens/styles.
- [x] 5.4 QA: visual responsive + accessibility pass.
