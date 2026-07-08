## Context

#27 shipped the dashboard's KPI grid + per-reader list, computed client-side by
`dashboard-stats.ts` (`computeKpis`) from data the `Dashboard` component already
fetches in one parallel call: `books`, `copies`, `events`, `readers`. #28 adds
_distribution_ views on top of that same data — no new fetches needed. No
charting library is installed; the project's established pattern for visual
primitives (star rating, ISBN scanner UI) is hand-rolled SVG over the M0 design
tokens rather than adding a dependency — confirmed as the direction for the bar
chart too.

## Goals / Non-Goals

**Goals:**

- Distribution charts: books by category, by author, by publisher; readings by
  category — computed from already-loaded data.
- A single reusable, accessible SVG bar chart component.
- Top-6 + "Otros" bucketing so charts stay readable at any library size.

**Non-Goals:**

- A charting library dependency (Recharts etc.) — explicitly rejected in favor of
  custom SVG, matching the codebase's existing approach.
- A server-side aggregation endpoint — data volume doesn't warrant it yet.
- Time-series / trend charts (#29), reading goals (#30), drill-down from a chart
  into the catalog.
- A separate "genre" axis — the data model has one field (`categoryKeys`); género
  and categoría are treated as the same axis (see Decisions).

## Decisions

- **Custom SVG bar chart, not a library (Decision 1).** `bar-chart.tsx` renders
  horizontal `<rect>` bars sized by a linear scale against the top value, with
  the label and count as real `<text>`/adjacent DOM text — not canvas, not an
  external lib. _Alternative:_ Recharts — rejected: ~90kb+, "use client"
  everywhere it's used, and overkill for 4 simple bar lists; the project already
  favors small hand-rolled SVG components over charting dependencies.

- **Categoría = género (Decision 2).** `Book` has only `categoryKeys`; there is no
  separate genre field anywhere in the data model. The issue's two mentions are
  read as regional synonyms for the same axis, not a second one to build.
  _Alternative:_ treat them as distinct and leave "género" unimplemented pending a
  future field — rejected as it would ship a visibly broken/missing chart; better
  to be explicit that they're the same data now.

- **Four distributions (Decision 3).** Books-by-category, books-by-author,
  books-by-publisher (all from `books`), and readings-by-category (join
  `finished` events → `bookId` → the book's `categoryKeys`). Extracted as pure
  helpers in `dashboard-stats.ts`: a generic `topN(counts, n)` bucketer plus
  small mapping functions per axis, reusing patterns already in that file
  (`authorKeys`/`categoryKeys`/`publisher` de-dup logic from `computeKpis`).

- **Top 6 + "Otros" (Decision 4).** A fixed top-N of 6 balances readability
  against information loss for a personal library's scale; the remainder sums
  into one "Otros" bar. _Alternative:_ a count/percentage threshold — rejected
  for now as unnecessary complexity; fixed N is simpler and the design can tune
  the number if the handoff suggests otherwise.

- **New dashboard section, no new route/tab (Decision 5).** A "Composición"
  section renders below the KPI grid and per-reader list on `/`, reusing the
  data `Dashboard` already fetches — no new fetch, no new page. _Alternative:_ a
  separate tab or route — rejected; charts are passive reading of the same
  "vistazo a la biblioteca," unlike #26's tabs which separated two distinct
  actions (register vs. browse).

- **No aggregation endpoint (Decision 6).** Distributions computed client-side
  from `books`/`events` already in memory, consistent with #27's approach.

## Risks / Trade-offs

- **Many-author books skew "by author"** → A book with multiple authors
  contributes to each author's count (same behavior as the existing unique-author
  KPI in #27); acceptable, consistent with how the KPI already counts.
- **"Otros" hides detail** → Intentional trade-off for readability; the bucket
  still shows an accurate combined count, nothing is silently dropped from the
  total.
- **SVG accessibility** → Mitigated by real text labels/values per bar (not
  relying on bar length/color alone), per the added a11y requirement.
- **Readings-by-category requires a join** → Done in `dashboard-stats.ts` by
  looking up each finished event's `bookId` in the `books` list already in
  memory (no extra fetch); a finished event whose book isn't found is skipped.

## Migration Plan

Additive UI. New `bar-chart.tsx` + new pure helpers in `dashboard-stats.ts`; the
`Dashboard` component gains a new section using data it already has. No data
migration, no route changes. Ships on `feat/dashboard-charts` → PR → deploy.

## Open Questions

- Exact chart visual treatment (bar color per axis vs. uniform, spacing, value
  placement) — resolve against the Claude Design handoff.
- Whether "Otros" needs its own distinct visual treatment (e.g. muted) vs. just
  another bar — decide during design.
