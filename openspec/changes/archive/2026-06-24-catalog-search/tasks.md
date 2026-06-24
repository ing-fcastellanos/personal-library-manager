## 1. Servicio de búsqueda (in-memory, puro)

- [x] 1.1 `services/catalog/types.ts`: `SearchParams` (q, category, author, publisher, shelf, status, reader, sort, page, limit) y `SearchResult` ({ items, total, page, facets })
- [x] 1.2 `services/catalog/join.ts`: une books + copies + readingEvents → registro por book con `shelfIds` y `statusByReader` (derivado, Decision D); puro
- [x] 1.3 `services/catalog/filter.ts`: búsqueda `slugify(q)` vs titleKey/authorKeys/isbn + filtros combinables (intersección); estado atado a lector; puro
- [x] 1.4 `services/catalog/sort.ts`: orden título/año/autor/addedAt determinista (desempate por id)
- [x] 1.5 `services/catalog/facets.ts`: calcula categorías/autores/editoriales/estantes disponibles
- [x] 1.6 Unit tests (lane node) de join/filter/sort/facets con datos en memoria

## 2. Endpoint

- [x] 2.1 `services/catalog/service.ts`: `searchCatalog(params)` — carga repos (books/copies/events), arma el dataset, aplica join→filter→sort→paginate→facets; queries inyectables para tests
- [x] 2.2 `server/routes/catalog.ts`: `GET /api/catalog/search` parsea query params, default reader = sesión (si hay), responde `{ items, total, page, facets }`
- [x] 2.3 Montar la ruta en `server/index.ts`
- [x] 2.4 Tests del endpoint (lane node, servicio mockeado): parámetros, default sort, 200
- [x] 2.5 Integration test (emulador): siembra books+copies+events y verifica filtro combinado + estado por lector + facetas

## 3. Prompt de Claude Design (handoff)

- [x] 3.1 `design-prompt.md` (catálogo lista/grid + filtros + detalle, estados, responsive, a11y) — ya redactado
- [x] 3.2 Producir el diseño en Claude Design y validar contra `app/style-guide`
- [x] 3.3 Capturar el markup/handoff para integración

## 4. Vista de catálogo (`/catalogo`)

- [x] 4.1 Hook de datos: `GET /api/catalog/search` con estado (q, filtros, sort, page) → resultados + facetas
- [x] 4.2 Componentes desde el handoff sobre `components/ui/`: búsqueda, panel de filtros (facetas), toggle lista/grid, cards, paginación
- [x] 4.3 Estados: cargando (skeletons) / con-resultados / sin-resultados / vacío
- [x] 4.4 Filtro de estado atado a lector (selector de lector); reusar `CoverPreview`
- [x] 4.5 Reemplazar el placeholder de `app/catalogo/page.tsx`; cada card → `/libros/[id]`
- [x] 4.6 Panel de filtros: fijo en desktop, drawer/bottom-sheet en mobile
- [x] 4.7 Tests del componente (lane jsdom): búsqueda/filtro, toggle lista/grid, sin-resultados, navegación al detalle

## 5. Vista de detalle (`/libros/[id]`)

- [x] 5.1 `app/libros/[id]/page.tsx`: carga `GET /api/books/:id` + `/copies` + `/reading-events`
- [x] 5.2 Componente de detalle: info + ejemplares + estado de lectura por lector + botón Editar
- [x] 5.3 Estado no-encontrado (404 amable) y cargando
- [x] 5.4 Re-cablear `onViewBook` de #14 (`components/books/add-book.tsx`) → `/libros/[id]`
- [x] 5.5 Tests del componente (lane jsdom): render de info/ejemplares/estado + Editar navega

## 6. Cierre

- [x] 6.1 Pasar lint, typecheck y test suite (unit + integration + jsdom)
- [x] 6.2 QA visual responsive + accesibilidad contra el design system
- [x] 6.3 Verificar criterio de aceptación del #17: encontrar cualquier libro por búsqueda y filtros combinados
