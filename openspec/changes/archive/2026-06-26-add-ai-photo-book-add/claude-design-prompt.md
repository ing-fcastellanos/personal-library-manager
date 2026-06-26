# Claude Design prompt — Add a book by photo (#20)

Paste into Claude Design to design the photo → identify → confirm flow. Validate the
output against the base design system (M0 tokens) before integrating.

---

## Context

Mobile-first PWA, Spanish (es-AR). This is a flow inside the "Agregar" screen, chosen
via a two-option toggle: **Por foto** (this flow) and **Manual**. Match the existing
visual language (cards `rounded-2xl`, subtle borders, tokens: `background`,
`foreground`, `muted-foreground`, `primary`, `accent`, `card`, `border`, `ring`,
`secondary`, `destructive`). Components available: Card, Button, Input, Label, Badge,
Select, Skeleton.

## What this flow does

The reader photographs a book (cover or spine). AI identifies it and the server
enriches it to canonical metadata. The reader confirms the best candidate — or picks
an enrichment alternative — and saves. **The captured photo becomes the book's cover.**
There is no API key UI anywhere.

## Screens / states to design (mobile-first, ~360px)

1. **Capture (idle)** — a friendly prompt with a camera icon and a primary "Tomar
   foto" button that opens the device camera (`<input capture="environment">`). One
   line explaining cover-or-spine works.
2. **Analyzing** — the captured photo shown (thumbnail/large), a spinner, "Analizando
   la foto…". `aria-live` status.
3. **Review (candidate)** — the hero of the flow:
   - The **photo prominently** (it will be the cover).
   - The **best candidate** pre-filled in an editable form (title, author(s), shelf;
     other metadata implied).
   - A **"¿Es alguno de estos?"** list of enrichment **alternatives** (tappable cards
     with title · author · year) that repopulate the form when chosen.
   - Primary **"Guardar libro"**, secondary **"Otra foto"**.
4. **Low confidence** — a variant of Review: a muted/amber badge "Baja confianza —
   revisá los datos" and emphasis on the alternatives picker. Never color-only — keep
   the text label.
5. **Duplicate found (on save)** — an inline alert: "Ya tenés «Título» (N copias)" with
   two actions: **Agregar como copia** / **Crear de todos modos**.
6. **Error** — identification failed / no engine: a recoverable state with "Sacar otra
   foto".

## Requirements

- **Mobile-first**: single column, large touch targets (≥44px), the photo and the
  primary action reachable with a thumb.
- **Accessibility**: the photo has a meaningful `alt` ("Foto del libro (será la
  portada)"); analyzing uses `role="status"`/`aria-live`; the duplicate alert uses
  `role="alert"`; alternatives are real buttons; visible focus rings.
- **Copy (es-AR, keep)**: "Sacá una foto del libro", "Tomar foto", "Analizando la
  foto…", "La foto se guardará como portada", "¿Es alguno de estos?", "Guardar libro",
  "Otra foto", "Baja confianza — revisá los datos".

## Out of scope

No live camera preview (`getUserMedia`), no whole-shelf batch (that is #21), no barcode
scanner (#23), no API key entry.
