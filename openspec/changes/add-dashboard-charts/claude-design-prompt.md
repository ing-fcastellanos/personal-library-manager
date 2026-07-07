# Claude Design prompt — Dashboard charts (#28)

Paste into Claude Design to design the distribution-charts section. Validate against
the base design system (M0 tokens) before integrating.

---

## Context

Mobile-first PWA, Spanish (es-AR). This extends the dashboard (`/`, #27), which
already shows a KPI grid ("Libros", "Ejemplares", "Leídos", "Pendientes",
"Autores", "Editoriales") and a "Leídos por lector" list. #28 adds a
**"Composición"** section below that, with distribution bar charts of the
collection and of finished readings.

Match the existing visual language (cards `rounded-2xl`, subtle borders; tokens
`background`, `foreground`, `muted-foreground`, `primary`, `secondary`, `accent`,
`card`, `border`, `muted`). **No charting library** — bars are custom SVG
(`<rect>`/`<text>`), like the rest of the app's hand-rolled visual primitives
(star rating, barcode scanner). Reuse the `KpiCard`'s card shell
(`rounded-2xl border bg-card p-4`) as the chart card container.

## What this adds

Four horizontal bar-chart cards in a "Composición" section: **libros por
categoría**, **libros por autor**, **libros por editorial**, and **lecturas por
categoría** (of finished readings only). Each chart shows up to 6 bars; when a
distribution has more than 6 distinct entries, the rest are combined into a
7th **"Otros"** bar with their summed count. Data is computed from what the
dashboard already has loaded — no new fetch, no loading spinner beyond the
dashboard's existing one.

## Part A — Bar chart anatomy (design ALL states, one chart card)

1. **Default (populated)** — a card titled e.g. "Libros por categoría"; each row:
   a **label** (category/author/publisher name, truncated if long) on the left, a
   **horizontal bar** whose length is proportional to its count (background track
   - filled bar), and the **count** as a number on the right. The bar itself uses
     `primary`; the track uses `muted`.
2. **"Otros" bar** — visually the same row shape; consider a subtly different
   treatment (e.g. `secondary` fill) to signal it's an aggregate, though it's not
   required — your call for the more polished feel.
3. **Empty** — no data at all (e.g. "lecturas por categoría" with zero finished
   readings): a short centered message inside the card
   ("Todavía no hay lecturas terminadas.") instead of an empty bar list.
4. **Compact card** — since 4 charts stack on mobile, keep each chart's row
   height compact (~28px) so the whole section doesn't dominate the screen; on
   larger viewports the 4 cards can sit 2-up in a grid.

## Part B — Section layout

5. **"Composición" section** — an uppercase eyebrow label like the existing
   "Leídos por lector", followed by the 4 chart cards. Order: libros por
   categoría, por autor, por editorial, lecturas por categoría. 1 column on
   mobile (~360px), 2 columns from `sm:` up.

## Requirements

- **Mobile-first**, chart cards readable at ~360px width without horizontal
  scrolling; touch is not required (charts are read-only, no interaction).
- **Accessibility**: every bar's label and count are **real text** (SVG
  `<text>` or adjacent HTML), never conveyed by bar length/color alone — this
  matters given the app already commits to that pattern (e.g. star ratings show
  "N de 5 estrellas" as text). The chart SVG should have an `aria-label`
  summarizing what it shows (e.g. the chart title). Sufficient contrast between
  the bar fill and its track in both light and dark themes.
- **Copy (es-AR, keep)**: "Composición", "Libros por categoría", "Libros por
  autor", "Libros por editorial", "Lecturas por categoría", "Otros", "Todavía no
  hay lecturas terminadas.".

## Out of scope

A charting library / canvas-based charts (custom SVG only), a server-side
aggregation endpoint, time-series or trend charts (a later change), reading
goals (a later change), drill-down/filtering from a chart into the catalog, and
a separate "género" axis (categoría and género are the same underlying data —
don't design a 5th chart for it).
