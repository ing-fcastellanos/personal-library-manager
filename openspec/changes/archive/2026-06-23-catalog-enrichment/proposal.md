## Why

Dar de alta libros a mano es lento y propenso a errores: títulos, autores, editorial, año,
categorías, ISBN y portada se capturan a dedo. El issue #13 pide un servicio que, dado un
ISBN o un candidato título/autor, obtenga metadata canónica y portada desde fuentes
gratuitas (Google Books primario, Open Library como fallback/complemento). Esta metadata es
además la fuente de verdad que consumirá el flujo de IA de M3 — la IA solo aporta el
candidato, no inventa estos campos. El modelo `Book` (#5) ya reservó el terreno (`source`,
`authorKeys`, `categoryKeys`, `titleKey`) delegando explícitamente la normalización a #13.

## What Changes

- Nuevo servicio `services/enrichment/` con: clientes HTTP de **Google Books** y
  **Open Library**, normalizadores a nuestro modelo `Book`, estrategia de merge/prioridad
  entre fuentes, y re-hospedaje de portada en Firebase Storage.
- Nuevo endpoint **`GET /api/enrich`** (server-mediado, ADR-0009) con dos caminos internos
  según query param:
  - `?isbn=…` → un único candidato (lookup canónico).
  - `?q=…` → lista de candidatos rankeados (top 5) por un score determinista.
- **Flujo de dos pasos**: `/enrich` solo *sugiere* metadata; persistir el libro sigue siendo
  un `POST /api/books` aparte (encaja con el flujo de IA de M3 y con el manejo de duplicados,
  que es otro issue de M2).
- **Cache** en una colección Firestore `enrichmentCache` keyed por ISBN (y por query
  normalizada para búsquedas título/autor), incluyendo cacheo de "miss" con TTL para no
  re-consultar fuentes ante negativos.
- **Portadas**: el admin SDK descarga la portada de la fuente y la re-hostea en GCS/Firebase
  Storage; el `Book` guarda la URL interna (no se hace hotlink a la fuente externa).
- **Categorías**: se parte la cadena BISAC de Google Books por `/` y se normaliza cada nivel
  con el helper `slugify`/`arraySlugs` existente, poblando `categories[]`/`categoryKeys[]`.

## Capabilities

### New Capabilities
- `catalog-enrichment`: servicio de enriquecimiento de metadata de libros — clientes de
  fuentes externas (Google Books, Open Library), normalización al modelo `Book`, merge por
  prioridad de campos, ranking de candidatos, cacheo por ISBN/consulta con TTL de negativos,
  y re-hospedaje de portadas en Storage; expuesto vía `GET /api/enrich`.

### Modified Capabilities
<!-- Ninguna: el flujo de escritura de `catalog-api` no cambia; el enriquecimiento es lectura/sugerencia y se persiste con el POST /api/books existente. -->

## Impact

- **Código nuevo**: `services/enrichment/` (clientes, normalizadores, merge, ranking, cache,
  cover-rehost) y `server/routes/enrich.ts`, montado en `server/index.ts`.
- **APIs externas**: Google Books API y Open Library API (ambas gratuitas, sin API key
  obligatoria para los endpoints usados; respetar rate limits → de ahí el cache).
- **Firestore**: nueva colección `enrichmentCache` (posible índice por TTL/`expiresAt`).
- **Storage**: escritura server-side (admin SDK) de portadas; no requiere abrir
  `storage.rules` (el admin SDK bypassa las rules; el path de upload de cliente #3 sigue
  cerrado).
- **Dependencias**: #2 (Storage para portadas) y #5 (modelo a normalizar, ya hecho).
  Reusa `lib/text/slug` y `lib/firebase/admin`.
- **Consumidores aguas abajo**: flujo de IA de M3 (#) consume estos candidatos.
