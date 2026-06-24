## Why

El catálogo tiene libros (alta #14, edición #15, enriquecimiento #13, duplicados #16) pero
**no hay forma de explorarlos**: `app/catalogo` es un placeholder, así que no existe puerta de
entrada para ver, buscar ni llegar a un libro. Los enganches de #14/#15 (`onViewBook`,
`onEditExisting`) apuntan a rutas que aún no tienen lista que los alcance. El issue #17 cierra
ese hueco con búsqueda + filtros + una vista de detalle, completando el flujo del catálogo de
punta a punta. Depende de #12 (repos) y #6 (design system), ambos listos.

Firestore no hace full-text ni filtros combinados cross-colección, y los filtros que pide el
issue viven en tres colecciones (`books`, `copies`, `readingEvents`). Como la biblioteca es del
hogar (< 1000 libros), la respuesta es filtrar **en memoria**: el server carga todo, hace el
join y filtra/ordena/pagina — cumpliendo "filtros combinados" sin acrobacias de índices.

## What Changes

- **Endpoint de búsqueda** `GET /api/catalog/search` (server, in-memory): carga `books` +
  `copies` + `readingEvents`, los une por libro, y filtra/ordena/pagina:
  - **Búsqueda** por `q` normalizado con `slugify` contra `titleKey`/`authorKeys`/`isbn`.
  - **Filtros combinables**: categoría, autor, editorial (book), estante (copies), y estado de
    lectura **atado a un lector** (readingEvents; default: lector de sesión).
  - **Orden**: título / año / autor / fecha-agregado. **Paginación** por slice (page/limit).
  - Responde `{ items, total, page, facets }` — las **facetas** (categorías/autores/editoriales/
    estantes disponibles) las calcula el server para que el panel de filtros se llene solo.
- **Vista `/catalogo`** (reemplaza el placeholder): búsqueda + panel de filtros + resultados en
  **lista y grid** (toggle), con estados vacío / cargando / sin-resultados. Cada card enlaza a
  la vista de detalle.
- **Vista de detalle `/libros/[id]`**: read-only — info del libro + ejemplares + estado de
  lectura por lector + acción **Editar** (→ `/libros/[id]/editar`). Se compone de endpoints que
  ya existen (`GET /api/books/:id`, `/copies`, `/reading-events`); sin backend nuevo.
- **Re-cablear** `onViewBook` (#14) → `/libros/[id]` (detalle), en vez de ir directo al editor.
- **Prompt de Claude Design** del catálogo + detalle como artefacto del change.

**Fuera de alcance:** "marcar como leído" y "agregar copia" desde el detalle (son M4 #24 / el
flujo de #14); búsqueda full-text avanzada / índice externo (no necesario a esta escala); el
mapa de estantes (#18). El recargado completo por búsqueda se asume aceptable a < 1000 libros;
el cache queda como optimización futura.

## Capabilities

### New Capabilities
- `catalog-search`: explorar el catálogo — endpoint de búsqueda/filtro/facetas in-memory
  (`GET /api/catalog/search`), la vista `/catalogo` (lista/grid + filtros) y la vista de detalle
  `/libros/[id]`.

### Modified Capabilities
<!-- Ninguna requirement existente cambia: se consumen los repos/endpoints de catalog-api tal
     cual. Re-cablear onViewBook es un detalle de UI de #14, no un cambio de requirement. -->

## Impact

- **Backend nuevo**: `services/catalog/` (carga + join + filtro + orden + facetas, puro y
  testeable) y `server/routes/catalog.ts` (`GET /api/catalog/search`), montado en
  `server/index.ts`. Reusa `slugify` (#12) y los repos de books/copies/reading-events (#12).
- **Frontend nuevo**: `app/catalogo/page.tsx` (deja de ser placeholder) y `app/libros/[id]/`
  (detalle), más componentes en `components/catalog/` mapeados desde el handoff de Claude Design
  sobre `components/ui/`. Re-cablea `components/books/add-book.tsx` (`onViewBook`).
- **Reusa**: `GET /api/books/:id`, `/books/:id/copies`, `/books/:id/reading-events` (#12), y la
  derivación de estado de lectura por lector (Decision D del data-model).
- **Sin índices nuevos** en `firestore.indexes.json` (el filtrado es in-memory).
- **Dependencias**: #12, #6 — listos. Cierra el loop de navegación de #14/#15 y completa M2
  junto con #18.
