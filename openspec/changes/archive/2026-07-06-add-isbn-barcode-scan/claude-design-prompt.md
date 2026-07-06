# Claude Design prompt — Add by ISBN barcode (#23)

Paste into Claude Design to design the barcode-scan add flow. Validate against the base
design system (M0 tokens) before integrating.

---

## Context

Mobile-first PWA, Spanish (es-AR). A new flow inside "Agregar", chosen from a mode
selector that now has **four** options: Por foto · Por estante · **Por código** (this) ·
Manual. Match the existing visual language (cards `rounded-2xl`, subtle borders; tokens
`background`, `foreground`, `muted-foreground`, `primary`, `accent`, `card`, `border`,
`ring`, `secondary`, `destructive`, `success`, `warning`/`warning-bg`). Components
available: Card, Button, Input, Label, Select, Badge, Skeleton, EmptyState.

## What this flow does

Point the phone camera at a book's back-cover **barcode**; the app decodes the **ISBN**,
resolves it to metadata (cover/title/author), and after a quick confirm saves it. It runs
**continuously**: scan → confirm → save → keep scanning, with one shelf for the whole
batch, ending on the shared import summary. A **manual ISBN input** is always available and
doubles as the fallback when the camera is denied.

## Part A — Mode selector: design THREE variants to compare (~360px)

The selector today is a 3-up segmented control; a 4th item makes it tight. Produce **all
three** so we can pick:

1. **2×2 grid** — four equal cells (icon + label), two rows.
2. **Overflow "Más"** — the 3 primary modes inline + a "Más" that reveals the rest.
3. **Icon-only** — four compact icon tabs (labels as tooltip / sr-only), single row.

Icons: Por foto = camera, Por estante = library/books, Por código = barcode, Manual =
pencil. Show the active/selected state for each variant.

## Part B — Scanner screen states (mobile-first, ~360px)

1. **Shelf selector** — a single "Estante para todo el lote" `Select` (same as the shelf
   flow), applied to every book saved this session.
2. **Aiming** — a live camera viewport (tall, e.g. 3:4) with a centered **aim guide**
   (rounded rectangle framing where the barcode goes) and a hint "Apuntá al código de
   barras". A small running counter of what's been added.
3. **Detected / confirm** — a bottom sheet card with cover + title + author and
   **Descartar / Agregar**. Keep it lightweight (ISBN metadata is canonical — no full
   form).
4. **Duplicate** — same card but flagged "Ya lo tenés · N copias" with **Descartar /
   Agregar copia**.
5. **Not found** — "No encontramos metadata para el ISBN …" with **Descartar** (and a hint
   that unknown ISBNs can be loaded from "Manual").
6. **Camera denied / unavailable** — the viewport shows a camera-off state ("Sin acceso a
   la cámara. Ingresá el ISBN a mano.") and the manual input is the path forward, with a
   "reintentar cámara" affordance.
7. **Manual ISBN input** — a numeric input ("ISBN a mano") + "Buscar", always visible below
   the viewport.
8. **Finish** — a primary "Terminar · N agregados" that leads to the import summary.

## Requirements

- **Mobile-first**, single column, touch targets ≥44px; primary actions reachable with a
  thumb; the confirm sheet is thumb-friendly.
- **Accessibility**: the aim guide is decorative (`aria-hidden`); the confirm sheet is a
  labelled dialog; the camera-off and not-found states are readable text (never color-only);
  the manual input has a real label; visible focus rings.
- **Copy (es-AR, keep)**: "Por código", "Estante para todo el lote", "Apuntá al código de
  barras", "Agregar", "Agregar copia", "Descartar", "Ya lo tenés", "No encontramos
  metadata para el ISBN", "ISBN a mano", "Buscar", "Terminar · N agregados", "Sin acceso a
  la cámara. Ingresá el ISBN a mano.".

## Out of scope

Torch/zoom controls (shown only where the browser supports them — a later add), server-side
decoding, non-ISBN barcodes, and a full manual-metadata form for unknown ISBNs (that is the
"Manual" mode).
