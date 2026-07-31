# Claude Design prompt — Seguimiento de series (#38)

Paste into Claude Design to design the series-tracking flow. Validate against the base
design system (M0 tokens) and the style-guide primitives before integrating.

---

## Context

Mobile-first PWA, Spanish (es-AR), light + dark via design tokens (ADR-0010). A
two-reader household library that already tracks what it **owns** (copies), **reads**
(reading events), **lends** (loans, #39), and **wants** (wishlist, #37). This feature adds:
knowing that a book is volume 2 of a saga, and seeing which volumes are still missing.

Key facts that shape the UI:

- A **series** is curated **by hand** — no auto-detection from title patterns or external
  metadata. A household member types it in, the same trust level as a wishlist item.
- A series is an **ordered list of volumes**. Each volume is either **owned** (linked to a
  real book) or **missing** (just a title/authors/ISBN snapshot, no book yet).
- There is **no dedicated series-detail route** — everything happens in reusable dialogs,
  opened from the book detail or a settings index. Design the dialogs, not a page.
- A missing volume's card can turn straight into a wishlist item (reuses the existing
  "Agregar a deseos" action/copy).

## Existing shell + primitives (reuse, don't reinvent)

- App shell: mobile header + fixed bottom nav (6 items: Dashboard, Agregar, Deseos, Leído,
  Catálogo, Ajustes — **no 7th item for this feature either**); desktop sidebar. Content is
  `Card`-based lists.
- Primitives (style-guide): `Card`, `Badge`, `Button`, `EmptyState`, `Input`, `Label`,
  `Dialog`, `Avatar`, `Toast`, `Skeleton`. Icons: lucide.

## Where this lives (already decided — design around it, not the decision itself)

- **Book detail** (`/libros/[id]`): if the book is a volume of a tracked series, a "Serie"
  section shows the full volume list inline (not behind a dialog) with each volume's
  status; if not, an action opens a small dialog to add it to a new or existing series.
- **A shared "view/edit series" dialog**, opened from the book detail's section (an
  "Editar" action) and from a settings index (`/ajustes/series`, a plain list of every
  tracked series with its completion — a settings sub-page, not a nav destination).
- **Catalog browse** (`/catalogo`): a small "Serie" badge on any result that's part of a
  tracked series — **informational only**, same visual family as the existing "prestado"
  badge, not a click target of its own (design already ruled out nesting an interactive
  control inside the result's link).

## Volume states (design these)

```
 FALTA ──(el hogar consigue el libro y lo vincula)──▶ TENÉS
```

Only two states — no "leído"/"prestado" cross-state here (those already show on the book's
own detail). Keep this binary and calm: a missing volume looks like a real card (title,
authors, a muted/placeholder cover), not an error state.

## Screen A — Book detail: inline "Serie" section

Below "Ejemplares", when the book belongs to a series:

- Section header: "Serie · <nombre de la saga>", an "Editar" action.
- Every volume, in order, as a row: position number, title, authors, and either a
  **"Tenés"** badge (owned) or a **"Agregar a deseos"** button (missing) — reuse the
  wishlist add button's exact look (icon + label), since it's the same component.
- The row for *this* book is subtly highlighted ("este libro").

When the book belongs to **no** series: a quiet prompt + a "Agregar a una serie" action
(opens Screen C).

## Screen B — Series dialog: view + edit

Opened from the book detail's "Editar" or from the settings index.

- **View**: series name as the dialog title, a completion line ("2 de 3 tomos" / "Completa
  · 3 tomos"), then the same volume-row list as Screen A. An "Editar" button switches modes.
- **Edit**: the name becomes an editable field; each volume row gets move-up/move-down and
  remove controls (no drag-and-drop — this app doesn't use that pattern elsewhere); a small
  inline form to add a new missing volume (title, autores, ISBN — all before it's ever
  linked to a real book); Guardar/Cancelar actions.

## Screen C — Add this book to a series

A small two-step dialog opened from the book detail when the book has no series yet:

1. Pick a target: "Crear serie nueva" or one of the household's existing series (a plain
   button list, like the shelf-picker used elsewhere in this app — not a dropdown).
2. Confirm: a name field (only for a new series) and the volume's position number, then
   "Agregar".

## Screen D — `/ajustes/series`: every tracked series

A simple settings sub-page (reached from a "Series" card on `/ajustes`, not the bottom
nav): one row per series — an icon, the name, and its completion — opening Screen B for
that row. An empty state when nothing's tracked yet, pointing back at "start from a book's
detail."

## Requirements

- **Mobile-first**; touch targets ≥44px.
- **Light + dark** from tokens only.
- **Accessibility**: every action has a clear accessible name ("Agregar «<título>» a
  deseos", "Mover «<título>» arriba/abajo", "Quitar «<título>» de la serie"); the
  move/remove controls in edit mode are keyboard-operable; the "este libro" highlight isn't
  color-only.
- **Calm, derived tone**: nothing about a volume's status is a manual toggle except linking
  a `bookId` — "Tenés" simply follows from that.

## Copy (es-AR — keep)

"Serie", "Editar", "Tenés", "Agregar a deseos", "Este libro no forma parte de ninguna serie
todavía", "Agregar a una serie", "Crear serie nueva", "Nombre de la serie", "Posición de
«<título>» en la serie", "Agregar tomo faltante", "Título", "Autor(es), separados por
coma", "ISBN (opcional)", "Guardar", "Cancelar", "Completa · N tomos", "N de M tomos",
"Todavía no armaste ninguna serie", "Series", "Ver mis series".

## Out of scope

- Auto-detecting series/volumes from title patterns or an external metadata source.
- A dedicated `/series/[id]` route.
- Cross-checking a "missing" volume against ISBN databases before allowing it to be added.
