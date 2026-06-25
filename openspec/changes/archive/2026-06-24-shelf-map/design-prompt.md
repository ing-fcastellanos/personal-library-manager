# Prompt de Claude Design — Gestión de estantes (#18)

> Artefacto de entrada para "producir el diseño en Claude Design". No es código: especifica el
> handoff. Al integrar, el markup se mapea a `components/ui/` y sigue el patrón de
> `ReadersManager` (gestión de metadata del hogar en Ajustes).

## Contexto del producto

Personal Library Manager: app web mobile-first para una biblioteca física del hogar. Pantalla:
**gestión de estantes**, dentro de **Ajustes** (`/ajustes`), junto a "Lectores" y "Seguridad".
Un estante (`Shelf`) tiene **nombre**, **ubicación** (texto, p. ej. "Living · pared norte") y
**descripción**. Cada ejemplar (`Copy`) puede estar en un estante. "Ver contenido" de un estante
lleva al catálogo filtrado por ese estante (no es una pantalla nueva).

## Objetivo de la pantalla

Diseñar la sección "Estantes" de Ajustes: listar, crear, editar y borrar estantes, con el conteo
de libros por estante y un acceso a su contenido.

## Estructura

- **Sección "Estantes"** (encabezado + botón "Agregar estante").
- **Lista de estantes**: cada fila/card muestra:
  - nombre (destacado) + ubicación (secundario) + descripción (opcional, atenuada).
  - **conteo de libros** ("12 libros").
  - acciones: **Ver contenido** (→ catálogo filtrado), **Editar**, **Borrar**.
- **Crear / editar** (dialog o inline): campos **Nombre** (requerido), **Ubicación**,
  **Descripción**.
- **Borrar** (confirmación): si el estante tiene libros, **advertir** "N libros quedarán sin
  estante".

## Estados

1. **Lista con estantes** — el caso normal.
2. **Vacío** — sin estantes todavía: EmptyState + CTA "Agregar estante".
3. **Cargando** — skeletons de filas mientras llegan estantes/conteos.
4. **Crear/editar** — formulario (validación: nombre requerido).
5. **Confirmar borrado** — diálogo con el aviso de libros afectados.

## Requisitos transversales

- **Mobile-first responsive**; **accesibilidad** (labels, foco visible, diálogos con foco
  atrapado, navegación por teclado, contraste AA); **light/dark**.
- **Design tokens (M0)** del design system base (ver `app/style-guide`).
- **Consistencia** con `ReadersManager` (misma estética de gestión en Ajustes).

## Anclaje a primitivos / patrón existente

Mapear a `components/ui/` (`Card`, `Button`, `Input`, `Label`, `Dialog`, `Badge`, `Skeleton`,
`EmptyState`) y seguir el patrón visual de `components/readers/readers-manager.tsx`. No reinventar
widgets.

## Entregable

Markup/JSX + estilos con tokens para la sección de estantes y sus estados (lista / vacío /
cargando / crear-editar / confirmar borrado), responsive y accesible, validable contra
`app/style-guide` y consistente con la gestión de lectores.
