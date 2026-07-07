# Claude Design prompt — Calificación y reseña (#25)

Paste into Claude Design to design the rating + review UI. Validate against the base
design system (M0 tokens) before integrating.

---

## Context

Mobile-first PWA, Spanish (es-AR). This extends the **"marcar como leído"** flow
(#24): the confirm bottom-sheet (`role="dialog"`) already captures finish date,
optional start date, and copy, attributed to the active reader. #25 adds an
optional **rating** (1–5 stars) and an optional **review** (textarea) — captured
when marking and **editable later** from the book detail.

Match the existing visual language (cards `rounded-2xl`, subtle borders; tokens
`background`, `foreground`, `muted-foreground`, `primary`, `secondary`, `accent`,
`card`, `popover`, `border`, `input`, `ring`, `success`/`success-bg`, `warning`).
Reuse the confirm-sheet shell from #24 (header with cover thumb + eyebrow + round
close, attributed-reader chip, date fields, primary action). Stars use the
**`warning`** token (amber) filled; empty stars are `muted-foreground` outlines.

## What this adds

The reader optionally rates a finished reading 1–5 and writes a review. Both are
optional (a reading can be saved with neither). The same sheet, in **edit mode**,
preloads an existing reading's values and saves changes. The book detail shows each
reader's rating + review and lets the **active reader** edit theirs.

## Part A — Star rating control (design ALL states, ~360px)

An accessible 1–5 star selector (fixed integer scale — **no half-stars**). Design:

1. **Empty** — five outline stars, nothing selected.
2. **Hover / focus** — stars up to the pointer/focused index fill; a **visible focus
   ring** on the focused star.
3. **Selected** — e.g. 4 of 5 filled (amber `warning`), plus a subtle **"Quitar"**
   affordance to clear back to no rating.
4. **Read-only** — a compact static display (smaller stars) for showing someone's
   rating on the book detail, no controls.

Note keyboard: arrows change value, `1`–`5` set directly, `0`/Backspace clears.

## Part B — Sheet fields (capture + edit)

Inside the confirm sheet, below date/copy: 5. **Rating field** — label "Calificación (opcional)" + the star control (Part A). 6. **Review field** — label "Reseña (opcional)" + a multi-line textarea
("¿Qué te pareció?"), comfortable height, resizable. 7. **Create vs. edit** — same layout; in **edit** the eyebrow reads "Editar
lectura", values are preloaded, and the primary action is **"Guardar cambios"**
(vs. "Marcar como leído"). Show the **inline error** variant ("No se pudieron
guardar los cambios. Probá de nuevo.") consistent with #24's error style.

## Part C — Book detail display + edit entry

In the book detail "Lectura" section, each reader row (avatar + name) shows, when
present: 8. **Rating** — read-only stars (Part A, small). 9. **Review** — the review text below the stars (muted, readable). 10. **Edit entry** — only the **active reader's** row exposes an **"Editar"**
action (pencil) that opens the sheet in edit mode for their latest reading.
Other readers' rating/review are **read-only** (no edit control). Keep the
existing "Marcar leído" button for the active reader when they haven't finished,
and the status badge otherwise.

## Requirements

- **Mobile-first**, touch targets ≥44px; the star control is thumb-friendly and the
  textarea comfortable on a phone.
- **Accessibility**: the star control is a `radiogroup` of `role="radio"` stars
  (`aria-checked`), keyboard-operable with a visible focus ring, and clearable; the
  read-only display exposes an `aria-label` like "4 de 5 estrellas"; the review
  textarea has a real `label`; rating is conveyed by **stars + value, not color
  alone**.
- **Copy (es-AR, keep)**: "Calificación (opcional)", "Reseña (opcional)",
  "¿Qué te pareció?", "Quitar", "Guardar cambios", "Editar lectura", "Editar",
  "No se pudieron guardar los cambios. Probá de nuevo.".

## Out of scope

Editing arbitrary past readings / re-reads and the reading history timeline (a later
change), CSV export and Goodreads linking (a later milestone — this only captures the
data), and a configurable rating scale (fixed 1–5).
