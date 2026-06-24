## 1. Modelo: procedencia de portada

- [x] 1.1 Agregar `coverSource: z.enum(["metadata","user"]).nullish()` a `bookSchema`/inputs en `lib/types/book.ts`
- [x] 1.2 Persistir/mapear `coverSource` en `services/books/repository.ts` (create/update/mapDoc)
- [x] 1.3 Setear `coverSource: "metadata"` donde se aplica portada de enriquecimiento (intake #14); unit/inferred-type test

## 2. Registro de cambios (auditLog) mínimo

- [x] 2.1 Repo `services/audit/repository.ts`: `recordChange({ entity, entityId, changedFields, readerId })` → escribe doc en `auditLog` con timestamp
- [x] 2.2 Helper para diffear campos cambiados en un PATCH (comparar input vs existente)
- [x] 2.3 Invocar `recordChange` desde `PATCH /api/books/:id` y `PATCH /api/copies/:id` con `readerId` de la sesión; no-op si no hay cambios
- [x] 2.4 Integration test (emulador): un PATCH con cambios escribe un auditLog; no-op no escribe

## 3. Subida de portada (backend)

- [x] 3.1 Servicio `services/covers/service.ts`: valida `contentType` ∈ image/jpeg|png|webp y tamaño ≤ 5 MB; decodifica base64; sube a `covers/<bookId>.<ext>` (admin SDK, reemplaza)
- [x] 3.2 `server/routes/` — `POST /api/books/:id/cover` con `requireAuth` y body-limit elevado solo en esa ruta; setea `coverUrl` + `coverSource:"user"`; 400 si inválido; responde `{ coverUrl }`
- [x] 3.3 Montar la ruta en `server/index.ts`
- [x] 3.4 Tests del endpoint (lane node, servicio mockeado): 200 ok, 400 tipo/tamaño, 401 sin sesión
- [x] 3.5 Integration test del servicio (emulador/admin SDK inyectado): sube y devuelve URL; reemplazo

## 4. Prompt de Claude Design (handoff)

- [x] 4.1 `design-prompt.md` (estados, portada, re-enrich diff, responsive, a11y, anclaje) — ya redactado
- [x] 4.2 Producir el diseño en Claude Design y validar contra `app/style-guide` y el alta (#14)
- [x] 4.3 Capturar el markup/handoff para integración

## 5. Editor (frontend)

- [x] 5.1 Extraer `BookFields`/`CopyFields` reusables desde `components/books/add-book-form.tsx` (#14)
- [x] 5.2 Ruta `app/libros/[id]/editar/page.tsx` (gateada por sesión) que carga `Book` + un `Copy`
- [x] 5.3 `EditBookForm`: edición de Book + un Copy (incluidas notas); guarda con `PATCH /api/books|copies/:id`
- [x] 5.4 Uploader de portada (cambiar → preview → `POST /api/books/:id/cover`) + botón "quitar portada" (`coverUrl=null`)
- [x] 5.5 Re-enriquecer: `GET /api/enrich?isbn=` → diff por campo (traer/mantener) → PATCH solo aceptados; excluir portada `user` por defecto
- [x] 5.6 Validación inline accesible (título requerido); estados cargando/guardando/éxito/error
- [x] 5.7 Reconectar `onEditExisting`/`onViewBook` de #14 (`duplicate-dialog`/`add-book`) → `/libros/[id]/editar`
- [x] 5.8 Tests del componente (lane jsdom): carga+edición+guardar, diff de re-enrich, quitar portada

## 6. Cierre

- [x] 6.1 Pasar lint, typecheck y test suite (unit + integration + jsdom)
- [x] 6.2 QA visual responsive + accesibilidad contra el design system
- [x] 6.3 Verificar criterio de aceptación del #15: corregir cualquier campo y guardar notas por ejemplar
