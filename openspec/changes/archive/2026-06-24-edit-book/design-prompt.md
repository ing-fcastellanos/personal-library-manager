# Prompt de Claude Design — Pantalla de edición de libro (#15)

> Artefacto de entrada para "producir el diseño en Claude Design". No es código: es la
> especificación del handoff. Al integrar, el markup se mapea a los primitivos `components/ui/`
> y reusa los campos ya existentes del alta (#14): `TokenField`, `CoverPreview`, campos de Book
> y de Copy.

## Contexto del producto

Personal Library Manager: app web mobile-first para una biblioteca física del hogar. Pantalla:
**editar un libro** que ya existe en la biblioteca (corregir datos mal capturados, anotar el
ejemplar, cambiar la portada). El usuario es un "lector" autenticado. Ruta `/libros/[id]/editar`.

## Objetivo de la pantalla

Diseñar el editor y sus estados, responsive y accesible, reusando el lenguaje visual del alta
(#14) pero con flujo de edición (cargar → editar → guardar), no de búsqueda/alta.

## Estados a diseñar

1. **Cargando** — mientras se trae el `Book` + `Copy` (skeletons sobre portada y campos).
2. **Edición (principal)** — todos los campos del libro editables, prellenados con los valores
   actuales; sección del ejemplar (estante, condición, adquirido, **notas**). Igual que #14 pero
   sin búsqueda ni candidatos.
3. **Portada** — la portada actual con acciones: **Cambiar** (abre selector de archivo →
   preview de la nueva), **Quitar portada**. Mostrar estado de "subiendo…" y error de
   validación (tipo no imagen / > 5 MB).
4. **Re-enriquecer (diff)** — al pulsar "Re-enriquecer desde fuentes", un panel/modal que lista
   **solo los campos que difieren** entre la fuente y el valor actual, cada uno con la opción
   "traer este valor" vs "mantener el mío" (toggle/checkbox por campo). La portada subida por el
   usuario aparece marcada como "mantener" por defecto.
5. **Validación** — errores inline (p. ej. título requerido), asociados al input.
6. **Guardando / Éxito** — feedback al guardar (toast de éxito) y vuelta a la vista.
7. **Error** — fallo al guardar/subir; mensaje y reintento, datos preservados.

## Campos

- **Libro**: título (requerido), subtítulo, autores (multi), editorial, año, ISBN-13, ISBN-10,
  categorías (multi), idioma, páginas, descripción, **portada** (cambiar/quitar).
- **Ejemplar (Copy)**: estante (select de estantes existentes), condición, fecha de adquisición,
  **notas**.

## Requisitos transversales

- **Mobile-first responsive**: una columna en móvil; a `md+`, dos columnas (datos del libro a la
  izquierda, panel del ejemplar a la derecha) — consistente con el alta (#14).
- **Accesibilidad**: `label` por input; errores ligados por `aria-describedby`; foco visible; el
  panel de re-enrich y el selector de portada atrapan foco; contraste AA; light/dark.
- **Design tokens (M0)**: usar los tokens del design system base (ver `app/style-guide`).

## Anclaje a primitivos / componentes existentes

DEBE mapearse a `components/ui/` (`Input`, `Label`, `Select`, `Button`, `Card`, `Dialog`,
`Badge`, `Skeleton`, `Toast`, `Avatar`) y **reusar** los campos del alta (#14): `TokenField`
(autores/categorías), `CoverPreview`, y los bloques de campos de Book/Copy (que se extraerán a
`BookFields`/`CopyFields`). No reinventar widgets.

## Entregable

Markup/JSX + estilos con tokens para los estados, responsive y accesible, validable contra
`app/style-guide` y el alta (#14) para consistencia visual.
