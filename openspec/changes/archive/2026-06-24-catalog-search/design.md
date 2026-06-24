## Context

`app/catalogo` es un placeholder; no hay forma de explorar libros ni de llegar a la edición
(#15) salvo por URL o desde los flujos de #14. Los filtros del issue viven en tres colecciones:
book-level (título/autor/categoría/editorial/ISBN en `books`), copy-level (estante en `copies`)
y por-lector (estado de lectura derivado de `readingEvents`, Decision D — sin flag
denormalizado). Firestore no hace full-text, ni join cross-colección, ni multi-filtro arbitrario
(un solo `array-contains` por query; cada combinación pediría un índice compuesto). La
biblioteca es del hogar (< 1000 libros). Ya existen `slugify`/`titleKey`/`authorKeys` (#12/#13)
y los endpoints `GET /api/books/:id`, `/books/:id/copies`, `/books/:bookId/reading-events`.

## Goals / Non-Goals

**Goals:**
- Encontrar cualquier libro por **búsqueda + filtros combinados** (criterio de aceptación).
- Vista `/catalogo` (lista/grid + filtros) y vista de detalle `/libros/[id]`.
- Cerrar el loop de navegación: catálogo → detalle → editar.

**Non-Goals:**
- "Marcar como leído" / "agregar copia" desde el detalle (M4 #24 / flujo #14).
- Full-text avanzado / índice externo (Algolia/Typesense) — innecesario a esta escala.
- Mapa de estantes (#18). Cache/optimización del recargado (futuro).

## Decisions

### D1 — Filtrado in-memory en el server (no Firestore-nativo)
`GET /api/catalog/search` carga `books` + `copies` + `readingEvents` (todo, < 1000 libros), los
une por `bookId` en memoria, y filtra/ordena/pagina ahí. Esto cumple "filtros combinados" y
full-text sin índices compuestos ni denormalización.
*Alternativa descartada:* Firestore-nativo (no combina cross-colección, explosión de índices) y
denormalizar facetas en `books` (sigue limitado a 1 `array-contains`/query, consistencia). Un
índice externo es sobre-ingeniería para una biblioteca del hogar y rompe el bajo costo (ADR-0001).

### D2 — Join cross-colección en memoria
Por cada book se computa un registro enriquecido: `shelfIds` (de sus `copies`) y
`statusByReader` (de sus `readingEvents`, derivado por Decision D). Sobre ese registro corren
los filtros de estante y de estado-por-lector que Firestore no puede combinar.

### D3 — Búsqueda normalizada (no substring crudo)
`q` se normaliza con `slugify` y se matchea contra `titleKey`, `authorKeys` (token/prefijo) e
`isbn13`/`isbn10`. Consistente con el resto del catálogo (sin acentos, mismos slugs).
*Alternativa descartada:* substring crudo sobre display — inconsistente con los slugs y sensible
a acentos.

### D4 — Estado de lectura atado a un lector
El filtro de estado requiere un lector (default: el de la sesión). Un book matchea
`status=reading & reader=Frank` si existe `ReadingEvent(readerId=Frank, status=reading)`. Sin
lector seleccionado, el filtro de estado se ignora.

### D5 — Respuesta con facetas
`{ items, total, page, facets: { categories, authors, publishers, shelves } }`. Como el server
ya tiene todo en memoria, calcula las facetas disponibles (con conteos) para poblar el panel sin
una segunda llamada. Las facetas reflejan el dataset completo (o el filtrado, a decidir en apply;
default: dataset completo para no "vaciar" el panel).

### D6 — Orden y paginación simples
Orden por `title` (default), `year`, `author`, `addedAt` (createdAt). Paginación por `page`/
`limit` con `slice` en memoria; `total` para los controles. Determinista (desempate por id).

### D7 — Vista de detalle `/libros/[id]` read-only, compuesta de endpoints existentes
Detalle = `GET /api/books/:id` + `/books/:id/copies` + `/books/:id/reading-events`, con estado de
lectura derivado por lector. Acción **Editar** → `/libros/[id]/editar`. "Marcar leído"/"+copia"
se difieren a su milestone. El card del catálogo enlaza acá; `onViewBook` (#14) se re-cablea a
`/libros/[id]`.

### D8 — Lista y grid con el mismo dato
Toggle lista/grid sobre los mismos `items`: grid = card con portada grande; lista = fila
compacta. Estados vacío / cargando / sin-resultados. El panel de filtros es fijo en desktop y un
drawer/bottom-sheet en mobile (handoff de diseño).

## Risks / Trade-offs

- **Recargar books+copies+events por búsqueda** → a < 1000 libros son centavos de lecturas
  Firestore y milisegundos; se documenta el cache como optimización futura si crece.
- **El join in-memory escala ~miles, no millones** → asunción explícita del dominio (hogar); si
  cambiara, se migra a denormalización o índice externo (no en v1).
- **Facetas del dataset completo vs filtrado** → mostrar siempre todas evita un panel que se
  "vacía"; el conteo puede no reflejar la selección actual (aceptable en v1).
- **Detalle sin "marcar leído"/"+copia"** → botones omitidos hasta su milestone para no inventar
  flujos; el detalle queda informativo + Editar.
- **Búsqueda por prefijo/token, no fuzzy** → "garcia marquez" matchea por slugs; errores de
  tipeo no se corrigen (aceptable; el fuzzy es de duplicados #16, no de browse).
