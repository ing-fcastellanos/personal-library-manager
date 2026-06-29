# Claude Design prompt — Import summary (alta por IA) (#22)

Paste into Claude Design to design the AI import summary screen. Validate against the
base design system (M0 tokens) before integrating.

---

## Context

Mobile-first PWA, Spanish (es-AR). This is the **final screen of any AI add flow** —
both "Por foto" (single book, #20) and "Por estante" (batch, #21) end here. The user
arrives after books were processed; this screen tells them **what happened** and lets
them **fix it**. Match the existing visual language (cards `rounded-2xl`, subtle
borders; tokens `background`, `foreground`, `muted-foreground`, `primary`, `accent`,
`card`, `border`, `ring`, `secondary`, `destructive`, `success`, `warning`/`warning-bg`).
Components available: Card, Button, Input, Label, Select, Badge, Skeleton, EmptyState.

## What this screen does

Show the outcome of the import, **grouped by result**, with a summary header and
**per-item quick actions**. The list is persisted for the session (survives a reload and
a round-trip to a book's edit screen). Outcomes fall into five groups, shown in this
order, omitting any empty group:

1. **Agregados** (`added`) — new book + first copy created. Actions: **Editar** (pencil →
   the book's edit screen) and **Deshacer** (undo, removes copy then book).
2. **Agregados como copia** (`added_as_copy`) — a copy added to a book already in the
   library. Action: **Deshacer** (removes the copy).
3. **Fallidos** (`failed`) — intake errored; the candidate was retained. Action:
   **Reintentar** (retry the add).
4. **Duplicados omitidos** (`skipped_duplicate`) — a duplicate the user chose to skip.
   No action (informational).
5. **Descartados** (`discarded`) — the user discarded it during review, or undid it here.
   No action (informational).

## Screens / states (mobile-first, ~360px)

1. **Summary (populated)**
   - **Header card**: a success check in a circle, "**N de M agregados**" (N = added +
     added_as_copy, M = total), one muted subline "Resumen de la importación.".
   - **Grouped sections**: each non-empty group is a section with a small **colored label
     row** (icon + UPPERCASE label + "· count") and a list of item rows below it.
   - **Item row**: small book-cover thumb (gradient placeholder when no cover), truncated
     title, and the group's action(s) on the right as icon buttons (≥44px touch). A row
     shows a small spinner in place of its actions while its action is in flight.
   - **Footer**: a full-width primary "**Ver catálogo**" (grid icon).
2. **Empty** — when there is nothing to show (no import this session): an EmptyState
   (package-open icon, "Nada que mostrar", subline "Acá aparece el resumen después de
   agregar libros por IA.", primary "Agregar libros").
3. **Not signed in** — EmptyState prompting sign-in (handled by the route's write-gate;
   design the populated + empty states).

## Per-group visual treatment

- `added` → success tint (check icon).
- `added_as_copy` → primary tint (copy icon).
- `failed` → destructive tint (alert icon); the **Reintentar** action is a small labeled
  button (icon + text), not just an icon.
- `skipped_duplicate` → muted (copy icon).
- `discarded` → muted (undo icon).

## Requirements

- **Mobile-first**, single column, touch targets ≥44px; the primary action reachable
  with a thumb.
- **Accessibility**: each action button has an `aria-label` naming the book (e.g.
  "Deshacer Dune", "Reintentar Oops", "Editar Dune"); group labels carry text + icon
  (never color-only); the in-flight spinner conveys busy state; visible focus rings;
  cover thumbs are decorative (`alt=""`).
- **Copy (es-AR, keep)**: "Resumen", "N de M agregados", "Resumen de la importación.",
  "Agregados", "Agregados como copia", "Fallidos", "Duplicados omitidos", "Descartados",
  "Editar", "Deshacer", "Reintentar", "Ver catálogo", "Nada que mostrar", "Agregar libros".

## Out of scope

No "undo all" / bulk actions (undo is per-item), no permanent import history, no
filtering/sorting controls, no pagination, no per-item detail expansion.
