# Claude Design prompt — Export CSV + Goodreads (#34)

Paste into Claude Design to design the export tab, the pending-to-publish
toggle + publish link, and the book detail's Goodreads button. Validate
against the base design system (M0 tokens) before integrating.

---

## Context

Mobile-first PWA, Spanish (es-AR). Goodreads' write API has been dead since
2020 (ADR-0005) — the app never publishes automatically. This adds a
Goodreads/StoryGraph-compatible CSV export and manual-publish links, so the
reader finishes the job themselves. Match the existing visual language
(cards `rounded-2xl`, subtle borders; tokens `background`, `foreground`,
`muted-foreground`, `primary`, `card`, `border`, `muted`). Reuse the
**reading-event card** shell from #26 (cover/title/authors, reader + date,
rating/review) as the visual base for rows in both Historial and this new
Exportar tab — this doesn't redesign that card, it adds to it.

## Part A — A third "Leído" tab: Exportar

1. `/leido` already has two tabs, **Registrar** and **Historial**. Design a
   third, **Exportar**, in the same tablist style (pill segmented control),
   with a download icon.
2. The Exportar panel: the same reader-select + from/to date-range filter
   controls already used by Historial (identical style — this is a shared
   component, not a new one), plus a primary **"Descargar CSV"** button
   (disabled/muted when the current filter set matches zero readings).
3. Below the filters, the filtered readings list — the same reading-event
   card as Historial, one per row.
4. Empty state (filters match nothing): a small centered message, "No hay
   lecturas para exportar con esos filtros." — no icon needed beyond the
   existing dashed/muted empty-state pattern used elsewhere.

## Part B — Pending-to-publish toggle + publish link (on the card)

5. Add a small footer row to the reading-event card (a thin top divider,
   like the existing rating/review section's spacing) — **only rendered on
   the active reader's own editable readings** (same gate as the existing
   edit-pencil affordance):
   - A checkbox + label **"Pendiente de publicar"** (manual, informational
     only — toggling it just records the reader's own reminder, nothing is
     sent anywhere).
   - When the active reader has a Goodreads account configured (M1): a text
     link **"Publicar en Goodreads"** next to it (opens in a new tab).
6. Design both the "own reading, no Goodreads configured" state (checkbox
   only, no link) and the "own reading, Goodreads configured" state
   (checkbox + link) — and confirm neither shows on another reader's
   reading (view-only, same as today).

## Part C — "Ver en Goodreads" on the book detail

7. On the book detail page's header action row (next to the existing
   **"Editar"** button), add a secondary/outline button **"Ver en
   Goodreads"** — always visible, no session or account requirement (it's a
   lookup, not a publish action). Same button height/style family as
   "Editar", just the outline variant so "Editar" stays the visually primary
   action.

## Requirements

- **Mobile-first**, touch targets ≥44px on the checkbox, buttons, and tab.
- **Accessibility**: the checkbox has a real, associated label ("Pendiente
  de publicar"), not an icon-only toggle; the download button's disabled
  state is conveyed by more than color (also disabled semantics /
  `aria-disabled`); both Goodreads links have accessible names describing
  the action ("Publicar en Goodreads" / "Ver en Goodreads"), not just
  "Goodreads"; visible focus rings on all interactive elements; the CSV
  filters share the exact same accessible labels ("Filtrar por lector",
  "Desde", "Hasta") as Historial's, since they're the same control reused.
- **Copy (es-AR, keep)**: "Exportar", "Descargar CSV", "No hay lecturas para
  exportar con esos filtros.", "Pendiente de publicar", "Publicar en
  Goodreads", "Ver en Goodreads".

## Out of scope

Any actual automated publishing (ADR-0005 — explicitly rejected), a
published/history audit trail beyond the single boolean, PDF or any format
besides CSV, full backup/restore (#36, separate change), import (#35,
separate change).
