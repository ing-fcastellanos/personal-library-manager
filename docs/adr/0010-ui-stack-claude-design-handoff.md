# ADR-0010: Stack de UI y pipeline de handoff con Claude Design

- **Estado:** Accepted
- **Fecha:** 2026-06-21
- **Responsable(s):** ing-fcastellanos
- **Issues relacionados:** #6 (y los 21 issues de UI con `claude-design`)

## Contexto

Los diseños de toda la web se generan con **Claude Design**, que entrega
**componentes React + Tailwind**. Hay ~21 pantallas (issues con label
`claude-design`) que deben verse y comportarse de forma consistente, ser
accesibles y mobile-first (uso frente al librero). Hace falta fijar el stack de UI
y, sobre todo, **cómo se integra el handoff** de forma repetible, antes de
construir #6 (el design system base que el resto consume).

## Decisión

- **Stack:** **Tailwind CSS** + **shadcn/ui** (primitivos basados en Radix que se
  **copian al repo y se poseen**, no una dependencia opaca). Aporta accesibilidad
  hecha (Dialog, Tabs, Select, Toast…) y encaja naturalmente con la salida
  React+Tailwind de Claude Design.
- **Design tokens = única fuente de verdad** como **CSS variables**
  (`--primary`, `--bg`, escalas de espaciado/tipografía/radios…), **mapeadas al
  theme de Tailwind**. El theming light/dark se hace conmutando esas variables. Tanto
  Claude Design como el código hablan el mismo lenguaje de tokens.
- **Pipeline de handoff** (mismo para los 21 issues):

  ```
  1. Generar prompt de Claude Design  → describe pantalla/estados + TOKENS del proyecto
  2. Claude Design produce React+Tailwind
  3. Integrar: mapear a primitivos shadcn + tokens, cablear datos, QA a11y/responsive
  ```

- **Layout:** mobile-first — **bottom-nav en mobile**, **sidebar en desktop**
  (Dashboard, Agregar, Marcar leído, Catálogo, Settings).
- **Alcance de #6:** **solo primitivos** + tokens + shell + PWA base. Los componentes
  **de dominio** (BookCard, rating, gráficos, visor de escáner) los crea cada feature
  sobre estos primitivos.

## Consecuencias

- **Positivas:** handoff casi "pegar y ajustar tokens" en vez de traducir; a11y de
  base resuelta; consistencia entre 21 pantallas; ownership del código de los
  componentes; theming centralizado.
- **Negativas / trade-offs:** dependencia de Tailwind + estética de partida shadcn
  (mitigable con los tokens); disciplina para que cada handoff respete los tokens y
  no introduzca estilos sueltos.
- **Seguimiento:** revisar que los issues de UI no dupliquen primitivos; mantener el
  "style guide" de #6 como referencia viva.

## Alternativas consideradas

- **CSS variables + CSS Modules a mano (sin Tailwind)** — cero deps, pero construir
  Dialog/Tabs/Select accesibles desde cero para 21 pantallas es lento y propenso a
  errores; descartado.
- **CSS-in-JS (styled-components/emotion)** — fricción con SSR/RSC de Next y peor
  encaje con la salida de Claude Design; descartado.
- **Librería pesada (MUI/Chakra)** — más opinada y difícil de alinear con el handoff
  de Claude Design; descartado.
