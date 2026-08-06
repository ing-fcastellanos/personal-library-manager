# Modelo de datos (Firestore)

Esquema canónico del dominio de la biblioteca. Es el **contrato** que implementa #12
(repositorios, endpoints, índices desplegados). Deriva de **ADR-0007** (split
Book/Copy/ReadingEvent), **ADR-0002** (Firestore + Admin SDK) y **ADR-0008**
(metadata), y hereda las convenciones de la colección `readers` ya implementada.

> Alcance de #5: este documento + los tipos zod en `lib/types/`. **No** incluye
> repositorios, endpoints, `firestore.indexes.json` desplegado ni reglas — eso es #12.

## Convenciones (heredadas de `readers`)

- Colecciones **top-level**, documentos con **auto-id** (`collection().doc()`).
- Timestamps como **string ISO-8601** (`createdAt` / `updatedAt`).
- Ausencia = **`null`** (nunca `undefined`); `mapDoc` explícito en el repo.
- **zod** schema + tipo inferido + schemas `create`/`update` en `lib/types`.
- Sin unique constraints → unicidad por **query / transacción**.
- Todas las relaciones son **id strings** a colecciones top-level (no subcolecciones).

Escala objetivo: hogar de **2 lectores**, cientos a pocos miles de libros. Esa escala
es la que hace ganar "simple y derivado" sobre "denormalizado y mantenido".

## Colecciones y relaciones

```
 readers ─────────┐  (ya implementada)
                  │
   ┌──────────────┼───────────────┬───────────────────────────┐
   │              │               │                            │
   ▼ readerId     ▼ bookId        ▼ readerId                   ▼ shelfId
 readingEvents   books           wishlistItems  ◄──bookId?──┐  shelves
   │ copyId? ──────▲ ▲────bookId──── copies ──────────────► │     ▲
   └───────────────┘ └──────────────────bookId?─────────────┘─────┘
```

- `book` ← `copy.bookId` (N copies → 1 book)
- `book` ← `readingEvent.bookId` (N events → 1 book)
- `reader` ← `readingEvent.readerId` (N events → 1 reader)
- `copy` ← `readingEvent.copyId?` (opcional)
- `shelf` ← `copy.shelfId?` (opcional)
- `reader` ← `wishlistItem.readerId` (N deseos → 1 reader)
- `book` ← `wishlistItem.bookId?` (**opcional** — un deseo puede no tener edición catalogada)
- `copy` ← `loan.copyId` (N préstamos → 1 ejemplar; el que recibe es texto libre, no un `reader`)
- `series.volumes[].bookId?` → `book` (**opcional**, dirección invertida: la serie referencia
  libros, el `book` no sabe nada de series — un volumen sin `bookId` es un tomo faltante)

### `books`

Edición canónica (≈ 1 ISBN). Tipo: `lib/types/book.ts`.

