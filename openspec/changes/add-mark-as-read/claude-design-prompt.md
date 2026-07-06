# Claude Design prompt — Marcar como leído (#24)

Paste into Claude Design to design the "mark a book as finished reading" flow. Validate
against the base design system (M0 tokens) before integrating.

---

## Context

Mobile-first PWA, Spanish (es-AR). This is the **"Leído"** section (its own route `/leido`,
already in the bottom nav / sidebar as the 3rd item, icon = book-check). Match the existing
visual language (cards `rounded-2xl`, subtle borders; tokens `background`, `foreground`,
`muted-foreground`, `primary`, `secondary`, `accent`, `card`, `border`, `input`, `ring`,
`success`, `destructive`). Components available: Card, Button, Input, Label, Select, Badge,
Skeleton, EmptyState, Dialog/Toast, Avatar.

Reuse patterns already shipped: the **2×2 mode selector** (radiogroup, active cell =
`border-primary bg-accent`) from "Agregar", the **photo capture** card + "Tomar foto" from
"Agregar por foto", and the **in-viewport bottom sheet** (labelled dialog) from "Agregar por
código".

## What this flow does

The reader records that they **finished reading** a book. They first **find the book** —
either by **searching the catalog** or by **taking a photo** (AI identifies it) — and then
**confirm** a short form (finish date, optional start date, and which copy) attributed to the
active reader. Only books **already in the library** can be marked; a photo that identifies a
book not in the library routes the reader to "Agregar" first. **Rating and review are NOT part
of this flow** (a later change).

## Part A — Method selector (~360px)

A **2×2-style selector with two options** (mirror the Agregar grid, just two cells):

1. **Buscar** — icon = search.
2. **Por foto** — icon = camera.

Show the active/selected state. (Two cells side by side is fine; keep the same cell styling as
Agregar for consistency.)

## Part B — Screen states (mobile-first, ~360px)

**Search method**

1. **Search** — a search `Input` ("Buscá por título o autor") + a results list. Each result is
   a tappable row: small cover thumb + title + author(s). Selecting a row opens the confirm
   sheet (Part C).
2. **Search empty** — "No encontramos libros en tu biblioteca para esa búsqueda."
3. **Search loading** — a lightweight "Buscando…" indicator.

**Photo method** 4. **Capture** — the dashed capture card + "Tomar foto" (reuse the Agregar-por-foto capture
visual), subtitle "La IA lo identifica y lo busca en tu biblioteca." 5. **Identifying** — a compact "Identificando el libro…" status (spinner). 6. **Not in library** — when the identified book isn't in the library: an empty-ish state
"No está en tu biblioteca" + explanation ("Solo podés marcar como leídos libros que ya
tenés cargados.") with a primary **"Agregar libro"** (→ /agregar) and a secondary
**"Otra foto"**.

**Confirm (shared by both methods AND the book-detail button)** 7. **Confirm sheet** — a labelled bottom sheet (`role="dialog"`, "Marcar como leído") with:
the book header (cover thumb + title + author, a close/cancel affordance), a **"Fecha de
fin"** date field (defaults to today, editable, max = today), an optional **"Fecha de
inicio (opcional)"** date field, and — **only when the book has copies** — an **"Ejemplar"**
`Select` (single copy is preselected). Primary action **"Marcar como leído"** (with loading
state). 8. **Confirm error** — an inline error inside the sheet ("No se pudo registrar la lectura.
Probá de nuevo.") that keeps the reader's input; the sheet stays open to retry. 9. **No active reader** — inside the sheet, instead of the form, a sign-in prompt ("Iniciá
sesión para registrar la lectura." + a sign-in CTA). 10. **Success** — after saving: a confirmation ("¡Lectura registrada!" + "«Título» quedó
marcado como leído.") with **"Marcar otro"** and **"Ver libro"**. (A toast also fires.)

## Part C — Book-detail entry point

On the book detail's "Lectura" section there is a **"Marcar como leído"** button (currently
"Pronto"). Design its **enabled** state; tapping it opens the **same confirm sheet** (state 7)
for the already-identified book. After success, the reader's row in that section flips to the
**"Leído"** badge (`bg-success/15 text-success`, check icon).

## Requirements

- **Mobile-first**, single column, touch targets ≥44px; the confirm sheet is thumb-friendly
  and its primary action reachable with a thumb.
- **Accessibility**: the method selector is a `radiogroup` (`role="radio" aria-checked`); the
  confirm sheet is a labelled dialog; date/select fields have real labels; the "Leído" state
  is text + icon (never color-only); visible focus rings; the identifying spinner is a
  `role="status"` live region.
- **Copy (es-AR, keep)**: "Marcar leído", "Buscar", "Por foto", "Buscá por título o autor",
  "Tomar foto", "Identificando el libro…", "No está en tu biblioteca", "Agregar libro",
  "Marcar como leído", "Fecha de fin", "Fecha de inicio (opcional)", "Ejemplar",
  "No se pudo registrar la lectura. Probá de nuevo.", "Iniciá sesión para registrar la
  lectura.", "¡Lectura registrada!", "Marcar otro", "Ver libro".

## Out of scope

Rating + review capture and editing (a later change), reading history / timeline and filters
(a later change), re-read handling UI, and any manual "book not in library → create here"
form (adding is the "Agregar" flow).
