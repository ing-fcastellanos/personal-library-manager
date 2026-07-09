# Claude Design prompt — Hoja imprimible de QR (#31)

Paste into Claude Design to design the QR print sheet. Validate against the
base design system (M0 tokens) before integrating.

---

## Context

Mobile-first PWA, Spanish (es-AR). This is a new page reachable from
**Ajustes** (`/ajustes/qr`) — a setup/admin action, not a daily flow, so it
doesn't live in the bottom nav/sidebar. It prints three QR codes to stick next
to the physical bookshelf: **Ver dashboard**, **Agregar libro**, **Registrar
leído**. Each QR encodes an absolute `/scan?action=...` URL (already resolved
by an existing route, #10 — this change only adds the thing that renders the
QR images, nothing about the scan resolver itself). Match the existing visual
language (cards `rounded-2xl`, subtle borders; tokens `background`,
`foreground`, `muted-foreground`, `primary`, `card`, `border`).

## What this adds

Two states of the SAME page: the **on-screen view** (normal app chrome, for
reviewing before printing) and the **print view** (`@media print` — app
chrome hidden, just the three QR+label cards laid out to be cut apart).

## Part A — On-screen view

1. Page header: title "QR para el librero" + subtitle "Imprimí y pegá junto a
   tu biblioteca." on the left, a primary **"Imprimir"** button (printer icon)
   on the right.
2. A responsive grid of 3 cards, one per action (1 column on mobile, 3 columns
   from `sm:` up). Each card: the QR code (square, ~160px), and below it the
   action's icon + label as real text (e.g. "Agregar libro") — never just the
   QR alone, since a QR can't be read at a glance.
3. A plain-text "Volver a Ajustes" link below the grid.

## Part B — Print view (`@media print`)

4. App header/nav/sidebar hidden entirely — only the QR grid prints.
5. Each of the 3 cards becomes its own clearly-bordered, cuttable tile (e.g. a
   solid border marking the cut line) sized and margined in real physical
   units (cm/in, not viewport-relative) so print scaling stays predictable
   across printers. The "Imprimir" button and the "Volver" link are hidden in
   print (they're screen-only affordances).
6. Keep each tile's QR + label together (no awkward page-break splitting a
   card in half).

## Requirements

- **Mobile-first** on-screen view; the print view only needs to look right on
  a standard printable page (letter/A4).
- **Accessibility**: the QR canvas itself is decorative (`aria-hidden`,
  nothing meaningful for a screen reader to read from a raster QR) — the
  adjacent text label is what makes each card identifiable, and it must be
  real, visible text, not conveyed by icon/color alone. Visible focus ring on
  "Imprimir" and the back link. The page requires **no sign-in** — it must
  render fully for a signed-out visitor.
- **Copy (es-AR, keep)**: "QR para el librero", "Imprimí y pegá junto a tu
  biblioteca.", "Imprimir", "Ver dashboard", "Agregar libro", "Registrar
  leído", "Volver a Ajustes".

## Out of scope

Per-shelf QR codes (#33 — a follow-up that reuses this page's QR-rendering
piece), PDF export (confirmed: CSS print only, no PDF library), any change to
the `/scan` resolver, auth, or shelf-context (#10/#18, untouched by this
change).
