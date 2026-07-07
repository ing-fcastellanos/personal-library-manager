# Claude Design prompt — Dashboard layout + KPI cards (#27)

Paste into Claude Design to design the dashboard. Validate against the base design
system (M0 tokens) before integrating.

---

## Context

Mobile-first PWA, Spanish (es-AR). This is the **home screen** (`/`, first item in
the bottom nav / sidebar). Today it's a static placeholder with "—" KPI cards; #27
replaces it with the real library overview — the foundation later M5 widgets
(charts #28, recent reads/trends #29, reading goals #30) will hang off.

Match the existing visual language (cards `rounded-2xl`, subtle borders; tokens
`background`, `foreground`, `muted-foreground`, `primary`, `secondary`, `accent`,
`card`, `border`, `success`, `warning`). Reuse: `Avatar`/`AvatarFallback` (reader
initials, as in book detail's per-reader rows), `EmptyState`, `Skeleton`.

## What this screen shows

A grid of **KPI cards** (icon + label + value) summarizing the collection: total
books, total copies, books read vs. pending, and unique authors and publishers.
Below the grid, a **"Leídos por lector"** list — one row per reader with their
finished-book count (an avatar, name, count). All numbers are real (no
mock/placeholder), formatted with thousands separators (es-AR).

## Part A — KPI card anatomy (design the component, then the grid)

1. **Default** — label (small, muted) + icon (top-right, in an accent-tinted
   badge) + a large bold value below.
2. **Loading** — the value area is a skeleton; label/icon can already be visible or
   also skeletal — your call, keep it lightweight.
3. Design the **grid**: 6 cards — Libros, Ejemplares, Leídos, Pendientes, Autores,
   Editoriales. Responsive: 2 columns on mobile (~360px), scaling up on
   tablet/desktop. Suggest icons per KPI (book stack, layers/copies, check,
   hourglass, people, building).

## Part B — Per-reader breakdown

4. **List** — a card containing one row per reader: avatar (initial) + name +
   their finished-book count, with a small "leídos" label. Rows separated by a
   thin divider; last row has no divider.

## Part C — Page-level states

5. **Loading (initial)** — the KPI grid shows loading cards (Part A.2) while the
   parallel fetch resolves; no per-reader list yet.
6. **Empty library** — no books at all: a friendly empty state ("Tu biblioteca
   está vacía" + a short invite) and a primary **"Agregar libro"** action
   (→ `/agregar`) instead of a grid of zeros.
7. **Populated** — the full grid + per-reader list with real, non-zero-ish data
   (use varied sample numbers, not all equal, to show scale).

## Requirements

- **Mobile-first**, single column of sections, touch targets ≥44px; the grid
  reflows cleanly from 2 columns (mobile) up.
- **Accessibility**: KPI values are text (not just visual size/color) so they're
  read correctly; icons are decorative (`aria-hidden`); visible focus rings on the
  "Agregar libro" action; the per-reader list is a simple readable list (no need
  for exotic ARIA — it's static data, not interactive).
- **Copy (es-AR, keep)**: "Dashboard", "Un vistazo a tu biblioteca.", "Libros",
  "Ejemplares", "Leídos", "Pendientes", "Autores", "Editoriales", "Leídos por
  lector", "leídos", "Tu biblioteca está vacía", "Agregá tu primer libro y acá van
  a aparecer tus indicadores.", "Agregar libro".

## Out of scope

Charts / visual distributions (a later change), "recent reads" and per-reader time
trends (a later change), annual reading goals (a later change), and any
server-side aggregation endpoint — all numbers come from data already loaded on
this screen.
