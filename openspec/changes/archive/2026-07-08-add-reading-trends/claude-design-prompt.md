# Claude Design prompt — Últimos leídos + tendencias por lector (#29)

Paste into Claude Design to design these two dashboard sections. Validate against
the base design system (M0 tokens) before integrating.

---

## Context

Mobile-first PWA, Spanish (es-AR). This extends the dashboard (`/`), which already
shows a KPI grid (#27), a "Leídos por lector" list, and composition charts (#28).
#29 adds two more sections: **"Últimos leídos"** (a recent-activity glance) and
**"Tendencias"** (per-reader pace/streak comparison).

Match the existing visual language (cards `rounded-2xl`, subtle borders; tokens
`background`, `foreground`, `muted-foreground`, `primary`, `secondary`, `accent`,
`card`, `border`, `muted`). Reuse the existing reading-event card (book cover +
title/authors + reader + date + rating/review, from the reading history feature)
for the recent-reads list — do not redesign that card, just place it here.

## Part A — "Últimos leídos" (recent reads)

1. **Populated** — a section titled "Últimos leídos" with a "Ver historial
   completo" link (top-right, → the full reading history), followed by up to 5
   reading-event cards (newest-first, across both readers), stacked vertically.
   This is **view-only** — no edit affordance here (editing lives in the full
   history).
2. **Empty** — no finished readings yet: a small centered empty state ("Todavía
   no hay lecturas terminadas.") inside a card, no list.

## Part B — "Tendencias" (per-reader trends)

Design **one trend card** (per reader), then the **two-up layout**.

3. **Trend card anatomy** — a header (avatar + reader name), then 3 compact
   stat tiles in a row: **"Libros/mes"** (a decimal number, e.g. "1.5"),
   **"Racha"** (current consecutive months with a reading, e.g. "3"; if the
   reader's longest streak ever is higher than the current one, show a small
   secondary hint like "récord 5"), and **"Ritmo"** (average days between
   reads, e.g. "18d"). Each tile: a small icon, the value (bold, large-ish),
   and the label beneath.
4. **Comparison layout** — both readers' trend cards side by side on wider
   screens, stacked on mobile (~360px) — the goal is easy visual comparison.
5. **Zero/unavailable stats** — a reader with no finished readings still shows
   their card (name + avatar), with **"—"** in place of any stat that isn't
   computable (0 books/month, no streak, no ritmo with fewer than 2 readings) —
   never a misleading "0" or blank tile.

## Requirements

- **Mobile-first**, touch is not required (both sections are read-only/glance
  views); trend card tiles stay legible at ~360px (3 tiles per card, compact).
- **Accessibility**: every stat value is real text, not conveyed by icon/color
  alone; the "Ver historial completo" link has a clear focus state; avatars are
  decorative (initials are also present as text, consistent with the rest of the
  app's per-reader rows).
- **Copy (es-AR, keep)**: "Últimos leídos", "Ver historial completo",
  "Todavía no hay lecturas terminadas.", "Tendencias", "Libros/mes", "Racha",
  "récord", "Ritmo".

## Out of scope

Editing a reading from either section (view-only — editing is the existing
history flow), a rolling/windowed time range (these stats are all-time), reading
goals (a later change), and a server-side aggregation endpoint (all data is
already loaded by the dashboard).
