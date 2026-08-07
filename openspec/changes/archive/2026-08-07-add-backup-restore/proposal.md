## Why

El backup a JSON (#36) solo tiene la mitad del camino: se puede descargar, pero no restaurar. Si se pierde o corrompe la base (Firestore vaciado por error, migración de proyecto, etc.), hoy no hay forma de reconstruir la biblioteca desde ese archivo. Issue #93, la mitad que quedó separada de #36 por su complejidad y riesgo.

## What Changes

- Botón "Restaurar" en `/ajustes`, junto al `BackupButton` existente, que acepta un JSON de backup (formato de #36).
- Validación del archivo con los mismos schemas zod existentes antes de tocar cualquier dato — rechaza archivos que no sean un backup real, con errores claros por campo/entidad.
- Diálogo de confirmación (reusa el patrón de `DeleteShelfDialog`) con una caja de impacto mostrando conteos: cuánto hay hoy vs. cuánto trae el backup, por tipo de entidad.
- Restauración en dos fases, nunca "wipe primero":
  1. **Crear**: cada entidad del backup se recrea con un id nuevo (todo `create*` usa auto-id de Firestore, ninguno acepta un id preexistente), remapeando referencias cruzadas viejo→nuevo en memoria, en orden de dependencias (readers/shelves/books → copies/series → readingEvents/wishlistItems/loans). Los datos actuales siguen intactos durante esta fase.
  2. **Limpiar**: solo si la fase de creación fue 100% exitosa, se borran las entidades que existían antes de empezar (snapshot tomado al inicio), en orden inverso de dependencias, reusando los `DELETE` endpoints existentes (respeta los guards de integridad y queda auditado por #40 naturalmente).
- `readers` queda fuera del ciclo borrar+recrear: se actualiza por email (no existe `POST /api/readers` — los lectores se provisionan fuera de la app, membership cerrada de ADR-0012). Si un reader del backup no matchea ningún email existente, se omite con una advertencia explícita, nunca se crea un registro nuevo. Nunca toca `uid` — se re-linkea solo en el próximo login.
- Si la fase de creación falla parcialmente: no se borra nada del snapshot, se muestra qué falló con opción de reintentar (mismo patrón `retry.payload` del import CSV #35), y el usuario decide si reintenta o aborta dejando un estado mixto (datos viejos + lo nuevo que sí se creó).
- Orquestación client-side (loop + POST/PATCH contra endpoints existentes + contador de progreso + resumen agrupado), igual que el import CSV — no se introduce `batch()` de Firestore para creación masiva (hoy solo se usa para nulear campos en cascada).

## Capabilities

### New Capabilities

- `backup-restore`: sube y valida un JSON de backup, restaura la biblioteca en dos fases (crear todo lo nuevo, limpiar lo viejo solo si todo salió bien), con readers manejados por upsert-de-email y un resumen de resultado con reintento de fallos.

### Modified Capabilities

- `json-backup`: el spec quedó desactualizado — no menciona `series` en el export, agregado silenciosamente después de #38 (misma clase de doc-desactualizada que se encontró y corrigió ya varias veces esta sesión). Se corrige de paso, sin cambiar comportamiento.

## Impact

- **Nuevo**: UI de restore en `/ajustes` (subida de archivo + diálogo de confirmación + progreso + resumen), lógica de orquestación client-side (remapeo de ids, orden de creación/limpieza), reuso de los endpoints `POST`/`PATCH`/`DELETE`/`GET` ya existentes de cada entidad — sin endpoints nuevos en el servidor.
- **Modificado**: `docs/data-model.md` y/o `openspec/specs/json-backup/spec.md` (agregar `series` al export documentado); posiblemente una nota en `auth-session`/`data-model` sobre el upsert-por-email de readers durante restore.
- **Sin cambios**: ningún endpoint nuevo, ninguna dependencia nueva, ningún cambio de esquema Firestore.
