# Claude Design prompt — Registro de préstamos (#39)

Paste into Claude Design to design the loan flow. Validate against the base design
system (M0 tokens) and the style-guide primitives before integrating.

---

## Context

Mobile-first PWA, Spanish (es-AR), light + dark via design tokens (ADR-0010). A
two-reader household library. The app already tracks what the household **owns**
(copies on shelves) and **reads**. This feature tracks what has **left the house**:
lend a physical copy to a friend, mark it returned, keep the history, and see at a
glance what's currently out.

Key facts that shape the UI:

- You lend a **specific copy** (a physical ejemplar), not a book/edition. A book with
  2 copies can have 1 out and 1 available.
- The **borrower is an outsider**, not a household reader — a **free-text name** with
  **autocomplete** of names already used (so "Juan" doesn't fork from "juan").
- **State is derived, not a flag:** a copy is *prestado* iff it has an open loan
  (no return date); *vencido* iff it has a due date in the past and isn't returned.
- Nothing is pushed — a due date shows "vencido" but there are no reminders.

## Existing shell + primitives (reuse, don't reinvent)

- App shell: mobile header + fixed **bottom nav (currently 6 items:** Dashboard,
  Agregar, Deseos, Leído, Catálogo, Ajustes**)**; desktop sidebar. Content is
  `Card`-based lists.
- Primitives (style-guide): `Card`, `Badge`, `Button`, `EmptyState`, `Input`,
  `Label`, `Select`, `Dialog`, `Avatar`, `Toast`, `Skeleton`, `Tabs`. Icons: lucide.

## Decision to make — where `/prestamos` lives

The bottom nav is already **6 items** (Deseos was just added). A 7th crowds mobile.
Options to weigh in the design: a 7th "Préstamos" entry; fold "Préstamos" together
with another section; or reach `/prestamos` from the catalog / a secondary index.
Propose a primary path and show how it degrades. The route is `/prestamos` regardless.

## Four states of a copy (design all four)

```
 DISPONIBLE ──Prestar──▶ PRESTADO ──(vence)──▶ VENCIDO ──Devolver──▶ DEVUELTO (historial)
   en casa               a Juan,               en rojo,              vuelve a
                         desde 3/2             vencido el 1/3        DISPONIBLE
```

## Screen A — Book detail: per-copy loan state + actions

On the book detail (`/libros/[id]`), the **Ejemplares** section already lists each
copy. Add, per copy:

- **Available copy:** an **"En casa"** state + a **Prestar** action.
- **Copy on loan:** a **loan-details card** — borrower name (with an avatar/initial),
  "Prestado desde <fecha>", and, if a due date is set, "Vence <fecha>" or a **"Vencido"**
  badge when past. A **Devolver** action.

The **Prestar** form (a `Dialog` or inline): borrower **name with autocomplete** (from
past borrowers), **fecha de préstamo** (defaults to today), **fecha de vencimiento**
(optional), and optional **notas**. Lending/returning require sign-in.

## Screen B — `/prestamos`: everything currently out

A dedicated space for the open loans, **grouped by borrower** (one section per person,
their held books listed), each book showing since when and a **"vencido"** badge if
overdue. Include access to the **full history** (returned loans too — maybe a tab
"Afuera" / "Historial"). Empty state: warm ("Nada prestado — todo está en casa").

## Screen C — Catalog browse badge

Each result on `/catalogo` (list + grid) shows a **"prestado"** indicator when one or
more of the book's copies is out — reflecting the count when a book has several copies
("1 de 2 prestado"). Because a shelf's view is the browse filtered by `?shelf=`, this
same badge is how a lent copy reads as "out" on the shelf view.

## Requirements

- **Mobile-first**; touch targets ≥44px; the Prestar/Devolver actions comfortably
  tappable.
- **Light + dark** from tokens only. "Vencido" must read as urgent without relying on
  color alone (pair with an icon/label) and stay legible in both themes and for
  color-blind users.
- **Accessibility**: the lend form fields are labeled; the autocomplete is keyboard
  operable; each action has a clear accessible name ("Prestar «<título>»",
  "Marcar «<título>» como devuelto"); the borrower avatars group has a text alternative.
- **Derived, calm tone**: the copy's state and "vencido" are computed — no manual
  status pickers; a returned loan simply moves to history.

## Copy (es-AR — keep)

"Préstamos", "Prestar", "Devolver", "En casa", "Prestado", "Prestado desde", "Vence",
"Vencido", "Afuera", "Historial", "Prestado a", "Nombre de quien se lo lleva",
"Fecha de préstamo", "Fecha de devolución (opcional)", "Notas", "Nada prestado".

## Out of scope

- Due-date reminders / notifications (#41) — "vencido" is shown, nothing is pushed.
- A contacts/address-book with phone numbers — the borrower is just a name.
- Loans between household readers; lending at the book (not copy) level.
