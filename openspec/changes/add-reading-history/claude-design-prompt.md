# Claude Design prompt — Historial de lecturas (#26)

Paste into Claude Design to design the reading-history timeline. Validate against the
base design system (M0 tokens) before integrating.

---

## Context

Mobile-first PWA, Spanish (es-AR). This closes M4: after recording readings (#24) with
rating/review (#25), the reader needs to **see** them over time. The "Leído" section
becomes tabbed — **Registrar** (the existing mark-as-read flow) and **Historial** (new)
— and the book detail gains a per-book history.

Match the existing visual language (cards `rounded-2xl`, subtle borders; tokens
`background`, `foreground`, `muted-foreground`, `primary`, `secondary`, `accent`,
`card`, `border`, `input`, `ring`, `success`, `warning`). Reuse: the **star display**
(read-only, amber `warning`, `aria-label="4 de 5 estrellas"`) and the **dual-mode edit
sheet** from #25.

## Data note

Each timeline entry comes from a `ReadingEvent` that already carries a denormalized book
snapshot (title / authors / cover) — so a card can show the book with no extra lookups.

## Part A — Tabs on `/leido`

A two-tab switch at the top: **Registrar** | **Historial** (`role="tablist"` /
`role="tab"` with `aria-selected`, keyboard-navigable). Registrar keeps the existing
flow; Historial shows the timeline (Part B). Design the switch + both selected states.

## Part B — Global history timeline (~360px)

1. **Filters row** — compact controls: **Lector** (select of readers), **Calificación**
   (select 1–5 ★ / cualquiera), and a **date range** (Desde / Hasta). Plus a **Limpiar**
   affordance when any filter is active.
2. **Event card** — one per reading, newest-first: book cover thumb + title + authors,
   then reader name · date, read-only stars + `N / 5`, and the review text when present.
   The **active reader's own** entries expose an **"Editar"** (pencil) that opens the
   edit sheet; other entries are read-only.
3. **Loading** — a light "Cargando historial…" state.
4. **Empty (no readings yet)** — an empty state ("Todavía no hay lecturas" + hint to
   register one).
5. **No matches (filters exclude all)** — a "No hay lecturas para esos filtros" state with
   a **Limpiar filtros** action.

## Part C — Per-book history on the book detail

Below the existing per-reader "Lectura" summary, a **"Historial de lecturas"** section
that lists _all_ of the book's readings (both readers, re-reads) as reader-centric cards
(avatar + name · date, stars + `N / 5`, review) — shown when a book has more readings than
readers (i.e. a re-read exists). These are read-only (editing happens from the summary or
the global timeline).

## Requirements

- **Mobile-first**, single column, touch targets ≥44px; filters wrap comfortably on a
  phone.
- **Accessibility**: tabs use `role="tab"`/`aria-selected`; filter controls have real
  labels; read-only stars expose `aria-label="N de 5 estrellas"`; the timeline is a list;
  visible focus rings; rating conveyed by stars + value, not color alone.
- **Copy (es-AR, keep)**: "Registrar", "Historial", "Todos los lectores",
  "Cualquier calificación", "Desde", "Hasta", "Limpiar", "Todavía no hay lecturas",
  "No hay lecturas para esos filtros.", "Limpiar filtros", "Historial de lecturas",
  "Editar".

## Out of scope

Aggregate stats / KPIs / charts (the dashboard, M5 — this is the raw, browsable history),
CSV export and Goodreads (M7), and server-side filtering or pagination.
