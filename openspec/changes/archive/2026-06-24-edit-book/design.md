## Context

#14 dejó el alta manual funcionando y enganches esperando edición: `onEditExisting`
(diálogo de duplicados) deshabilitado, `onViewBook` apuntando al placeholder `/catalogo`. El
backend de edición existe (`PATCH /api/books/:id`, `PATCH /api/copies/:id`, #12). Storage solo
se escribe server-side (admin SDK; `rehostCover` de #13 sube a `covers/<isbn13>`); el upload
directo de cliente está cerrado en `storage.rules` y reservado a #3 (fotos IA). El form de #14
(`components/books`) tiene los campos que la edición reusa. El listado de catálogo (#17) aún no
existe, así que en v1 se llega al editor por URL o desde los flujos de #14.

## Goals / Non-Goals

**Goals:**
- Editar cualquier campo de un `Book` y de **un** `Copy`, con **notas** por ejemplar, y guardar.
- Subir una **portada propia** (server-mediada) y poder **quitarla**.
- **Re-enriquecer** metadata a pedido con un diff selectivo (sin clobbering).
- Registro **mínimo** de cambios (cimiento de auditoría #40), sin UI de consulta.
- Reactivar los enganches de #14 hacia la pantalla de edición.

**Non-Goals:**
- Multi-ejemplar (editar varios `Copy` a la vez) — v1 edita uno.
- UI/consulta de auditoría (#40), resize de portada (#50), upload directo de cliente (#3).
- Listado/browse del catálogo (#17), que linkeará a esta ruta.

## Decisions

### D1 — Ruta dedicada `/libros/[id]/editar`
Carga `Book` (`GET /api/books/:id`) y un `Copy`, edita y guarda con los `PATCH` existentes.
`onEditExisting`/`onViewBook` de #14 navegan acá. Gateada por sesión (ADR-0006).
*Alternativa descartada:* detalle `/catalogo/[id]` con edición inline — la vista detalle es de
#17; #15 entrega solo el editor.

### D2 — `EditBookForm` dedicado sobre campos compartidos
Se extraen los campos del libro y del ejemplar de #14 a `BookFields`/`CopyFields` reusables; el
editor los compone con su propia orquestación (cargar → editar → PATCH → re-enrich/portada). No
se reusa `AddBookForm` entero: comparten *campos*, no *flujo*.
*Alternativa descartada:* un "modo edición" dentro de `AddBookForm` — mezcla dos flujos
distintos (búsqueda/intake vs cargar/PATCH).

### D3 — Alcance Book + un Copy
El editor edita el `Book` (metadata compartida → `PATCH /api/books/:id`) y **un** `Copy`
(estante, condición, adquirido, **notas** → `PATCH /api/copies/:id`). El `Copy` es el del
contexto de entrada, o el primero del libro si se entra a nivel libro. Multi-ejemplar: futuro.

### D4 — Subida de portada server-mediada (base64 + admin SDK)
Nuevo `POST /api/books/:id/cover` con cuerpo `{ imageBase64, contentType }` (body-limit elevado
solo en esa ruta). El server valida `contentType` ∈ `image/jpeg|png|webp` y tamaño ≤ 5 MB,
decodifica y sube a `covers/<bookId>.<ext>` con el admin SDK (**reemplaza** la anterior),
setea `Book.coverSource = "user"` y `coverUrl` a la URL interna, responde `{ coverUrl }`. Se
acepta tal cual (resize → #50).
*Alternativa descartada:* abrir `storage.rules` para upload directo de cliente — es el canal de
#3; una portada única va server-mediada como `rehostCover`. Multipart (`multer`) o URLs
firmadas añaden dependencia/fricción con el emulador; base64 reusa el patrón exacto de
`rehostCover` sin dep nueva.

### D5 — Procedencia de portada `Book.coverSource`
Campo opcional `"metadata" | "user"`. El alta/enriquecimiento setea `"metadata"`; la subida de
usuario setea `"user"`. El diff de re-enriquecer (D6) trata una portada `"user"` como "mantener
la mía" por defecto. Quitar portada (`coverUrl = null`) resetea `coverSource` a null/metadata.

### D6 — Re-enriquecer con diff selectivo
Botón → `GET /api/enrich?isbn=<book.isbn13>` → se calcula, **en el cliente**, el conjunto de
campos donde la fuente difiere del valor actual; la UI los lista y el usuario elige por campo
"traer" o "mantener el mío". Solo los aceptados entran al `PATCH`. La portada `"user"` queda
excluida del diff por defecto (D5).
*Alternativa descartada:* sobrescribir todo — pisa ediciones manuales.

### D7 — Registro de cambios mínimo (`auditLog`)
Al persistir un `PATCH` de book/copy, un repo `services/audit` escribe un documento en
`auditLog`: `{ entity: "book"|"copy", entityId, changedFields: string[], readerId, at }`. Sin
before/after pesado ni UI — eso es #40. El `readerId` viene de la sesión (`requireAuth`).
*Alternativa descartada:* diferir todo a #40 — el issue pide el cimiento ahora.

## Risks / Trade-offs

- **Base64 infla el body de la portada (~+33%)** → con ≤ 5 MB y body-limit por-ruta es
  manejable; el escalado real (signed URLs / resize) queda para #50 si pesa.
- **Dos convenciones de path de portada** (`covers/<isbn13>` de #13 vs `covers/<bookId>` de la
  subida) → aceptado para no tocar `rehostCover`; `coverUrl` siempre apunta a la vigente, así
  que la inconsistencia es interna, no observable.
- **`auditLog` sin esquema rico** podría requerir migración cuando llegue #40 → mitigado
  dejando el doc extensible (`changedFields` + ids + actor + timestamp) sin cerrar la forma.
- **Re-enrich diff en cliente** depende de que `/enrich` responda; si falla, el botón degrada
  con un aviso y no cambia nada (consistente con #14).
- **Entrada solo por URL/##14 en v1** (sin lista #17) → aceptable; la pantalla existe y #17 la
  linkeará. Se documenta para no leerse como "no se puede llegar".
- **Edición concurrente** (dos ediciones del mismo libro) no es transaccional → riesgo bajo
  (un lector por dispositivo); el `auditLog` deja rastro si hace falta reconciliar.
