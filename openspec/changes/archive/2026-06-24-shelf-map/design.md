## Context

#18 es el último de M2 y está casi hecho a nivel de datos: `Shelf` (name/location/description),
`Copy.shelfId`, CRUD de estantes (`/api/shelves` con `unshelveByShelf` al borrar, #12), la
asignación desde alta/edición (#14/#15), y el filtro `/catalogo?shelf=` con `facets.shelves`
(conteos) del catálogo (#17). Falta la UI de gestión (los estantes solo se crean por seed/API) y
el cableado de `useShelf()` (#10 captura `?shelf=`; su comentario difiere la preselección a #18).
El patrón de gestión de metadata del hogar ya existe: `ReadersManager` en `/ajustes`.

## Goals / Non-Goals

**Goals:**
- Gestionar estantes desde la app (crear, editar nombre/ubicación/descripción, borrar con aviso).
- Ver qué hay en cada estante (criterio de aceptación).
- Cerrar el cabo del QR: preseleccionar el estante desde `?shelf=`.

**Non-Goals:**
- Mapa **espacial** (plano 2D / coordenadas) — el modelo no las tiene; otro change.
- Generación/impresión de QR por estante (#33, M6).
- Backend nuevo — el CRUD y los conteos ya existen.

## Decisions

### D1 — `ShelvesManager` en `/ajustes` (no ruta dedicada)
Espeja `ReadersManager`: una sección "Estantes" en Ajustes con la lista y las acciones CRUD.
Consistente con cómo se gestiona la otra metadata del hogar (lectores) y sin tocar el shell de
nav (5 secciones fijas).
*Alternativa descartada:* ruta `/estantes` con entrada de nav propia — estantes de primera clase,
pero más pesado y toca el shell; innecesario para v1.

### D2 — "Ver contenido" reusa el filtro del catálogo (#17)
Cada estante enlaza a `/catalogo?shelf=<id>`; el catálogo ya filtra por estante y muestra los
libros. No se construye una vista `/estantes/[id]` dedicada.
*Alternativa descartada:* vista dedicada por estante — una pantalla más para algo que el catálogo
ya hace.

### D3 — Conteos desde las facetas del catálogo (sin backend nuevo)
El `ShelvesManager` obtiene el conteo de libros por estante de `GET /api/catalog/search` →
`facets.shelves` (que ya cuenta libros con copia en cada estante). Un estante sin libros no
aparece en las facetas → conteo 0. Así el manager muestra "N libros" y calcula el aviso de
borrado sin un endpoint de conteo nuevo.

### D4 — Borrado con aviso; el backend desestantea
`DELETE /api/shelves/:id` ya llama `unshelveByShelf` (nulifica `shelfId` de las copias) antes de
borrar (#12 D3). El UI agrega un diálogo de confirmación que, cuando el conteo > 0, advierte
"N libros quedarán sin estante".

### D5 — Preselección por QR vía `useShelf()`
`useShelf()` ya expone el `?shelf=` capturado de un escaneo (#10). Se cablea:
- **Catálogo**: si hay `shelf` y existe en las facetas, se preselecciona el filtro de estante al
  montar (una sola vez; el usuario puede limpiarlo).
- **Alta (#14)**: el `select` de estante del nuevo `Copy` arranca con ese estante por defecto.
La preselección es no intrusiva (default inicial, no bloqueo).

### D6 — Exponer `location` y `description`
Hoy sin uso en UI. El manager los edita y los muestra (p. ej. "Living · pared norte"), dando
sentido a los campos que el modelo ya tenía.

## Risks / Trade-offs

- **Conteos vía facetas** dependen del catálogo; si el catálogo cambiara su respuesta, el manager
  se ajusta. A escala del hogar es una sola llamada barata (ya in-memory, #17).
- **Estante recién creado sin libros** no aparece en `facets.shelves` → el manager debe partir de
  `GET /api/shelves` (la lista completa) y *anexar* el conteo de las facetas (0 si falta), no al
  revés.
- **Preselección por QR** podría sorprender si el `?shelf=` quedó "pegado" en sessionStorage; se
  aplica solo como default inicial y siempre es limpiable, y se documenta.
- **"Mapa" no espacial** puede no cumplir una expectativa de plano visual; se acota explícito en
  el proposal (modelo sin coordenadas) y se deja como posible change futuro.
- **Borrado**: el aviso evita la sorpresa de copias desestanteadas; la operación no es reversible
  (el `shelfId` se pierde), aceptable para metadata organizacional.
