# Claude Design prompt — Actividad / auditoría de cambios (#40)

Paste into Claude Design to design the activity views. Validate against the base
design system (M0 tokens) and the style-guide primitives before integrating.

---

## Context

Mobile-first PWA, Spanish (es-AR), light + dark via design tokens (ADR-0010). A
two-reader household library where both readers can edit the same books, copies,
and reading log. This feature answers "who did that?" — every create/edit/delete
of a book, copy, or reading event is logged with who, what, and when.

Key facts that shape the UI:

- **Three actions**: agregó (create), editó (update), borró (delete). An edit also
  carries **which fields changed** (just names, e.g. "condition, notes" — not old/new
  values).
- **The actor is looked up live**, not stored on the entry — resolve `readerId` against
  the household's small reader list. There are only ever 1–2 readers.
- **The entity might not exist anymore.** A log entry always carries a label snapshot
  (the book/copy/reading's title at the time), so a "borró «Ficciones»" entry reads
  fine forever, with no dead link.
- This is **not** a compliance audit trail — keep the tone light and legible, closer
  to a household activity feed than an enterprise log viewer.

## Existing shell + primitives (reuse, don't reinvent)

- App shell: mobile header + fixed bottom nav (6 items: Dashboard, Agregar, Deseos,
  Leído, Catálogo, Ajustes — **no 7th item for this feature either**); desktop sidebar.
- Primitives (style-guide): `Card`, `Badge`, `Avatar`, `EmptyState`, `Skeleton`. Icons:
  lucide.
- Precedent to match: the book detail already has a "Historial de lecturas" section
  (what was read) — this feature adds a **separate, distinctly-named** "Actividad"
  section (who touched the record), right below it. Don't let the two rows look
  interchangeable at a glance.

## Where this lives (already decided — design around it)

- **`/ajustes/actividad`**: a settings sub-page (like `/ajustes/series`, `/ajustes/qr`)
  listing the most recent activity across every book/copy/reading event in the
  household. Not a bottom-nav destination.
- **Book detail**: an "Actividad" section aggregating entries for that book, its
  copies, and its reading events together — the household's mental model is "what
  happened to this book," not just edits to the book record itself.

## Screen A — Activity row (the shared unit)

Design once, reused in both places:

- Actor avatar (initial).
- A sentence: "**{Nombre}** {agregó|editó|borró} «{etiqueta}»".
- If it was an edit: the changed field names, small and muted.
- A relative time ("hace 5 min" / "hace 3 h" / "ayer" / a date past a week).
- A subtle icon marking the action type (+ / pencil / trash) — never the *only* signal
  distinguishing actions, the verb already says it; the icon is a scan aid.
- A since-deleted entity's row looks **exactly the same** — no broken-link styling,
  no warning color. The label snapshot is all it needs.

## Screen B — `/ajustes/actividad`

The most recent N entries, most-recent-first, spanning every entity type mixed
together (no per-type tabs — the household is small enough that one feed works).
Empty state: warm, pointing at where activity actually originates ("desde el
detalle de un libro").

## Screen C — Book detail "Actividad" section

Same row component as Screen B, scoped to one book + its copies + its reading
events, sitting below "Historial de lecturas". Doesn't render at all when there's
no activity yet for that book (a book nobody has touched shouldn't have an empty
"Actividad" box competing for attention).

## Requirements

- **Mobile-first**; touch targets not required here (rows aren't interactive —
  no drill-down, no per-entry actions).
- **Light + dark** from tokens only.
- **Accessibility**: each row reads as one coherent sentence to a screen reader
  (actor, action, entity, changed fields, time, in that order); the action icon is
  `aria-hidden` (the verb already carries the meaning).
- **Calm tone**: this is closer to "who touched the shared doc" than a security
  log — avoid alarming colors/iconography, especially for `delete` (a normal,
  expected household action, not an incident).

## Copy (es-AR — keep)

"Actividad", "agregó", "editó", "borró", "hace {N} min", "hace {N} h", "ayer",
"hace {N} días", "Todavía no hay actividad registrada", "Cada vez que alguien
agregue, edite o borre un libro, ejemplar o lectura, va a aparecer acá".

## Out of scope

- Reverting a logged change.
- Old/new field *values* — only field names.
- Filtering/searching the activity feed by actor or entity type.
