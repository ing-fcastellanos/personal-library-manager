# Claude Design — prompt para #6 (design system base)

> Artefacto de la tarea **6.1**. Copialo en Claude Design para generar el shell +
> la librería de primitivos. La salida (React + Tailwind) se integra en la tarea 6.2
> sobre el andamiaje ya construido (`components/ui/*`, `components/shell/*`, tokens en
> `app/globals.css`).

## Contexto del proyecto

App "Personal Library Manager": gestión de una biblioteca personal, **mobile-first**
(se usa parado frente al librero con el celular), instalable como PWA. Stack:
**Next.js 15 (App Router) + React + Tailwind CSS + shadcn/ui** (primitivos basados en
Radix). Español como idioma de la UI. Soporte **light/dark**.

## Objetivo del diseño

Diseñar el **design system base**: (1) la librería de **primitivos** y (2) el **app
shell** responsive. NO diseñar pantallas de features concretas (eso va en otros issues).

## Design tokens (úsalos como única fuente de verdad — no inventes colores)

Tokens semánticos ya definidos como CSS variables (mapeados a Tailwind):
`background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`,
`accent`, `destructive`, `success`, `border`, `input`, `ring`. Radio base
`--radius: 0.625rem` (sm/md/lg/xl derivados). Tipografía: `system-ui`. Base neutral;
**proponé una paleta de marca** para `primary`/`accent` acorde a una app de libros
(cálida, legible), respetando contraste AA en light y dark.

## Entregables

1. **Primitivos** (estilo shadcn, con estados default/hover/focus/disabled y, donde
   aplique, loading/empty/error): Button (variantes default/secondary/outline/ghost/
   destructive/link; tamaños sm/default/lg/icon), Input, Label, Select, Dialog, Toast,
   Card, Skeleton, EmptyState, Badge (incl. success/destructive), Tabs, Avatar,
   DropdownMenu.
2. **App shell** responsive:
   - **Mobile:** bottom navigation con 5 secciones (Dashboard, Agregar, Leído,
     Catálogo, Ajustes) + header con toggle de tema.
   - **Desktop (md+):** sidebar con las mismas 5 secciones + header.
   - Debe permitir **landing directo** en una acción (ej. abrir en "Agregar") para los
     QR deep-links.
3. **Theming** light/dark conmutando los tokens.

## Requisitos transversales

- **Mobile-first** y responsive (breakpoints Tailwind: base → sm → md → lg).
- **Accesibilidad**: foco visible, navegación por teclado, ARIA correcto, contraste AA.
- **Consistencia**: todo deriva de los tokens; sin estilos sueltos hardcodeados.

## Formato de salida esperado

Componentes **React + Tailwind** (TypeScript), compatibles con shadcn/ui y con los
nombres de token de arriba, listos para integrarse en `components/ui/` y
`components/shell/`.
