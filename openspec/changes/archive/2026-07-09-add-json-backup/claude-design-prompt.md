# Claude Design prompt — Backup JSON (#36)

Paste into Claude Design to design the backup card on `/ajustes`. Validate
against the base design system (M0 tokens) before integrating.

---

## Context

Mobile-first PWA, Spanish (es-AR). The app is the sole source of truth for
the library (no dependency on Goodreads, ADR-0005) — this gives the reader
their own downloadable copy of everything, independent of any external
service. `/ajustes` is a flat list of `Card`s (Lectores, Estantes, IA,
Seguridad as full sections; Códigos QR and Apariencia as simple
button-in-a-card patterns). This adds one more card in that same simple
style — no new page, no wizard, just a card with a button and three states.

## The card

1. A `Card` titled **"Backup"**, placed alongside the existing "Códigos QR" /
   "Apariencia" cards (same visual weight — title + one-line description +
   one outline button, nothing more elaborate).
2. Description copy: "Descargá un JSON completo de tu biblioteca (libros,
   ejemplares, lecturas, lectores y estantes) para tu propio resguardo."
3. Button states:
   - **Default**: outline button, download icon, "Descargar backup".
   - **Downloading**: same button, spinner icon replacing the download
     icon, disabled, label unchanged (brief — five parallel fetches, not a
     multi-step process worth a progress bar).
   - **Error** (a fetch failed): a toast — "No se pudo generar el backup" —
     button returns to its default enabled state so the reader can retry.

That's the whole surface. No confirmation dialog, no destructive-action
styling — this is a read-only download, not different in risk from any
other export/download in the app.

## Requirements

- **Mobile-first**, touch target ≥44px on the button (matches every other
  button in Ajustes).
- **Accessibility**: the button's accessible name stays "Descargar backup"
  in both default and downloading states (don't swap to "Descargando…" —
  the spinner already conveys busy state visually; screen reader users get
  the same via the button's `disabled` state, not a changing label). Visible
  focus ring.
- **Copy (es-AR, keep)**: "Backup", "Descargar backup", the description
  sentence above, "No se pudo generar el backup".

## Out of scope

Restore-from-backup (tracked separately, #93 — a destructive operation with
its own semantics to design later); scheduled/automated export to Cloud
Storage (no scheduler infrastructure exists in this app); any confirmation
step before downloading (it's a read, not a mutation).
