## Context

El backup (#36, `components/settings/backup.ts`) es una agregación 100% client-side de los endpoints GET públicos existentes — no hay un endpoint de export en el servidor, y por lo tanto tampoco hay un formato "propietario" más allá de lo que cada `GET /api/<entidad>` ya devuelve. Restore hereda esa misma filosofía: sin endpoint nuevo en el servidor, orquestación client-side contra los endpoints ya existentes.

Todo `create*` de cada repositorio usa `collection().doc()` sin argumento — auto-id de Firestore, ninguno acepta un id preexistente (convención documentada en `docs/data-model.md`: "documentos con auto-id"). Esto es la restricción central del diseño: restaurar no puede "reproducir" los ids del backup, tiene que recrear cada entidad con un id nuevo y remapear toda referencia cruzada.

No existe ningún precedente de borrado masivo de colecciones en producción — el único (`services/test-utils/firestore.ts` `clearFirestore()`) se niega a correr fuera del emulador Firestore. Tampoco existe un tier de admin: cualquier lector con sesión (`requireAuth`) tiene acceso completo, igual que hoy puede editar o borrar cualquier libro.

`readers` no tiene `DELETE /api/readers/:id` — nunca existió una forma de borrar un lector desde la app.

## Goals / Non-Goals

**Goals:**
- Restaurar un backup propio (formato de #36) reconstruye la biblioteca de forma correcta y predecible, sin requerir intervención manual en Firestore.
- Nunca dejar la biblioteca en un estado con MENOS datos de los que tenía antes de empezar, incluso si la restauración falla a mitad de camino.
- Reusar toda la infraestructura existente (endpoints, schemas zod, patrón de diálogo de confirmación, patrón de orquestación del import CSV) — cero endpoints nuevos, cero dependencias nuevas.

**Non-Goals:**
- Merge/reconciliación selectiva ("es el mismo libro, no lo dupliques") — no hay una key estable confiable (ISBN no es único por edición) y es un problema de deduplicación mucho más difícil, fuera de foco.
- Un tier de admin/permisos — el issue lo señala como riesgo pero no lo resuelve acá; se acepta el mismo modelo de acceso que ya tiene toda la app.
- Restaurar backups de otro formato o de otra app.

## Decisions

**`readers`: actualizar por email, nunca crear ni borrar.**
Tres razones independientes, no solo dos: (1) no existe `DELETE /api/readers/:id`, así que "borrar y recrear" readers no se puede implementar sin agregar un endpoint de borrado que hoy no existe; (2) tampoco existe `POST /api/readers` — los readers se provisionan fuera de la app (seed/alta manual), nunca desde la UI, consistente con la membership cerrada de ADR-0012 (la app no es "self-service signup"); (3) por `auth-session`, el login matchea por **email** y linkea `uid` en el momento si el reader no tiene uno (`assignUid`) — el backup de un reader nunca incluye `uid` (excluido a propósito desde #36), así que ni siquiera hace falta preservarlo.

Restore entonces hace **solo actualización, nunca alta**: por cada reader del backup, busca un reader existente con el mismo email (`GET /api/readers`) y le `PATCH` sus campos (`name`, `avatar`, `displayColor`, `goodreadsUrl`, `preferences`). Si el backup trae un reader cuyo email no matchea a ningún reader existente, **no se crea nada** — se reporta como advertencia explícita en el resumen ("no se restauró `<nombre>`: no hay un lector con ese email en esta biblioteca — los lectores se dan de alta aparte"), nunca como fallo silencioso ni como creación de un registro fantasma. Nunca se toca `uid` ni `pinHash`.

**Semántica de reemplazo: crear-primero, limpiar-después — nunca wipe-primero.**
Alternativa descartada: borrar todo primero y después recrear desde el backup. Es más simple de implementar pero tiene una falla catastrófica — si la creación falla a mitad de camino (red, un registro inválido, lo que sea), la biblioteca queda con MENOS datos que al empezar, sin tier de admin que pueda intervenir. La alternativa elegida invierte el orden:
1. **Snapshot**: se listan los ids que existen HOY en cada colección (excepto `readers`) vía los mismos `GET` que usa `fetchBackup()`.
2. **Crear**: se recrea TODO el contenido del backup como entidades nuevas. Los datos actuales conviven sin tocarse durante esta fase — un fallo acá nunca borra nada.
3. **Limpiar**: solo si el paso 2 fue 100% exitoso, se borran las entidades del snapshot del paso 1, en orden inverso de dependencias, reusando los `DELETE` endpoints existentes (no un borrado "crudo" a la colección) — así se respetan los guards de integridad existentes (`bookHasCopies`/`bookHasEvents`, `copyHasLoans`) sin tener que reimplementarlos, y cada borrado queda auditado por #40 de forma natural (una restauración grande va a generar muchas entradas de auditoría de golpe — se acepta, no se silencia).

Si el paso 2 falla parcialmente: no se borra nada del snapshot. Se muestra qué entidades fallaron con la opción de reintentarlas (mismo patrón `retry.payload` que ya usa el import CSV en `components/books/import-summary.ts`), y el usuario decide si reintenta hasta completar el 100% (y entonces sí se dispara la limpieza) o abandona, quedando con datos viejos + lo nuevo que sí se creó — un estado mixto que se comunica explícitamente, no silenciosamente.

**Orden de creación** (grafo de dependencias, ver proposal): `readers` (upsert) y `shelves`/`books` (sin dependencias, en paralelo) → `copies`/`series` (dependen de books/shelves) → `readingEvents`/`wishlistItems`/`loans` (dependen de readers/books/copies). Cada entidad creada aporta un par `idViejo → idNuevo` a un mapa en memoria; toda referencia saliente (`bookId`, `shelfId`, `copyId`, `readerId`, `volumes[].bookId`) se reescribe con el id nuevo antes del POST correspondiente. Un `loan` con `returnedAt` ya seteado en el backup necesita DOS llamadas: `POST /loans` (lo crea abierto) seguido de `POST /loans/:id/return` (lo cierra) — no hay un `PATCH` de loans que permita crearlo ya cerrado en un solo paso.

**Orden de limpieza** (inverso): `loans` → `readingEvents`/`wishlistItems` → `copies` → `books`/`series` (sin orden relativo entre estos dos — confirmado que `series` no bloquea el delete de un book, solo `copies`/`readingEvents` lo hacen) → `shelves`. `readers` no participa (upsert, no delete).

**Orquestación: calca el patrón del import CSV, no Firestore `batch()`.**
`components/books/import/persist.ts` + `add-book-by-csv.tsx` ya resuelven "crear muchas entidades desde datos externos, con progreso y resumen de resultado" — loop client-side, un POST/PATCH por entidad, contador `{done, total}`, resultado agrupado (éxito/falla) con `retry.payload` para reintentar. Restore reutiliza esa misma forma en vez de introducir Firestore `batch()` para creación masiva (hoy `batch()` solo existe para nulear campos en cascada — `services/wishlist/repository.ts`, `services/copies/repository.ts` — nunca para crear, y tiene el límite de 500 operaciones que habría que trocear manualmente sin precedente en el repo).

**Confirmación: reusa el `Dialog` existente, no un patrón nuevo de "escribí X para confirmar".**
`DeleteShelfDialog` (`components/shelves/shelves-manager.tsx`) ya es el patrón establecido para acciones destructivas: `Dialog` genérico + "esta acción no se puede deshacer" + una caja de impacto condicional (`role="alert"`) cuando hay algo que perder. Restore reusa esa forma, con la caja de impacto mostrando conteos reales por entidad: cuánto hay hoy (del snapshot) vs. cuánto trae el backup.

**Validación: los mismos schemas zod existentes, antes de tocar cualquier dato.**
El JSON subido se parsea contra `bookSchema`, `copySchema`, `readingEventSchema`, `readerSchema`, `shelfSchema`, `wishlistItemSchema`, `loanSchema`, `seriesSchema` (los mismos tipos que ya definen cada entidad, `lib/types/*.ts`) antes de que la fase de creación arranque — un archivo que no es un backup real (JSON arbitrario, backup de otra app, archivo corrompido) se rechaza con errores claros de qué campo/entidad no matchea, sin haber creado ni tocado nada todavía.

## Risks / Trade-offs

- **[Riesgo] Restauración grande y lenta** (creación + limpieza secuencial/uno-a-la-vez, sin batching) → a escala de hogar (cientos a pocos miles de libros, target explícito en `data-model.md`) es una operación de minutos, no de segundos, pero no bloqueante — el import CSV ya opera así y es aceptado.
- **[Riesgo] Estado mixto si el usuario abandona tras un fallo parcial** (datos viejos + parte de lo nuevo, sin limpiar) → se comunica explícitamente en el resumen final, no se intenta "adivinar" una reconciliación automática; el usuario puede reintentar los fallidos o revisar/borrar a mano.
- **[Riesgo] Cualquier lector con sesión puede restaurar** (sin tier de admin) → mismo modelo de acceso que ya tiene toda la app hoy (cualquiera puede editar/borrar cualquier libro); no se resuelve acá, señalado explícitamente como Non-Goal.
- **[Trade-off] Alboroto de auditoría**: una restauración de biblioteca completa genera cientos de entradas en el log de auditoría (#40) de golpe, tanto en la fase de creación como en la de limpieza → aceptado, es información real y correcta (quedó documentado qué pasó), no se filtra ni se agrupa especialmente.
- **[Riesgo] El backup no incluye `pinHash` ni `uid` de readers** (por diseño, desde #36) → un restore no puede recuperar el PIN de desbloqueo de un lector; se re-configura a mano después, igual que hoy si se pierde.

## Migration Plan

No hay migración de datos ni cambio de esquema. Feature aditiva y opt-in (el usuario elige restaurar, no pasa nada si nunca se usa). Sin rollback especial más allá de lo que ya cubre la fase de limpieza condicional del propio diseño.

## Open Questions

Ninguna — decisiones confirmadas en explore.
