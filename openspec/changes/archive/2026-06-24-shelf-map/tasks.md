## 1. Datos: estantes + conteos

- [x] 1.1 Hook `useShelvesWithCounts`: carga `GET /api/shelves` (lista completa) y `GET /api/catalog/search` (facetas) → estantes con `bookCount` (0 si no aparece en facetas)
- [x] 1.2 Helpers de mutación: crear (`POST /api/shelves`), editar (`PATCH /api/shelves/:id`), borrar (`DELETE /api/shelves/:id`) con manejo de error
- [x] 1.3 Unit test (jsdom o puro) del merge estantes↔conteos (estante sin libros → 0)

## 2. Prompt de Claude Design (handoff)

- [x] 2.1 `design-prompt.md` (sección Estantes: lista/crear/editar/borrar + estados) — ya redactado
- [x] 2.2 Producir el diseño en Claude Design y validar contra `app/style-guide` y `ReadersManager`
- [x] 2.3 Capturar el markup/handoff para integración

## 3. ShelvesManager (UI)

- [x] 3.1 `components/shelves/shelves-manager.tsx`: lista de estantes (nombre, ubicación, descripción, conteo) sobre `components/ui/`
- [x] 3.2 Crear/editar estante (Dialog): nombre (requerido), ubicación, descripción; validación inline
- [x] 3.3 Borrar con confirmación: aviso "N libros quedarán sin estante" cuando el conteo > 0
- [x] 3.4 "Ver contenido" por estante → `Link` a `/catalogo?shelf=<id>`
- [x] 3.5 Estados: lista / vacío (EmptyState + CTA) / cargando (skeletons)
- [x] 3.6 Agregar sección "Estantes" en `app/ajustes/page.tsx`
- [x] 3.7 Tests del componente (lane jsdom): listar+conteos, crear, editar, borrar con aviso, navegar a contenido

## 4. Preselección por QR (`useShelf()`)

- [x] 4.1 Catálogo: si `useShelf()` trae un `shelf` que existe en las facetas, preseleccionar el filtro de estante al montar (una vez, limpiable)
- [x] 4.2 Alta (#14, `add-book.tsx`): predefinir el `shelfId` del nuevo `Copy` con el `shelf` de `useShelf()`
- [x] 4.3 Tests (lane jsdom): catálogo preselecciona el estante; el alta arranca con ese estante

## 5. Cierre

- [x] 5.1 Pasar lint, typecheck y test suite (unit + integration + jsdom)
- [x] 5.2 QA visual responsive + accesibilidad contra el design system
- [x] 5.3 Verificar criterio de aceptación del #18: asignar ejemplar a estante y ver el contenido de cada estante
