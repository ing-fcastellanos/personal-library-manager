# ADR-0014: Ciclo de vida del lector — archivado (soft delete), no borrado en duro

- **Estado:** Accepted
- **Fecha:** 2026-06-23
- **Responsable(s):** ing-fcastellanos
- **Issues relacionados:** #6, #7, #12

## Contexto

Al implementar la integridad referencial del catálogo (#12) surgió la pregunta de
qué pasa cuando se quiere **quitar un lector**. Un `Reader` no es una fila de catálogo:
es la **identidad de una persona del hogar** y vive en **tres sitios a la vez**:

1. el documento `readers/{id}` en Firestore (nombre, color, email, `pinHash`, prefs),
2. su **usuario de Firebase Auth** (`uid`, magic-link), ligado 1:1 (ADR-0011),
3. sus **sesiones activas** (session cookies httpOnly ≤14 días, ADR-0011/0012).

Además, **`ReadingEvent` snapshotea el libro pero NO al lector** (`bookTitle`/
`bookAuthors` sí; no hay `readerName`): el historial **resuelve el nombre del lector en
vivo** desde su documento. Las features que dependen de esa resolución son el historial
(#26), recientes (#29), stats del dashboard (#27–#29), export CSV (#34), la atribución
(#24) y la publicación a Goodreads por lector.

Hoy el hogar es **fijo de 2 lectores**: se crean por seed (`seed:readers`), `ReadersManager`
**solo edita** (no hay alta ni baja por UI) y el `ReaderPicker` (ADR-0013) los lista a
todos sin filtro. No hay ninguna feature que requiera borrar un lector; los disparadores
reales son raros (un miembro se va de la casa, un seed duplicado, o una purga tipo GDPR).

## Decisión

- **Quitar un lector = archivar (soft delete), no borrar en duro.** Se añade al `Reader`
  un estado de actividad (`status: "active" | "archived"`, con `archivedAt`). Un lector
  archivado se **oculta del `ReaderPicker` y de las listas activas**, **no puede iniciar
  sesión** (se revoca su sesión: `revokeRefreshTokens` + cookie invalidada) ni **registrar
  lecturas nuevas**, pero **su documento permanece** para que el historial siga resolviendo
  su nombre/color. La acción es **reversible** (re-activar).
- **El borrado en duro es una operación de admin/purga aparte, fuera de alcance aquí.** Si
  alguna vez se construye (p.ej. "borrá mis datos"/GDPR), DEBE: revocar sesiones, **borrar
  o deshabilitar el Auth user**, y elegir explícitamente entre **cascade** (borrar los
  events) o **anonimizar** (reatribuir a un tombstone "Antiguo miembro"). Es lifecycle de
  identidad, propiedad de la capability de auth/readers (#6/#7), no del catálogo.
- **El catálogo (#12) no expone `DELETE /readers/:id`.** Su superficie de borrado son
  `books`/`copies`/`shelves`/`readingEvents`. #12 sí aporta el guard reutilizable
  **`readerHasEvents(readerId)`** para que una eventual purga pueda negarse a orfanar
  lecturas; el flujo común (archivar) no lo necesita porque nunca orfana.

## Consecuencias

- **Positivas:** el historial —el activo central de la app— nunca queda huérfano ni pierde
  atribución; la baja de un miembro es segura y reversible; se evita la inconsistencia de
  tres almacenes (doc vs Auth user vs sesión) que provocaría un borrado en duro ingenuo;
  #12 queda con un alcance limpio (catálogo, no identidad).
- **Negativas / trade-offs:** se introduce un campo `status` que **todas las lecturas de
  lectores deben filtrar** (picker, listas, seed idempotente); un lector archivado sigue
  ocupando su `uid`/email (no se puede reusar el email para un alta nueva sin purga); el
  borrado "de verdad" queda pendiente para un futuro ADR si se necesita.
- **Seguimiento:** definir el campo `status`/`archivedAt` en el modelo (#5/#6) y filtrar el
  `ReaderPicker` y listas activas cuando se implemente; decidir cascade-vs-anonimizar si se
  llega a necesitar una purga GDPR (ADR nuevo que supersede o complemente a este).

## Alternativas consideradas

- **Hard delete del documento del lector** — orfana el historial (sin `readerName` que
  mostrar) y deja vivos el Auth user y las sesiones; descartado por destructivo e inconsistente.
- **Hard delete + cascade de `readingEvents`** — borra justo lo que la app existe para
  conservar; descartado.
- **Hard delete + anonimizar (tombstone)** — preserva el historial reatribuido, pero es
  complejidad solo justificada por una purga GDPR real; se reserva para ese caso, no como
  flujo por defecto.
- **Bloquear el borrado mientras existan lecturas (409)** — honesto pero deja al miembro
  "para siempre" en listas activas y no resuelve el caso real ("se fue de la casa");
  insuficiente como feature, aunque el guard `readerHasEvents` queda disponible.
