# Claude Design prompt — AI settings section (#19b)

Paste this into Claude Design to generate the "AI settings" section of the
`/ajustes` screen. Validate the output against the base design system (M0 tokens)
before integrating.

---

## Context

Mobile-first PWA for a 2-person household library manager. Spanish (es-AR) UI.
This is one **section** inside an existing Settings page (`/ajustes`) that already
has "Lectores", "Estantes", and "Seguridad" sections rendered as cards. Match that
visual language. Use the existing design tokens (no new colors): `background`,
`foreground`, `muted-foreground`, `primary`, `accent`, `input`, `border`, `ring`,
`secondary`, `destructive`. Rounded corners (`rounded-xl`), subtle borders, generous
spacing. Components available: Card, Badge, Button, Label, Select, Skeleton.

## What this section does

Lets a reader manage the AI engine used to identify books from photos. **There is no
API key input anywhere** — keys live server-side in Secret Manager. The section only:

1. **Default engine** — a labelled Select with two options: "OpenAI" and "Gemini".
2. **Automatic fallback** — a toggle switch with a title "Fallback automático" and a
   one-line description "Si el motor por defecto falla, reintentar con el otro."
3. **Engine status** — a small list (OpenAI, Gemini). Each row shows the engine name
   (mark the default with a subtle "por defecto" tag), a status Badge, and a "Probar"
   button (with a plug icon).

## States to design

- **Loading**: skeletons for the select, toggle, and status rows.
- **Status badges**:
  - `Conectado` → secondary/neutral badge
  - `Sin API key` → outline/muted badge
  - `Probando…` → outline badge with a spinner on the button
  - `Error de conexión` → destructive badge
- **Saving**: select + toggle disabled while a change persists.
- **Test result**: the tested row's badge updates in place.

## Requirements

- **Responsive**: single column on mobile (~360px) up to a comfortable max width;
  rows wrap gracefully; touch targets ≥ 44px.
- **Accessibility**: the toggle is a real `role="switch"` with `aria-checked` and an
  accessible name; the Select has a `<Label>`; status changes are perceivable
  (not color-only — include the text label in the badge); visible focus rings.
- **Copy** (Spanish, keep it): heading "IA"; "Motor por defecto"; helper "El motor
  que se usa primero para identificar libros desde fotos."; "Fallback automático";
  "Estado de los motores"; "Probar"; footnote "Las API keys se configuran en el
  servidor (Secret Manager), no desde la app."

## Out of scope

No API key fields, no usage/billing UI, no per-call logs. Just engine selection,
fallback toggle, and connection status.
