# Claude Design prompt — Import CSV de Goodreads/StoryGraph (#35)

Paste into Claude Design to design the CSV bootstrap-import wizard: the new
mode tile on `/agregar`, upload, column mapping, the enrich+dedupe progress
screen, and the per-row review list. Validate against the base design system
(M0 tokens) before integrating.

---

## Context

Mobile-first PWA, Spanish (es-AR). Readers already have years of reading
history in Goodreads or StoryGraph; this wizard bootstraps the catalog and
reading log from an export instead of manual entry, one time. **Only
finished readings import** — no to-read/currently-reading/did-not-finish
concept exists in this app. Reuses the existing `/agregar` mode-switcher (a
2×2-becoming-2×3 tile grid — see `Add Book Form.dc.html`'s mode grid for the
visual language), the existing `add-book-by-shelf` batch-processing progress
pattern (a sequential "Procesando N/M" screen with a progress bar), and the
existing AI-import summary screen (`Import Results.dc.html` — reuse its
grouped-outcome layout as-is, don't redesign it). Match the existing visual
language (cards `rounded-2xl`, subtle borders; tokens `background`,
`foreground`, `muted-foreground`, `primary`, `card`, `border`, `muted`,
`accent`).

## Part A — Mode tile on /agregar

1. `/agregar` has a 2×2 grid of mode tiles (Por foto / Por estante / Por
   código / Manual). Add a 5th tile, **"Importar CSV"**, with an upload
   icon — design how a 5th tile sits in that grid (a 2-2-1 wrap, or
   reflow to 3 columns — your call, whichever reads cleaner).

## Part B — Upload step

2. A dashed-border drop-zone card (reuse the existing "Sacá una foto del
   estante" empty-state pattern from `add-book-by-shelf` as the visual
   base) with copy: **"Importá tu CSV de Goodreads o StoryGraph"** /
   "Solo se importan las lecturas marcadas como leídas." and a primary
   button **"Elegir archivo CSV"**.

## Part C — Column mapping step

3. Always shown (never skipped, even when the format is auto-detected) — a
   simple vertical list of 7 fields (Título, Autor, ISBN, Calificación,
   Reseña, Fecha leído, Estado), each paired with a `<select>` of the
   file's actual column headers, pre-selected when the format was
   recognized. A primary **"Continuar"** button, disabled until Título and
   Estado are mapped.
4. Design one state where the format was detected (selects pre-filled) and
   one where it wasn't (every select on "— sin mapear —", reader fills
   them in by hand).

## Part D — Processing (progress) step

5. Reuse `add-book-by-shelf`'s processing screen exactly: a spinner,
   "Procesando N/M", a progress bar, and a short caption — same pattern
   twice in this wizard (once for the enrich+dedupe pass, once for the
   actual save). Just retitle the caption ("Enriqueciendo y buscando
   duplicados." for the first pass; "Guardando tu biblioteca." for the
   second).

## Part E — Review list

6. One card per surviving row — cover thumbnail (or a placeholder gradient
   when enrichment found nothing), title, authors, an include/exclude
   checkbox, and a **Formato** select (Físico / Digital).
7. When a row has a likely duplicate match: a non-blocking badge below the
   title — **"Ya está en tu biblioteca · <título existente>"** (exact ISBN
   match) or **"Podría ser un duplicado · <título existente>"** (ambiguous
   match) — with an inline text link to flip the row between "Crear
   nuevo" and "Usar existente". No modal, no dialog — the reader keeps
   scrolling and reviewing other rows.
8. A sticky primary button at the bottom: **"Importar N lecturas"** (N =
   currently-included count), disabled at 0.
9. An empty state for when the file has zero finished rows: centered text,
   "No encontramos lecturas terminadas para importar en este archivo." —
   the existing dashed/muted empty-state pattern.

## Part F — Summary (confirm this is a non-issue)

10. The final screen reuses the existing AI-import summary
    (`Import Results.dc.html`) completely unchanged — its "Agregados" /
    "Agregados como copia" / "Fallidos" / "Descartados" grouping already
    covers this flow. Nothing to design here; just confirm in review that
    it doesn't need a CSV-specific variant.

## Requirements

- **Mobile-first**, touch targets ≥44px on every checkbox, select, and
  button in the review list — it may have many rows.
- **Accessibility**: each review-list checkbox has an accessible name
  including the book title ("Incluir Rayuela"), not just "Incluir"; the
  Formato select has a visible or accessible label; the duplicate badge's
  override control has a clear accessible name ("Usar existente" /
  "Crear nuevo"), not an icon-only toggle; progress bars use
  `role="progressbar"` with `aria-valuenow`/`aria-valuemax`; visible focus
  rings throughout.
- **Copy (es-AR, keep)**: "Importar CSV", "Importá tu CSV de Goodreads o
  StoryGraph", "Solo se importan las lecturas marcadas como leídas.",
  "Elegir archivo CSV", "Continuar", "— sin mapear —", "Procesando",
  "Formato", "Físico", "Digital", "Ya está en tu biblioteca", "Podría ser
  un duplicado", "Usar existente", "Crear nuevo", "Importar N lecturas",
  "No encontramos lecturas terminadas para importar en este archivo."

## Out of scope

A generic "any CSV" importer with free-form/arbitrary column mapping (only
Goodreads/StoryGraph's known shapes are supported); importing
to-read/currently-reading/did-not-finish rows (explicitly excluded — this
app has no wishlist concept); a reader picker inside the wizard (every
imported reading attributes to the already-signed-in reader, same as every
other write in the app); a CSV-specific summary screen (Part F reuses the
existing one); automated ongoing sync with Goodreads (ADR-0005 territory,
rejected).
