# Prompt de Claude Design — Catálogo (browse) + Detalle de libro (#17)

> Artefacto de entrada para "producir el diseño en Claude Design". No es código: especifica el
> handoff. Al integrar, el markup se mapea a `components/ui/` y reusa `CoverPreview` y los chips
> (`Badge`/`TokenField`) del alta/edición (#14/#15).

## Contexto del producto

Personal Library Manager: app web mobile-first para una biblioteca física del hogar (dos
lectores). Dos pantallas:
1. **Catálogo** (`/catalogo`) — explorar/buscar/filtrar la biblioteca.
2. **Detalle de libro** (`/libros/[id]`) — ver un libro, sus ejemplares y su estado de lectura.

## Pantalla 1 — Catálogo (browse)

### Estructura
- **Búsqueda** (input con ícono) por título/autor/ISBN.
- **Panel de filtros**: categoría, autor, editorial, estante, lector, estado de lectura. Las
  opciones vienen del backend (facetas) con conteos. Botón "limpiar filtros".
- **Resultados** con toggle **lista ⇄ grid**:
  - **Grid**: card con portada grande, título, autores, año, chips (categoría/estante/estado).
  - **Lista**: fila compacta (portada chica + título/autores + chips a la derecha).
- **Orden**: selector (título / año / autor / agregado recientemente).
- **Paginación**: controles con total de resultados.

### Estados
1. **Cargando** — skeletons de cards (grid) / filas (lista).
2. **Con resultados** — el toggle lista/grid.
3. **Sin resultados** — mensaje "no encontramos libros con esos filtros" + limpiar.
4. **Vacío (catálogo sin libros)** — EmptyState + CTA "Agregar libro".

### Responsive
- **Desktop**: panel de filtros fijo a la izquierda, resultados a la derecha.
- **Mobile**: botón "Filtros" → drawer/bottom-sheet; resultados a pantalla completa; toggle
  lista/grid accesible.

## Pantalla 2 — Detalle de libro (`/libros/[id]`)

Read-only + acción Editar:
- **Cabecera**: portada + título + subtítulo + autores + editorial · año · ISBN · idioma ·
  páginas; chips de categorías. Botón **Editar** (→ `/libros/[id]/editar`).
- **Descripción**.
- **Ejemplares**: lista de copias (estante, condición, fecha, notas).
- **Lectura**: estado por lector (p. ej. "Frank: leído ✓ · Dang: —"), derivado de eventos.
- (Las acciones "marcar como leído" / "agregar copia" NO van en v1 — son de otro milestone; no
  diseñar botones para ellas o dejarlos claramente deshabilitados.)

### Estados
- Cargando (skeleton), cargado, no-encontrado (404 amable con volver al catálogo).

## Transversales

- **Mobile-first responsive**; **accesibilidad** (labels, foco visible, drawer con foco
  atrapado, navegación por teclado, contraste AA); **light/dark**.
- **Design tokens (M0)** — usar los del design system base (ver `app/style-guide`).
- **Anclaje**: mapear a `components/ui/` (`Input`, `Select`, `Button`, `Card`, `Badge`,
  `Skeleton`, `Dialog`/drawer, `Avatar`) y reusar `CoverPreview` de `components/books`.

## Entregable

Markup/JSX + estilos con tokens para ambas pantallas y sus estados, responsive y accesible,
validable contra `app/style-guide` y consistente con el alta/edición (#14/#15).
