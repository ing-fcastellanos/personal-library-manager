# Claude Design prompt — Meta anual de lectura (#30)

Paste into Claude Design to design the reading-goal widget. Validate against
the base design system (M0 tokens) before integrating. This closes M5.

---

## Context

Mobile-first PWA, Spanish (es-AR). This adds a **"Meta anual"** section to the
dashboard, below the existing KPIs, "Leídos por lector", "Últimos leídos", and
"Tendencias" sections (#27–#29). Match the existing visual language (cards
`rounded-2xl`, subtle borders; tokens `background`, `foreground`,
`muted-foreground`, `primary`, `secondary`, `accent`, `card`, `border`,
`muted`, `success`/`success-bg`). Reuse the **trend card** shell from #29
(avatar + name header, `rounded-2xl border bg-card p-4`) as the visual
starting point for this card, since both sit side by side in the same
dashboard rhythm.

## What this adds

A "reading challenge"-style annual goal, one card per reader, side by side
(stacked on mobile). Only the **active (signed-in) reader** can set/edit
**their own** goal — from this same card. Another reader's card shows their
goal/progress read-only, no edit control.

## Part A — Three states per reader card (design ALL of them)

1. **Sin meta — active reader** — header (avatar + name), then a dashed-border
   empty area with a target-style icon, "Sin meta este año", and a primary
   button **"Fijá tu meta"** that reveals the set-goal control (Part B).
2. **Sin meta — another reader** — same header, but the empty area just says
   "Sin meta" (no icon needed, no button — read-only).
3. **En progreso** — header, then a large count **"N / Meta"** (N bold, "/
   Meta" muted, e.g. "8 / 24"), a progress bar/track beneath it (filled
   proportionally, `primary`), and — when computable — a short projection line
   below ("A este ritmo, terminarías el año con ~14 libros."). The active
   reader's card also shows a small pencil/edit icon near the count to revise
   the goal later.
4. **Cumplida** — same layout as "en progreso" but the progress bar is full and
   `success`-colored, and a small **"Cumplida"** badge (check icon + text,
   `success-bg`/`success`) appears near the header. No projection line needed
   once met.

## Part B — Set/edit control (active reader only)

5. Design the inline control shown when "Fijá tu meta" (or the edit pencil) is
   tapped: a number input (compact, e.g. 80px wide) + a primary **"Guardar"**
   button + a plain-text **"Cancelar"**. Keep it inline within the card (no
   separate modal) so it reads as a lightweight, contextual edit — consistent
   with how #25's rating edit stays inline rather than opening a dialog.

## Part C — Layout

6. Two cards side by side on wider screens (`auto-fit`, matching #29's trend
   cards), stacked on mobile (~360px). Section eyebrow label "Meta anual"
   above, same style as the other dashboard section headers.

## Requirements

- **Mobile-first**, touch targets ≥44px on the number input/buttons; the card
  stays legible and uncluttered at ~360px.
- **Accessibility**: the number input has a real (visually hidden if needed)
  label like "Meta anual de {nombre}"; the progress bar's value is also
  expressed as text ("N / Meta"), not conveyed by bar length alone; the
  "Cumplida" state uses a check icon + text, not color alone; visible focus
  rings on all interactive elements; the edit control is only rendered (not
  just hidden) for the active reader's own card.
- **Copy (es-AR, keep)**: "Meta anual", "Sin meta este año", "Sin meta", "Fijá
  tu meta", "Guardar", "Cancelar", "Cumplida", "A este ritmo, terminarías el
  año con ~N libros.", "Editar tu meta".

## Out of scope

Letting one reader set another reader's goal, a multi-year goal history/browser
UI (the data supports it, but this screen only shows the current year), goal
reminders/notifications, and any server-side aggregation endpoint (this reuses
the existing `PATCH /api/readers/:id`).
