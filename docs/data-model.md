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
   ┌──────────────┼───────────────────────────┐
   │              │                            │
   ▼ readerId     ▼ bookId                     ▼ shelfId
 readingEvents   books  ◄────bookId──── copies ────────► shelves
   │ copyId? ─────────────────────────────▲
   └────────────────────────────────────────┘
```

- `book`   ← `copy.bookId` (N copies → 1 book)
- `book`   ← `readingEvent.bookId` (N events → 1 book)
- `reader` ← `readingEvent.readerId` (N events → 1 reader)
- `copy`   ← `readingEvent.copyId?` (opcional)
- `shelf`  ← `copy.shelfId?` (opcional)

### `books`
Edición canónica (≈ 1 ISBN). Tipo: `lib/types/book.ts`.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | string | auto-id (no se llavea por ISBN, Decisión B) |
| `title` | string | requerido |
| `subtitle` | string? | |
| `authors` | string[] | nombres display |
| `authorKeys` | string[] | slugs normalizados (filtro/agrupado, Decisión F) |
| `publisher` | string? | |
| `publishedYear` | number? | |
| `isbn13` / `isbn10` | string? | indexados (lookup/dedup #16) |
| `categories` | string[] | display |
| `categoryKeys` | string[] | slugs normalizados |
| `coverUrl` | string? | portada en Storage (#13) |
| `pageCount` | number? | |
| `language` | string? | |
| `description` | string? | |
| `workKey` | string? | agrupa ediciones de una misma obra (#38) |
| `titleKey` | string? | título lowercased para prefix search (#17) |
| `source` | string? | `google-books`/`open-library`/`manual`/`ai` |
| `createdAt`/`updatedAt` | string | ISO |

### `copies`
Ejemplar físico poseído. Tipo: `lib/types/copy.ts`.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | string | auto-id |
| `bookId` | string | **requerido** → `books` |
| `shelfId` | string? | → `shelves` (un ejemplar sin estante es válido) |
| `condition` | string? | string abierto por ahora (enum diferido a #12/#15) |
| `acquiredAt` | string? | fecha ISO de alta |
| `notes` | string? | notas por ejemplar (#15) |
| `createdAt`/`updatedAt` | string | ISO |

Sin flag de lectura por lector — el estado de lectura vive solo en `readingEvents`
(Decisión D).

### `readingEvents`
Una lectura de un libro por un lector. Tipo: `lib/types/reading-event.ts`.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | string | auto-id |
| `readerId` | string | **requerido** → `readers` |
| `bookId` | string | **requerido** → `books` |
| `copyId` | string? | **opcional** (imports/sin ejemplar, Decisión C) |
| `status` | enum | `finished` \| `reading` \| `abandoned` |
| `dateStarted` | string? | ISO |
| `dateFinished` | string? | ISO |
| `rating` | number? | entero 1–5 |
| `review` | string? | |
| `bookTitle` | string | **snapshot** al momento del evento |
| `bookAuthors` | string[] | snapshot |
| `isbn13` | string? | snapshot |
| `coverUrl` | string? | snapshot |
| `createdAt`/`updatedAt` | string | ISO |

El snapshot es **histórico** ("qué era el libro cuando se leyó"); el `bookId` vivo es
la fuente de verdad cuando se necesita el dato actual.

### `shelves`
Ubicación física. Tipo: `lib/types/shelf.ts`.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | string | auto-id |
| `name` | string | **requerido** |
| `location` | string? | |
| `description` | string? | |
| `createdAt`/`updatedAt` | string | ISO |

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
```

**Búsqueda (#17):** Firestore no tiene substring/full-text. Se resuelve con filtros +
prefijo sobre `titleKey` (lowercased). Un índice externo (Algolia/Typesense) queda
**fuera de alcance** por el requisito de costo cero; reconsiderable si la búsqueda por
prefijo no alcanza.

## Entidades reservadas (documentadas, **no** modeladas aquí)

Bocetadas para que encajen sin repintar:

| Futuro | Issue | Forma prevista |
|--------|-------|----------------|
| Series | #38 | `book.workKey` + futura colección `series` (orden de tomos) |
| Préstamo (Loan) | #39 | campo/subcolección en `copy` (a quién, fecha, devolución) |
| Wishlist | #37 | `book` sin `copy` + marcador de wishlist por lector |
| AuditLog | #40 | colección `auditLog` (actor, entidad, ts) |
| ImportSession | #22 / #35 | colección `importSessions` (resumen de la sesión de alta) |
| Metas de lectura | #30 | subdoc en `reader` **o** colección `readingGoals` (se decide en M5) |

## Preguntas abiertas

- Enum exacto de `condition` en `copies` (new/good/worn…) — diferido a #12/#15;
  modelado como string abierto por ahora.
- Metas de lectura (#30): subdoc en `reader` vs colección propia — se decide al
  construir M5.
