## Why

El catálogo ya tiene API de lectura/escritura (#12), enriquecimiento de metadata (#13) y
detección de duplicados (#16), pero **no hay forma de agregar un libro desde la app** — las
rutas `app/agregar` y `app/catalogo` son placeholders. El issue #14 cierra ese hueco: un
formulario de alta manual que busca por ISBN/título (prellenando con metadata), deja editar,
avisa de duplicados y guarda. Es la primera pieza con UI real del catálogo y el punto donde se
*conecta* todo lo construido en M2. Sus cuatro dependencias (#12, #13, #16, #6 design system)
ya están listas.

## What Changes

- **Endpoint compuesto** `POST /api/books/intake`: crea `Book` + `Copy` en una operación y
  **re-hospeda la portada** del candidato a Storage vía admin SDK — aquí por fin se cablea
  `rehostCover()` que #13 dejó lista (design D6). El re-hospedaje es **best-effort**: si la
  descarga falla, el libro se crea igual (con `coverUrl` externa o nula).
- **Formulario de alta** (`app/agregar`) como máquina de estados: búsqueda → prellenado →
  edición → pre-chequeo de duplicados → guardar → éxito, más el camino de alta manual pura.
  - Búsqueda/prellenado vía `GET /api/enrich` (#13).
  - Pre-chequeo de duplicados (#16) en tres momentos: **blur del ISBN**, **selección de un
    candidato** de búsqueda, y **al Guardar** (red de seguridad que garantiza el criterio de
    aceptación). ① y ② son avisos no bloqueantes; ③ interrumpe con un diálogo modal.
  - Diálogo de duplicado con **omitir** / **agregar copia** (`POST /api/copies` con el `bookId`
    existente) / **editar** (se **difiere a #15**; deshabilitado/oculto hasta que exista).
  - Asociación a **estante existente** (seleccionar, no crear — el mapa es #18).
- **Prompt de Claude Design** como artefacto del change (`design-prompt.md`): especifica los
  estados, responsive mobile-first, accesibilidad y design tokens, anclado a los primitivos
  `components/ui/` existentes para que el handoff mapee a ellos.
- **Gating de escritura** (ADR-0006): el alta requiere sesión; se reusa el patrón de
  `WriteCta`/`SignInPrompt` ya presente.

**Fuera de alcance:** crear estantes, subir portada propia (depende de #3, cerrado), libro sin
copia (wishlist, #37), y la edición completa del libro (#15).

## Capabilities

### New Capabilities
- `catalog-add`: alta manual de un libro — endpoint compuesto `POST /api/books/intake` que crea
  `Book`+`Copy` con re-hospedaje de portada best-effort, y el flujo de UI de alta (búsqueda,
  prellenado, validación, pre-chequeo de duplicados, asociación a estante, guardar).

### Modified Capabilities
<!-- Ninguna requirement existente cambia: catalog-api/enrichment/duplicates se consumen tal
     cual. El endpoint intake es una capability nueva que orquesta endpoints existentes. -->

## Impact

- **Backend nuevo**: `server/routes/intake.ts` (`POST /api/books/intake`) y un servicio de
  orquestación `services/intake/` (crea Book vía repo #12, invoca `rehostCover` #13, crea Copy
  #12). Montado en `server/index.ts`.
- **Frontend nuevo**: `app/agregar/page.tsx` deja de ser placeholder; componentes de formulario
  en `components/` mapeados desde el handoff de Claude Design, sobre `components/ui/` existentes.
- **Storage**: primera escritura real de portadas (admin SDK; no abre `storage.rules`).
- **Reusa**: `/api/enrich` (#13), `/api/books/duplicates` (#16), `POST /api/copies` y repos
  (#12), `useReaders`/patrón de fetch y `WriteCta`/auth (#6/#8).
- **Consumidores aguas abajo**: deja la ruta de edición lista para que #15 la implemente; el
  patrón de intake lo reusará el alta por IA (#20/#21).
- **Dependencias**: #12, #13, #16, #6 — todas completas.
