# Prompt de Claude Design — Formulario de alta manual de libro (#14)

> Artefacto de entrada para el paso "producir el diseño en Claude Design" (design.md D6). No es
> código: es la especificación del handoff. Al integrar, el markup se mapea a los primitivos
> `components/ui/` existentes (ver "Anclaje").

## Contexto del producto

Personal Library Manager: app web mobile-first para gestionar una biblioteca física del hogar.
Pantalla: **agregar un libro manualmente**. El usuario (un "lector" autenticado) busca por ISBN
o por título/autor, la app prellena los datos con metadata, el usuario revisa/edita y guarda. La
app avisa si el libro ya existe.

## Objetivo de la pantalla

Diseñar el formulario de alta y todos sus estados, responsive y accesible, listo para mapear a
componentes Next existentes.

## Estados a diseñar (los siete)

1. **Búsqueda (inicial)** — un campo de búsqueda con conmutador ISBN ↔ título/autor; CTA de
   buscar; acceso a "cargar manualmente sin buscar".
2. **Cargando** — mientras `/api/enrich` responde (skeletons o spinner sobre el área de campos).
3. **Prellenado** — campos poblados desde metadata (título, subtítulo, autores, editorial, año,
   ISBN-13/10, categorías, idioma, nº de páginas, descripción) + **portada de preview**; todos
   editables. En búsqueda por título: lista de hasta 5 candidatos rankeados para elegir.
4. **Validación** — errores de campo inline (p. ej. título requerido), asociados al input.
5. **Diálogo de duplicado** — modal al guardar si el libro ya existe: muestra el libro existente
   (título, autor, portada, "ya tienes N ejemplares") y tres acciones: **Omitir**, **Agregar
   como copia**, **Editar el existente** (esta última puede ir deshabilitada con tooltik
   "próximamente"). Además, un **aviso inline no bloqueante** (variante ligera) para cuando se
   detecta el duplicado temprano (al salir del ISBN o elegir candidato).
6. **Error** — fallo de red/servidor al guardar; mensaje y reintento.
7. **Éxito** — confirmación tras guardar, con accesos "ver libro" y "agregar otro".

## Campos del formulario

- **Libro**: título (requerido), subtítulo, autores (multi), editorial, año, ISBN-13, ISBN-10,
  categorías (multi), idioma, nº de páginas, descripción, portada (preview, no subible).
- **Copia (ejemplar)**: estante (select de estantes existentes; opcional), condición, fecha de
  adquisición, notas.

## Requisitos transversales

- **Mobile-first responsive**: diseñar primero a ~380px y escalar a desktop. Layout de una
  columna en móvil; el panel de "copia/estante" puede ir en sección colapsable o segunda columna
  en desktop.
- **Accesibilidad**: cada input con `label` asociado; errores ligados por `aria-describedby`;
  foco visible y orden lógico de tabulación; el diálogo de duplicado atrapa foco y se cierra con
  Esc; contraste AA.
- **Design tokens (M0)**: usar los tokens del design system base (colores, tipografía,
  espaciado, radios) — ver `app/style-guide`. Nada de colores/medidas hardcodeadas.

## Anclaje a primitivos existentes (para el handoff)

El diseño DEBE poder mapearse a estos componentes ya presentes en `components/ui/`, sin
reinventarlos: `Input`, `Label`, `Select`, `Button`, `Card`, `Dialog` (para el modal de
duplicado), `Badge` (categorías), `Skeleton` (cargando), `Toast` (éxito/error), `Avatar`/imagen
(portada). Preferir composición de estos a inventar widgets nuevos.

## Entregable

Markup/JSX + estilos con tokens para los siete estados, responsive y accesible, validable contra
`app/style-guide` y el design system base (M0).
