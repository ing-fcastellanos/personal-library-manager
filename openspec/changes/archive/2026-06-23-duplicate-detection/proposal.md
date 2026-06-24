## Why

Al agregar libros —sobre todo en el alta por IA por lotes (#21)— es fácil capturar dos
veces el mismo libro. El issue #16 pide detectar antes de guardar si un libro candidato ya
existe en el catálogo y ofrecer al usuario una salida clara: omitir, agregar como otra copia,
o editar el existente. El modelo `Book`/`Copy` (#5/#12) ya codifica la distinción clave —un
`Book` es una edición canónica (≈ un ISBN) y un `Copy` es un ejemplar físico— así que "segundo
ejemplar legítimo" no es un juicio difuso: si el ISBN ya existe como `Book`, no se duplica el
`Book`, se ofrece crear un `Copy`. Depende de #12 (repos) y #13 (normalización `titleKey`/
`authorKeys` y `toIsbn13` para matchear), ambos ya hechos.

## What Changes

- Nueva capability `catalog-duplicates`: un **hook de servicio** `findBookDuplicates(candidate)`
  reusable por el alta manual (#14) y el alta por IA batch (#21), más un **endpoint de
  pre-chequeo** `GET /api/books/duplicates`.
- **Heurística de match en dos tiers** (sin WEAK en v1):
  - **EXACT** — `isbn13` igual a un `Book` existente (canonicalizado con `toIsbn13`, #13).
  - **STRONG** — `titleKey` igual + ≥1 `authorKey` en común. Si **ambos** lados tienen autores
    y **no** se solapan → **no** es match (libro homónimo distinto). Si un lado no tiene
    autores → STRONG degradado (menor score).
- **Detección + recomendación** viven en #16; la **ejecución** de cada acción reusa endpoints
  existentes: "agregar como copia" → `POST /api/copies` con el `bookId`; "editar existente" →
  `PATCH /api/books/:id`; "agregar de todos modos" → `POST /api/books`. El endpoint devuelve
  `bookId`, `tier`, `score`, `existingCopies` y un `suggestedAction` por match.
- **Similitud compartida**: extraer un helper puro `titleAuthorSimilarity` a `lib/text/` y
  reusarlo desde el ranking de enrichment (`services/enrichment/rank.ts`, #13) y desde el
  matching de duplicados, para una sola definición de "parecido de título+autor".

## Capabilities

### New Capabilities
- `catalog-duplicates`: detección de libros duplicados al agregar — consulta candidatos por
  ISBN/`titleKey`/`authorKeys` en Firestore, los puntúa en memoria con tiers EXACT/STRONG,
  cuenta ejemplares existentes y recomienda una acción; expuesta como hook de servicio y vía
  `GET /api/books/duplicates`.

### Modified Capabilities
<!-- Ninguna requirement de catalog-api cambia: la detección es lectura/recomendación; la
     ejecución reusa los endpoints existentes sin alterar su contrato. El refactor del scorer
     de enrichment es interno (mismo comportamiento), no un cambio de requirement. -->

## Impact

- **Código nuevo**: `services/duplicates/` (matcher puro + queries de repo + hook de servicio)
  y `server/routes/` (endpoint `GET /api/books/duplicates`), montado en `server/index.ts`.
- **Helper compartido**: nuevo `lib/text/similarity.ts`; `services/enrichment/rank.ts` pasa a
  consumirlo (refactor sin cambio de comportamiento, cubierto por sus tests existentes).
- **Firestore**: nuevas queries sobre `books` (`where isbn13 ==`, `where titleKey ==`,
  `array-contains` sobre `authorKeys`). Todas resueltas por índices de campo único automáticos
  → **cero índices compuestos nuevos** en `firestore.indexes.json`.
- **Consumidores**: alta manual (#14) y alta por IA batch (#21) llaman al hook; este change no
  construye esa UI.
- **Dependencias**: #12 (repos `books`/`copies`) y #13 (`toIsbn13`, slugs), ya hechos.
