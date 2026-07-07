## 1. Aggregation helpers

- [x] 1.1 Create `components/dashboard/dashboard-stats.ts`: pure `computeKpis(books, copies, events, readers)` → `{ books, copies, read, pending, authors, publishers, categories, perReader: { readerId, name, finished }[] }`. Read = distinct `bookId` with a `finished` event; uniques de-dupe `authorKeys`/`publisher`/`categoryKeys`.
- [x] 1.2 `dashboard-stats.test.ts`: counts; read/pending (read+pending=total); uniques dedupe; per-reader finished incl. zero; empty inputs → all zeros.

## 2. KPI card

- [x] 2.1 Create `components/dashboard/kpi-card.tsx`: reusable card (icon + label + value) with `Intl.NumberFormat("es-AR")`; a loading variant (skeleton).
- [x] 2.2 `kpi-card.test.tsx`: renders label + formatted value; loading shows a skeleton not the value.

## 3. Dashboard

- [x] 3.1 Create `components/dashboard/dashboard.tsx`: one `Promise.all` fetch of `/api/books`, `/api/copies`, `/api/reading-events`, `/api/readers` with `okJson` + `Array.isArray` coercion; compute via `computeKpis`.
- [x] 3.2 Render the KPI grid (Libros, Ejemplares, Leídos, Pendientes, Autores, Editoriales) responsive, plus a "Por lector" breakdown.
- [x] 3.3 States: loading (skeleton cards) and empty (no books → invite to add); resilient to a failing source.
- [x] 3.4 Wire `app/page.tsx` to render `<Dashboard />` (client).
- [x] 3.5 `dashboard.test.tsx`: renders KPIs from mocked fetches; loading state; empty state; a failing source still renders.

## 4. Verify

- [x] 4.1 Run `npm test` (jsdom + node) green; typecheck + lint clean.

## 5. Claude Design handoff (#27)

- [x] 5.1 Generate the specific Claude Design prompt for the dashboard layout + KPI cards: visual hierarchy, card anatomy, per-reader breakdown, loading/empty states, mobile-first responsive, accessibility, M0 tokens.
- [x] 5.2 Produce the design in Claude Design and validate against the base design system.
- [x] 5.3 Integrate the handoff: map markup/code to Next components + tokens/styles.
- [ ] 5.4 QA: visual responsive + accessibility pass.
