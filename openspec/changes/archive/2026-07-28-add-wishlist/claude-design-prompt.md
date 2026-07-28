# Claude Design prompt — Wishlist / "quiero leer" (#37)

Paste into Claude Design to design the two wishlist screens. Validate against the
base design system (M0 tokens) and the style-guide primitives before integrating.

---

## Context

Mobile-first PWA, Spanish (es-AR), light + dark via design tokens (ADR-0010). This is
a **two-reader household** library app. It already tracks what the household **owns**
(copies on shelves) and what each reader **has read** (a reading log). This feature
adds the missing third thing: what a reader **wants**.

Crucially there are **two views over one list**, and they must feel distinct:

- **"Quiero leer"** — per **reader**. The books *this* reader intends to read next.
- **"Quiero comprar"** — per **household**. The books nobody owns yet that someone
  wants — the shared shopping list.

They come from the same underlying wishlist, filtered differently. A book leaves
"comprar" automatically once the household owns a copy, and leaves "quiero leer"
automatically once the reader finishes (or abandons) it — **the reader never ticks
anything off manually.** The design should make that self-maintaining quality feel
calm, not like a to-do list that nags.

## Existing shell + primitives (reuse, don't reinvent)

- App shell: mobile header + fixed **bottom nav (currently 5 items)**; desktop
  persistent sidebar. Content is `Card`-based lists, like `/leido` and `/catalogo`.
- Available primitives (style-guide): `Card`, `Badge`, `Button`, `EmptyState`,
  `Select`, `Dialog`, `Avatar` (readers have a `displayColor` + optional avatar),
  `DropdownMenu`, `Tabs`, `Toast`, `Skeleton`. Icons: lucide.
- Every reader has a **color + avatar** — use them to show *who* wants a book.

## Decision to make first — how the two views fit the nav

The shell has 5 nav items today; adding two more crowds mobile badly. **Preferred
direction:** a single nav entry (e.g. **"Deseos"**, heart/bookmark icon) landing on a
screen with a **`Tabs` toggle: `Quiero leer` · `Comprar`**. This keeps the shell at 6
items and co-locates the two views that share a list. Design that primary path, but
show how it degrades if the team instead wants two separate destinations. Routes are
`/deseos` and `/comprar` regardless of how they're surfaced.

## Screen A — "Quiero leer" (reader-scoped)

A list of the active reader's wanted books, highest priority first.

Each **item card** shows:
- cover thumbnail (may be missing → graceful placeholder), **title**, **author(s)**.
- a **priority** indicator (`high` / `normal` / `low`) that is also editable inline
  (a small `Select` or segmented control) — normal is the default and should be the
  quietest visually; high should read as "get to this".
- an **"En casa"** `Badge` when the household already owns a copy (you want to read
  something you already have — legitimate, just flag it so the reader knows it's on a
  shelf, not to be bought).
- actions: **Marcar leído** (hands off to the existing mark-as-read flow), and a
  quieter **Descartar** (dismiss — "ya no lo quiero", no read, no buy). Dismiss should
  feel low-stakes and reversible-ish, not a destructive delete.

**Empty state** (`EmptyState`): warm, first-run friendly — "Todavía no querés leer
nada 👀" with a primary action to add a wish. Not an error tone.

## Screen B — "Quiero comprar" (household-scoped)

The shared shopping list: wanted books nobody owns yet, **grouped by book** so a title
wanted by both readers appears **once**, highest priority first.

Each **grouped card** shows:
- cover, **title**, **author(s)**.
- **who wants it**: the avatars/initials of the readers wanting it (1 or both). A book
  both readers want should feel like it deserves to be bought first.
- group **priority** (the highest among the readers who want it).
- action: **Lo compré** → this creates the owned copy (and the catalog book if it
  wasn't catalogued yet) and the card **disappears from this list**. A brief success
  toast; no multi-step wizard. Optionally let the reader pick a shelf at this moment,
  but keep it optional — an unshelved copy is valid.

**Empty state**: "Nada por comprar 🎉 — todo lo que quieren leer ya está en casa."

## The "already owned" warning (shared add flow)

Adding a wish reuses the app's existing add surfaces (manual / ISBN-scan / photo-AI /
from a catalogued book's detail). The **one new element** in those flows is a
non-blocking warning shown *when the wanted book is already on a shelf*: e.g. an inline
notice or small `Dialog` — "Ya tenés este libro en casa (2 ejemplares). ¿Agregarlo a
deseos igual?" with **Agregar igual** / **Cancelar**. It informs, it does **not** block.

## Requirements

- **Mobile-first**; touch targets ≥44px; the priority control and the two card actions
  must be comfortably tappable without accidental dismiss.
- **Light + dark** from tokens only — no ad-hoc colors. Priority and the "En casa"
  badge must stay legible and distinguishable in both themes and for color-blind users
  (don't rely on color alone — pair with icon/label/weight).
- **Accessibility**: the tab toggle is keyboard operable with visible focus; each
  card's actions have clear accessible names ("Marcar "<título>" como leído",
  "Descartar "<título>" de deseos", "Marcar "<título>" como comprado"); the
  reader-avatars group on the buy list has a text alternative ("Lo quieren: Frank,
  Sofía").
- **Self-maintaining tone**: nothing should look like an unfinished chore. Prefer a
  quiet, browsable feel over checkboxes/progress.

## Copy (es-AR — keep)

"Deseos", "Quiero leer", "Comprar", "En casa", "Marcar leído", "Descartar",
"Lo compré", "Agregar a deseos", "Ya tenés este libro en casa", "Agregar igual",
"Nada por comprar 🎉", "Prioridad" (Alta / Normal / Baja), "Lo quieren:".

## Out of scope

- Sharing/publishing a wishlist outside the household; price tracking or store links; a
  "borrowed, not bought" path (this household always buys what it wants to read).
- Any manual "mark as acquired/read" bookkeeping beyond the two card actions above —
  both lists derive their membership, so don't design status pickers for "acquired" or
  "read" states on the item itself.
- Reordering by drag; priority is the only ordering control.
