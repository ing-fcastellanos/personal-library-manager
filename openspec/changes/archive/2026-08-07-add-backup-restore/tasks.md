## 1. Validación del archivo

- [x] 1.1 `components/settings/restore.ts`: `parseBackupFile(json: unknown)` — valida cada array (`books`, `copies`, `readingEvents`, `readers`, `shelves`, `wishlistItems`, `loans`, `series`) contra los schemas zod existentes (`lib/types/*.ts`). Devuelve el backup tipado o una lista de errores por entidad/campo. No toca la red ni Firestore.
- [x] 1.2 Tests de `parseBackupFile`: backup válido, archivo con forma incorrecta, JSON no relacionado, un array con una entidad inválida (mensaje de error identifica cuál).

## 2. Snapshot y conteos de impacto

- [x] 2.1 `entityCounts()`/`snapshotFromBackup()` en `restore.ts` — reusan el mismo `Backup` que devuelve `fetchBackup()` para tener, antes de restaurar, tanto el snapshot completo de ids existentes (para la fase de limpieza) como los conteos por tipo (para la caja de impacto del diálogo).

## 3. Orquestación de creación (con remapeo de ids)

- [x] 3.1 `components/settings/restore-run.ts`: `runCreate()` procesa entidades en orden de dependencias — (a) readers: `GET /api/readers` para matchear por email; si hay match, `PATCH /api/readers/:id` con los campos del backup; si no, se omite con una advertencia (NO existe `POST /api/readers` — no se crean readers nuevos, ver design.md); (b) `shelves` y `books` (`POST /api/shelves`, `POST /api/books`); (c) `copies` y `series` (`POST /api/copies` con `bookId`/`shelfId` remapeados, `POST /api/series` con `volumes[].bookId` remapeado); (d) `readingEvents`, `wishlistItems`, `loans` (`POST /api/reading-events` con `readerId`/`bookId`/`copyId` remapeados, `POST /api/wishlist-items` con `readerId`/`bookId` remapeados, `POST /api/loans` con `copyId` remapeado — y si el loan del backup tiene `returnedAt`, un segundo `POST /api/loans/:id/return`). Implementado como 8 bloques secuenciales (no en paralelo como sugería design.md — más simple y con progreso consistente, sin cambio de comportamiento).
- [x] 3.2 Mapa de ids viejo→nuevo en memoria (`RestoreIdMap`), poblado incrementalmente a medida que cada entidad se crea; toda referencia saliente se remapea antes del POST correspondiente, con fallback a `failed` (con motivo) cuando la entidad referenciada no se pudo restaurar.
- [x] 3.3 Progreso: contador `{done, total}` sobre el total de entidades a crear (igual patrón que `add-book-by-csv.tsx`).
- [x] 3.4 Resultado por entidad: `created`/`updated`/`skipped`/`failed` con motivo — `components/settings/restore-summary.ts` (`RestoreOutcome`, `groupRestoreOutcomes`, `creationSucceeded`), adaptado a los 8 tipos de entidad de restore en vez de solo libros.

## 4. Limpieza (solo si 3 fue 100% exitoso)

- [x] 4.1 `runCleanup(snapshot)`: borra las entidades del snapshot del paso 2, en orden inverso (`loans` → `readingEvents`/`wishlistItems` → `copies` → `books`/`series` → `shelves`), llamando a los `DELETE` endpoints existentes. `readers` no participa.
- [x] 4.2 Un delete de limpieza que falla se reporta como outcome `failed` (no lanza, no se silencia) — cubierto por test.
- [x] 4.3 `runCleanup` es una función separada que el componente de UI solo invoca cuando `creationSucceeded(outcomes)` es `true` — nunca se llama automáticamente dentro de `runCreate`. Verificado con tests de `runCreate`/`creationSucceeded` (un fallo de creación deja `creationSucceeded` en `false`); el gating real en la UI se verifica en la tarea 5.4.

## 5. UI

