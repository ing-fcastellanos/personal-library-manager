## Why

El issue #18 (último de M2) registra en qué estante está cada ejemplar y permite ver el
contenido de cada estante. Gran parte ya existe: el modelo `Shelf` (nombre, ubicación,
descripción), la asociación `Copy.shelfId`, el **CRUD completo de estantes** (con
desestanteado automático al borrar), la **asignación** desde el alta (#14) y la edición (#15), y
el **filtro por estante del catálogo** (#17, `/catalogo?shelf=`). Lo que falta es la **UI para
gestionar estantes** (hoy solo se crean por seed/API) y cerrar el cabo del **QR de estante**: el
`shelf-context` (#10) ya captura `?shelf=` y su comentario difiere explícitamente la
"preselection logic" a #18. Depende de #12 (repos) y #6 (design system), ambos listos.

## What Changes

- **Gestión de estantes** `ShelvesManager` en `/ajustes` (espeja `ReadersManager`): lista de
  estantes con **conteo de libros**, crear, editar (nombre, **ubicación**, **descripción**) y
  borrar con **aviso** ("N libros quedarán sin estante"). Reusa los endpoints de Shelf CRUD
  existentes; los conteos salen de las **facetas** del catálogo (`GET /api/catalog/search` →
  `facets.shelves`), sin backend nuevo.
- **Ver contenido de un estante**: cada estante enlaza a `/catalogo?shelf=<id>` (reusa el filtro
  de #17); no se crea una vista nueva.
- **Preselección por QR**: cablear `useShelf()` (que ya captura `?shelf=`) para **preseleccionar
  el filtro de estante** en el catálogo y **predefinir el estante** del nuevo `Copy` en el alta.
- **Prompt de Claude Design** de la gestión de estantes (+ el estado del contenido por estante)
  como artefacto del change.

**Fuera de alcance:** un mapa **espacial** literal (plano 2D / coordenadas) — el modelo `Shelf`
no tiene coordenadas; sería otro change con cambio de modelo. La generación/impresión de QR por
estante es **M6 (#33)**; #18 solo deja los estantes gestionables y la preselección lista.

## Capabilities

### New Capabilities
- `shelf-map`: gestión de estantes y vista de su contenido — `ShelvesManager` en Ajustes (CRUD
  con conteos y aviso de borrado), enlace al contenido vía el filtro de catálogo, y preselección
  de estante desde un escaneo (`useShelf()`).

### Modified Capabilities
<!-- Ninguna requirement existente cambia: el CRUD de estantes (catalog-api/#12) y el filtro del
     catálogo (catalog-search/#17) se consumen tal cual. Wirear useShelf() es un detalle de UI. -->

## Impact

- **Frontend nuevo**: `components/shelves/shelves-manager.tsx` (CRUD UI) y una sección "Estantes"
  en `app/ajustes/page.tsx`. Cableado de `useShelf()` en `components/catalog/catalog-browse.tsx`
  (preselección del filtro) y en `components/books/add-book.tsx` (estante por defecto del Copy).
- **Backend**: **sin cambios** — Shelf CRUD (`/api/shelves`, con `unshelveByShelf` al borrar) y
  `GET /api/catalog/search` (facetas con conteos) ya existen.
- **Reusa**: `GET/POST/PATCH/DELETE /api/shelves` (#12), `facets.shelves` (#17), el filtro
  `/catalogo?shelf=` (#17), el patrón `ReadersManager` (#8) y `useShelf()` (#10).
- **Dependencias**: #12, #6 — listos. Cierra **M2 — Catálogo / CRUD de libros** y deja la base
  para el QR por estante (#33, M6).