| Campo                   | Tipo     | Notas                                            |
| ----------------------- | -------- | ------------------------------------------------ |
| `id`                    | string   | auto-id (no se llavea por ISBN, Decisión B)      |
| `title`                 | string   | requerido                                        |
| `subtitle`              | string?  |                                                  |
| `authors`               | string[] | nombres display                                  |
| `authorKeys`            | string[] | slugs normalizados (filtro/agrupado, Decisión F) |
| `publisher`             | string?  |                                                  |
| `publishedYear`         | number?  |                                                  |
| `isbn13` / `isbn10`     | string?  | indexados (lookup/dedup #16)                     |
| `categories`            | string[] | display                                          |
| `categoryKeys`          | string[] | slugs normalizados                               |
| `coverUrl`              | string?  | portada en Storage (#13)                         |
| `pageCount`             | number?  |                                                  |
| `language`              | string?  |                                                  |
| `description`           | string?  |                                                  |
| `workKey`               | string?  | agrupa ediciones de una misma obra (#38)         |
| `titleKey`              | string?  | título lowercased para prefix search (#17)       |
| `source`                | string?  | `google-books`/`open-library`/`manual`/`ai`      |
| `createdAt`/`updatedAt` | string   | ISO                                              |

### `copies`

Ejemplar físico poseído. Tipo: `lib/types/copy.ts`.

| Campo                   | Tipo    | Notas                                              |
| ----------------------- | ------- | -------------------------------------------------- |
| `id`                    | string  | auto-id                                            |
| `bookId`                | string  | **requerido** → `books`                            |
| `shelfId`               | string? | → `shelves` (un ejemplar sin estante es válido)    |
| `condition`             | string? | string abierto por ahora (enum diferido a #12/#15) |
| `acquiredAt`            | string? | fecha ISO de alta                                  |
| `notes`                 | string? | notas por ejemplar (#15)                           |
| `createdAt`/`updatedAt` | string  | ISO                                                |

Sin flag de lectura por lector — el estado de lectura vive solo en `readingEvents`
(Decisión D).

### `readingEvents`

Una lectura de un libro por un lector. Tipo: `lib/types/reading-event.ts`.

| Campo                   | Tipo     | Notas                                           |
| ----------------------- | -------- | ----------------------------------------------- |
| `id`                    | string   | auto-id                                         |
| `readerId`              | string   | **requerido** → `readers`                       |
| `bookId`                | string   | **requerido** → `books`                         |
| `copyId`                | string?  | **opcional** (imports/sin ejemplar, Decisión C) |
| `status`                | enum     | `finished` \| `reading` \| `abandoned`          |
| `dateStarted`           | string?  | ISO                                             |
| `dateFinished`          | string?  | ISO                                             |
| `rating`                | number?  | entero 1–5                                      |
| `review`                | string?  |                                                 |
| `bookTitle`             | string   | **snapshot** al momento del evento              |
| `bookAuthors`           | string[] | snapshot                                        |
| `isbn13`                | string?  | snapshot                                        |
| `coverUrl`              | string?  | snapshot                                        |
| `createdAt`/`updatedAt` | string   | ISO                                             |

El snapshot es **histórico** ("qué era el libro cuando se leyó"); el `bookId` vivo es
la fuente de verdad cuando se necesita el dato actual.

### `shelves`

Ubicación física. Tipo: `lib/types/shelf.ts`.

| Campo                   | Tipo    | Notas         |
| ----------------------- | ------- | ------------- |
| `id`                    | string  | auto-id       |
| `name`                  | string  | **requerido** |
| `location`              | string? |               |
| `description`           | string? |               |
| `createdAt`/`updatedAt` | string  | ISO           |

### `wishlistItems`

Un deseo por lector: un libro que alguien quiere pero que (todavía) no se posee. Tipo:
`lib/types/wishlist-item.ts`. Vive en su **propia colección** (no como `book` sin
`copy`) para no contaminar el catálogo — ver la nota al final de esta sección.

| Campo                   | Tipo     | Notas                                                    |
| ----------------------- | -------- | -------------------------------------------------------- |
| `id`                    | string   | auto-id                                                  |
| `readerId`              | string   | **requerido** → `readers`                                |
| `bookId`                | string?  | **opcional** → `books` (un deseo puede no tener edición) |
| `status`                | enum     | `wanted` \| `dismissed` (adquirido/leído son derivados)  |
| `priority`              | enum     | `high` \| `normal` \| `low` (default `normal`)           |
| `addedVia`              | enum     | `manual` \| `isbn` \| `ai` \| `catalog` (punto de alta)  |
| `bookTitle`             | string   | **snapshot** del libro deseado                           |
| `bookAuthors`           | string[] | snapshot                                                 |
| `isbn13`                | string?  | snapshot                                                 |
| `coverUrl`              | string?  | snapshot                                                 |
| `titleKey`              | string?  | slug normalizado — permite matchear sin `bookId`         |
| `authorKeys`            | string[] | slugs normalizados — idem                                |
| `createdAt`/`updatedAt` | string   | ISO                                                      |

El snapshot y las `*Keys` cargan en el propio ítem porque, a diferencia de
`readingEvents`, un `wishlistItem` puede **no** tener `bookId` contra el cual
resolver la metadata (paralelo a la Decisión C). Dos vistas derivan de esta única
colección, sin flags almacenados: **"quiero leer"** por lector (ítems `wanted` menos
los que el lector ya resolvió por `readingEvent`) y **"quiero comprar"** del hogar
(ítems `wanted` de libros sin `copy`, agrupados por libro). Ambas se auto-mantienen —
adquirir crea la `Copy` (sale de comprar) y leer crea el `readingEvent` (sale de
leer), sin tachar nada a mano.

> **Por qué colección propia y no la forma reservada.** Este documento reservaba la
> Wishlist como _"`book` sin `copy` + marcador por lector"_. Se descartó: el catálogo
> (`services/catalog`) lista **todos** los `books` sin filtrar por posesión, así que un
> deseo guardado como `book` sin `copy` aparecería en browse/búsqueda/facetas junto a
> los poseídos, y ocultarlo exigiría un filtro de posesión en cada una de esas
> superficies. Una colección dedicada aísla el feature: ninguna ruta de lectura del
> catálogo cambia. (add-wishlist, decisión D1.)

### `loans`

Un préstamo de un **ejemplar** físico a alguien de afuera del hogar. Tipo:
`lib/types/loan.ts`. Vive en su **propia colección** (no como campo en `copy`) para
guardar **historial**.

| Campo                   | Tipo     | Notas                                                         |
| ----------------------- | -------- | ------------------------------------------------------------- |
| `id`                    | string   | auto-id                                                       |
| `copyId`                | string   | **requerido** → `copies` (se presta un ejemplar)              |
| `borrowerName`          | string   | **requerido** — texto libre (NO es un `reader`; es de afuera) |
| `borrowerKey`           | string   | slug normalizado ← derivado server-side (agrupar/dedup)       |
| `loanedAt`              | string   | ISO — desde cuándo (requerido)                                |
| `dueDate`               | string?  | ISO — opcional (sin recordatorios; #41)                       |
| `returnedAt`            | string?  | ISO — **ausencia = préstamo ABIERTO** (= "prestado")          |
| `notes`                 | string?  |                                                               |
| `bookId`                | string?  | snapshot (del `copy` al prestar) — link al libro sin join     |
| `bookTitle`             | string   | **snapshot**                                                  |
| `bookAuthors`           | string[] | snapshot                                                      |
| `coverUrl`              | string?  | snapshot                                                      |
| `createdAt`/`updatedAt` | string   | ISO                                                           |

Estado derivado, sin flags: un `copy` está **prestado** sii ∃ `loan(copyId)` con
`returnedAt = null` (a lo sumo **uno abierto por copy**, se valida al prestar);
**vencido** sii `dueDate` pasó y sigue sin devolver. El que recibe es **texto libre**
con autocomplete de nombres ya usados (distinct de `loans`) — sin colección de
contactos, sin `lentBy`. Borrar un `copy` con **cualquier** préstamo (abierto o
historial) se **bloquea** (integridad).

> **Por qué colección propia y no "campo en `copy`".** El data-model reservaba el
> Préstamo como _"campo/subcolección en `copy`"_. Se descartó: un campo `loanedTo`
> solo guarda el préstamo **actual**, y el issue pide historial. Una colección
> llaveada por `copyId` da historial gratis y el estado "prestado" se deriva — igual
> que `readingEvents`/`wishlistItems`. (add-loans, decisión D1.)

### `series`

Una saga curada a mano: nombre + lista **ordenada** de tomos. Tipo: `lib/types/series.ts`.
Vive en su **propia colección**; el `book` no tiene ninguna referencia de vuelta —la
pertenencia se descubre escaneando `series` en memoria por un volumen cuyo `bookId`
coincida (mismo join en memoria que `services/catalog` ya usa para estantes/lectura).

| Campo                   | Tipo             | Notas                                                          |
| ----------------------- | ---------------- | -------------------------------------------------------------- |
| `id`                    | string           | auto-id                                                        |
| `name`                  | string           | **requerido**                                                  |
| `volumes`               | `SeriesVolume[]` | ordenado por `position` (no necesariamente el orden del array) |
| `createdAt`/`updatedAt` | string           | ISO                                                            |

`SeriesVolume`: `{ position: number, title: string, authors: string[], isbn13?: string, coverUrl?: string, bookId?: string }`
— snapshot completo (igual que `wishlistItems`/`loans`) para que un tomo faltante se
renderice sin depender de un `book` que todavía no existe. `bookId` ausente/null = **tomo
faltante**; con `bookId` = el hogar lo tiene. Editar una serie (renombrar, agregar/quitar/
reordenar tomos, vincular un `bookId`) reemplaza el array `volumes` completo — sin
sub-colección por tomo, dado el tamaño chico por serie a esta escala.

> **Por qué colección propia con link inverso, y no `book.workKey` + colección.** El
> data-model reservaba Series como _"`book.workKey` + futura colección `series`"_.
> Se descartó: `workKey` agrupa **ediciones del mismo tomo** (tapa dura vs. bolsillo),
> no **tomos distintos** de una saga — son agrupaciones ortogonales, y ningún código
> llegó a poblar `workKey` (grep del repo: cero escritores fuera de su propio tipo).
> Que la serie referencie `bookId` directamente es más simple, no exige que un libro
> pertenezca a una sola serie, y no toca `book` en absoluto. (add-series-tracking,
> decisión D1.)

### `auditLog`

Quién agregó/editó/borró un `book`, `copy` o `readingEvent`, y cuándo. Tipo:
`lib/types/audit-log.ts`. Colección **append-only**, sin estado derivado — se ordena
por `createdAt` y listo.

| Campo           | Tipo                             | Notas                                                                                                                   |
| --------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `id`            | string                           | auto-id                                                                                                                 |
| `readerId`      | string                           | **requerido** — actor; se resuelve el nombre en vivo contra `readers`, no se snapshotea (a diferencia de `entityLabel`) |
| `action`        | `"create"\|"update"\|"delete"`   | **requerido**                                                                                                           |
| `entityType`    | `"book"\|"copy"\|"readingEvent"` | **requerido**                                                                                                           |
| `entityId`      | string                           | **requerido**                                                                                                           |
| `entityLabel`   | string                           | **snapshot** — el registro sigue siendo legible después de borrar la entidad                                            |
| `changedFields` | string[]?                        | solo en `update`; ausente en `create`/`delete`                                                                          |
| `createdAt`     | string                           | ISO                                                                                                                     |

Un `update` sin campos cambiados no se guarda; un `create`/`delete` **siempre** se
guarda, aunque no tenga `changedFields`.

> **Ya estaba parcialmente implementado.** #15 (edit-book) introdujo
> `services/audit/repository.ts` como base ("the foundation for the M8 audit
> feature") pero solo cubría `PATCH` de `book`/`copy`, sin `create`/`delete`, sin
> `readingEvent`, sin `entityLabel` y sin lectura — este documento nunca se
> actualizó para reflejar que la colección ya existía. add-audit-log (#40) extendió
> ese mismo escritor (no lo reemplazó) y agregó el lado de lectura.

## Decisiones (A–F)

- **A — `Book` = edición, entidad única.** Un doc `book` = una edición canónica; no
  hay nivel "Work" separado. `workKey` (slug opcional) agrupa de forma blanda las
  ediciones/traducciones de una misma obra. 3 niveles (Work→Edition→Copy) es excesivo
  para 2 lectores.
- **B — Llave auto-id + ISBN indexado.** Llavear por ISBN daría dedup gratis pero
  rompe con libros sin ISBN y multi-edición. El dedup vive en #16 (ISBN exacto +
  título/autor fuzzy).
- **C — `ReadingEvent` snapshot-ea metadata; `copyId` opcional.** Firestore no hace
  joins: historial/recientes/export no deben hacer un fetch de `book` por evento.
  Imports (#35) o libros no poseídos no tienen `Copy`.
- **D — "Leído vs pendiente" derivado.** Un libro está "leído por X" sii ∃
  `readingEvent(readerId=X, bookId, status=finished)`. Sin flag denormalizado en
  `book`/`copy`; "pendiente" es por-lector-por-libro y se computa de los eventos.
- **E — Agregación con `count()`.** KPIs y charts (M5) usan `count()` de Firestore +
  escaneos server-side; **sin** documentos contadores ni triggers. A esta escala,
  contar en lectura es barato.
- **F — Autores/categorías: display arrays + `*Keys` normalizados.** `array-contains`
  filtra un valor pero no agrupa por miembros de array; los charts escanean y agrupan
  en el server, y "autores únicos" requiere una clave canónica. La **regla de
  normalización (slug) vive en #13**; #5 solo fija la forma del campo.

## Plan de índices compuestos (se despliega en #12)

```
readingEvents : (readerId ASC, dateFinished DESC)              historial/recientes por lector   #26 #29
readingEvents : (bookId   ASC, dateFinished DESC)              historial por libro              #26
readingEvents : (readerId ASC, status ASC, dateFinished DESC)  derivar leído/pendiente          #27
copies        : (shelfId  ASC, createdAt DESC)                 "qué hay en este estante"        #18
copies        : (bookId   ASC)                                  ejemplares de un libro           #16
books         : single-field sobre isbn13, isbn10, authorKeys[], categoryKeys[], titleKey   #16 #28 #17
wishlistItems : (readerId ASC, createdAt DESC)                 lista por lector                 #37
loans         : (copyId   ASC, loanedAt DESC)                 historial por ejemplar + open-loan #39
loans         : (borrowerKey ASC, loanedAt DESC)              historial por persona              #39
```

`wishlistItems` necesita un solo índice compuesto: `status` y la posesión se filtran
**en memoria** en las vistas derivadas (como el catálogo), no por query, así que no hay
consultas que exijan índices `(readerId, status, …)` ni `(status, …)`. `loans` idem: el
estado "abierto/prestado" y "vencido" se derivan en memoria; solo se indexan las
lecturas ordenadas por `copyId` y por `borrowerKey`. `series` no necesita **ningún**
índice compuesto: se carga la colección entera (household-scale) y la pertenencia de un
libro se resuelve en memoria, igual patrón. `auditLog` idem: `listAuditLog` ordena por
`createdAt` (índice de campo simple, automático) y filtra `entityType`/`entityId` en
memoria sobre la colección completa.

**Búsqueda (#17):** Firestore no tiene substring/full-text. Se resuelve con filtros +
prefijo sobre `titleKey` (lowercased). Un índice externo (Algolia/Typesense) queda
**fuera de alcance** por el requisito de costo cero; reconsiderable si la búsqueda por
prefijo no alcanza.

## Entidades reservadas (documentadas, **no** modeladas aquí)

Bocetadas para que encajen sin repintar:

| Futuro           | Issue     | Forma prevista                                                      |
| ---------------- | --------- | ------------------------------------------------------------------- |
| ImportSession    | #22 / #35 | colección `importSessions` (resumen de la sesión de alta)           |
| Metas de lectura | #30       | subdoc en `reader` **o** colección `readingGoals` (se decide en M5) |

## Preguntas abiertas

- Enum exacto de `condition` en `copies` (new/good/worn…) — diferido a #12/#15;
  modelado como string abierto por ahora.
- Metas de lectura (#30): subdoc en `reader` vs colección propia — se decide al
  construir M5.