- [x] 5.1 `components/settings/restore-dialog.tsx`: input de archivo, llama a `parseBackupFile`; si es inválido, muestra los errores y no avanza.
- [x] 5.2 Diálogo de confirmación (reusa `Dialog`/`DialogContent`/`DialogHeader`/`DialogFooter` como `DeleteShelfDialog` en `components/shelves/shelves-manager.tsx`): "esta acción no se puede deshacer" + caja de impacto (`role="alert"`) con conteos actuales vs. los del backup, por tipo de entidad.
- [x] 5.3 Vista de progreso durante la restauración (barra/contador, mismo lenguaje visual que `add-book-by-csv.tsx`).
- [x] 5.4 Vista de resumen final: creados/actualizados/omitidos/fallidos por tipo, botón "Reintentar fallidos" (reusa el idMap ya construido — no duplica lo ya creado), mensaje claro cuando quedó en estado mixto (no se llegó a limpiar porque hubo fallos).
- [x] 5.5 Integrado directo en el diálogo (`RestoreDialog` es su propio trigger, como `DeleteShelfDialog`) — agregado junto al `BackupButton` existente en la Card "Backup" de `app/ajustes/page.tsx`.

## 6. Documentación

- [x] 6.1 `openspec/specs/json-backup/spec.md` (delta de esta change) agrega `series` al export documentado.
- [x] 6.2 Revisado: `docs/data-model.md` excluye explícitamente `readers` de su alcance ("ya implementada" antes de #5) — no tiene sección propia donde agregar la nota. El requirement de update-por-email ya está documentado donde corresponde: `specs/backup-restore/spec.md` ("Readers are updated by email match, never created or deleted"). No se duplica en `auth-session` (esa spec describe el mecanismo de login, no el comportamiento de restore).

## 7. Verificación

- [x] 7.1 `npm run typecheck` / lint limpios.
- [x] 7.2 Tests: `restore.test.ts` (validación, conteos, snapshot), `restore-run.test.ts` (orquestación — creación con remapeo, reader sin match, falla en cascada, loan con `returnedAt`, limpieza, reintento — 22 tests), `restore-dialog.test.tsx` (archivo inválido, flujo feliz completo, falla sin limpieza + reintentar visible — 3 tests). Todos verdes.
- [x] 7.3 Verificación live real (no solo con emuladores arriba — sesión autenticada de verdad): usando el truco del REST del emulador de Auth (`accounts:sendOobCode` + `emulator/v1/.../oobCodes` + `accounts:signInWithEmailLink` + `/api/auth/session`, todo ejecutado dentro del propio tab del browser para que la cookie httpOnly quedara en su cookie jar real) se estableció una sesión real como un lector seedeado. Con eso, se ejecutó el flujo completo de `RestoreDialog` contra datos reales (18 libros/19 ejemplares/1 estante/2 lectores seedeados): subida de archivo → diálogo de confirmación con conteos exactos (18/18, 19/19, 2/2, 1/1) → creación → limpieza → "Restauración completa". Verificado en vivo, no solo inferido: la biblioteca terminó con el mismo conteo (no duplicado), CADA id de libro es nuevo (ninguno de los ids viejos sobrevive), los ejemplares referencian correctamente los libros nuevos, y los dos lectores conservaron su mismo `id` y su `uid` (no se recrearon). `/catalogo` renderizó los 18 libros con portadas/filtros/autor/categoría intactos después de restaurar.
  - **Bug real encontrado y corregido durante esta verificación**: la primera corrida terminó en "Restauración completa" pero la limpieza NUNCA se ejecutó (terminó con 36 libros en vez de 18) — closure obsoleta en React: `afterCreate` leía `snapshot` del estado del componente, pero `setSnapshot()` (llamado en la misma función `onConfirm`, justo antes) no se refleja sincrónicamente dentro de esa misma invocación async, así que `afterCreate` veía `snapshot: null` y saltaba la limpieza. Corregido pasando el snapshot calculado localmente como parámetro explícito en vez de leerlo del estado. Se agregó un test de regresión (`restore-dialog.test.tsx`) que ahora afirma explícitamente que el `DELETE` de una entidad preexistente se dispara tras un éxito — el test anterior solo chequeaba el texto "Restauración completa", que es exactamente lo que dejaba pasar este bug. Los datos de prueba duplicados se limpiaron manualmente antes de repetir la verificación, que esta vez sí dio 18/19/1/2 correctamente.
- [x] 7.4 El camino de fallo parcial (sin limpieza, con reintento) está cubierto por tests unitarios/de componente (`restore-run.test.ts`: "fails a copy whose book failed to restore"; `restore-dialog.test.tsx`: "shows the failed group and a retry action without deleting anything when creation fails") — no se simuló un corte de red real contra los emuladores (más disruptivo y menos informativo que el bug real ya encontrado y corregido en 7.3, que ejercitó exactamente el mismo gating `creationSucceeded()` en el camino feliz). El mecanismo de gating quedó probado end-to-end en 7.3 (limpieza corre si y solo si no hay fallos) y unitariamente para el caso con fallos.
