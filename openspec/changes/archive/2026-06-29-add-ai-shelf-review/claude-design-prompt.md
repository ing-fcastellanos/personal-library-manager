# Claude Design prompt — Add by shelf (batch) (#21b)

Paste into Claude Design to design the batch shelf flow. Validate against the base
design system (M0 tokens) before integrating.

---

## Context

Mobile-first PWA, Spanish (es-AR). A flow inside "Agregar", chosen via a **three-option
toggle**: Por foto · **Por estante** (this) · Manual. Match the existing visual language
(cards `rounded-2xl`, subtle borders; tokens `background`, `foreground`,
`muted-foreground`, `primary`, `accent`, `card`, `border`, `ring`, `secondary`,
`destructive`, `success`, `warning`/`warning-bg`). Components available: Card, Button,
Input, Label, Select, Badge, Skeleton.

## What this flow does

Photograph a whole shelf. AI identifies the books; the client enriches + duplicate-checks
each one with a **real progress bar**. Confident, matched, non-duplicate books are
**auto-added after a one-tap preview**; doubtful ones go to a **one-by-one review queue**;
duplicates are handled **in bulk**. Every saved book lands on **one shelf** (picked once).
No API keys anywhere.

## Screens / states (mobile-first, ~360px)

1. **Capture (idle)** — library icon, "Sacá una foto del estante", primary "Tomar foto del
   estante" (`<input capture="environment">`), one helper line.
2. **Analyzing** — spinner + "Analizando el estante…".
3. **Processing N/M** — a **determinate progress bar** + "Procesando 5/12". Real per-book
   progress.
4. **Results** — the hub:
   - A single **shelf selector** ("Estante para todo el lote").
   - **✅ N listos para agregar** — a compact list + primary **"Agregar los N"**.
   - **⚠ M para revisar** — a row with **"Revisar →"**.
5. **Review item (one-by-one)** — counter "N de M", sticky bottom actions
   **Descartar / Confirmar**, auto-advance, optional back. The shelf photo is **not** shown
   per item.
   - `low_confidence`: a compact candidate card (title/author) + **alternatives** (tappable
     rows, check when picked) + **opt-in edit** of title/authors. Amber "Baja confianza" badge.
   - `no_match`: an editable title/authors form. Muted "Sin metadata" badge.
6. **Duplicates group** — after the queue: "N duplicados ya en tu biblioteca" + a list +
   bulk **Saltar todos / Agregar como copia**.
7. **Done** — success check + "X agregados · Y saltados" + "Ver catálogo" / "Otro estante".

## Requirements

- **Mobile-first**, single column, touch targets ≥44px; the progress bar and primary
  actions reachable with a thumb.
- **Accessibility**: processing uses `role="status"`/`aria-live`; the progress bar conveys
  value; badges carry text (never color-only); alternatives are real buttons; the duplicate
  block is an alert; visible focus rings.
- **Copy (es-AR, keep)**: "Sacá una foto del estante", "Analizando el estante…",
  "Procesando N/M", "Estante para todo el lote", "N listos para agregar", "Agregar los N",
  "M para revisar", "Revisar →", "Baja confianza", "Sin metadata", "Descartar", "Confirmar",
  "duplicados ya en tu biblioteca", "Saltar todos", "Agregar como copia", "Listo".

## Out of scope

No bounding boxes / per-book crops, no per-item shelf photo, no overview/list of the queue,
no async job UI, no API key entry.
