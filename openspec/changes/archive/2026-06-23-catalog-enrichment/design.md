## Context

El catálogo (#12) ya tiene CRUD de `books` server-mediado (Express `/api`, ADR-0009) y el
modelo `Book` (#5) reservó campos para enriquecimiento: `source`, `authorKeys`,
`categoryKeys`, `titleKey`, `isbn13/isbn10`, `coverUrl`. La normalización fue delegada
explícitamente a #13. El helper `lib/text/slug` (`slugify`, `arraySlugs`) y `lib/firebase/admin`
ya existen. `storage.rules` está cerrado por defecto; el admin SDK escribe sin pasar por
rules. Este diseño cubre el servicio de enriquecimiento que alimenta tanto el alta manual
como el flujo de IA de M3.

## Goals / Non-Goals

**Goals:**
- Resolver metadata canónica + portada a partir de un ISBN (1 candidato) o de un texto
  título/autor (N candidatos rankeados).
- Normalizar cualquier fuente al modelo `Book` con slugs derivados deterministas.
- Mezclar Google Books (primario) + Open Library (complemento) con prioridad por campo.
- Cachear por ISBN y por consulta, incluyendo negativos con TTL.
- Re-hospedar portadas en Storage; el `Book` referencia la URL interna.

**Non-Goals:**
- **No** persiste `books`: `/enrich` solo sugiere; la escritura es el `POST /api/books`
  existente (flujo de 2 pasos).
- **No** resuelve duplicados de catálogo (otro issue de M2).
- **No** abre `storage.rules` ni implementa upload de cliente (#3).
- **No** usa ML/embeddings para el ranking; score determinista y simple.
- **No** integra el flujo de IA de M3; solo expone los candidatos que este consumirá.

## Decisions

### D1 — Un endpoint `GET /api/enrich`, dos caminos internos
`?isbn=<isbn>` → camino canónico, devuelve 0..1 candidato. `?q=<texto>` → camino de búsqueda,
devuelve lista rankeada (top 5). Exactamente uno de los dos params es requerido; ambos o
ninguno → `400`.
*Alternativa descartada:* dos rutas separadas (`/enrich/isbn`, `/enrich/search`) — más
superficie de API para una misma intención. Una ruta con ramificación mantiene el contrato
simple y alineado con el criterio de aceptación del issue.

### D2 — Merge GB-primario por campo
Google Books es la fuente primaria; Open Library completa huecos. Prioridad por campo:

| Campo        | Primario      | Complemento                       |
|--------------|---------------|-----------------------------------|
| título       | Google Books  | OL si GB vacío                    |
| autores      | Google Books  | unir con OL (dedup por authorKey) |
| portada      | mayor resolución entre GB y OL                    |
| categorías   | Google Books (BISAC split+slug)                   |
| ISBN/año/editorial/descripción | Google Books | OL si GB vacío    |

*Alternativa descartada:* "primera fuente que responde gana" — pierde el complemento de
autores/portada que OL aporta.

### D3 — Categorías: split BISAC + slug, solo Google Books
GB devuelve cadenas BISAC jerárquicas con `/` (p.ej. `"Fiction / Science Fiction"`). Se parte
por `/`, se normaliza cada nivel con `slugify`, y se pobla `categories[]` (display, trim) y
`categoryKeys[]` (slugs, dedup). No se usan los `subjects` de Open Library (ruido alto).
*Alternativa descartada:* unir con subjects de OL — más densidad pero más ruido; queda como
mejora futura.

### D4 — Ranking determinista por score ponderado (camino `?q=`)
Función pura, sin I/O, unit-testeable (patrón "slug helper is pure"). El query se normaliza
con el **mismo** `slugify` y se compara slug-contra-slug. Señales (suma de presentes):

```
  titleKey match exacto        +40
  título prefix/parcial match  +20
  algún authorKey coincide      +25
  tiene isbn13                  +10
  tiene portada                  +5
  tiene publishedYear            +3
  sin título o sin autores      → descartado
  empate → respetar orden original de Google Books
  → ordenar desc, top 5
```
*Alternativa descartada:* confiar solo en el orden de relevancia de GB — no es explicable ni
reordena por coincidencia con la consulta del usuario.

### D5 — Cache Firestore `enrichmentCache` con TTL de negativos
Documento keyed por una key normalizada: `isbn:<isbn13>` para el camino ISBN, `q:<slug>` para
búsquedas. Guarda el/los candidato(s) normalizados, `source`, `cachedAt`, `expiresAt`. Un
"miss" (sin resultados) también se cachea con TTL corto para no martillar las APIs ante
negativos. Lectura: cache hit vigente → responde sin pegar a las fuentes.
*Alternativa descartada:* cache en memoria del proceso Express — se pierde al reiniciar y no
comparte entre instancias.

### D6 — Re-hospedaje de portada vía admin SDK
Cuando un candidato se persiste (o, opcionalmente, al primer enrich con ISBN), el server
descarga la portada de la fuente y la sube a Storage bajo una ruta determinista
(p.ej. `covers/<isbn13>.jpg`); `Book.coverUrl` apunta a la URL interna. El admin SDK escribe
sin tocar `storage.rules`.
*Alternativa descartada:* hotlink a la URL de GB/OL — frágil (URLs que caducan, hotlinking
bloqueado, sin control de tamaño/formato).

## Risks / Trade-offs

- **Rate limits / caída de las APIs externas** → cache agresivo (D5), timeouts y manejo de
  error que degrada con elegancia: si una fuente falla, usar la otra; si ambas fallan,
  responder `502`/vacío sin romper el alta manual.
- **Re-hospedar portadas en `/enrich` encarecería búsquedas** → por eso el re-hospedaje se
  hace al **persistir** el libro, no en cada sugerencia (las búsquedas devuelven la URL
  externa solo como preview).
- **TTL de negativos demasiado largo** oculta metadata recién publicada → TTL corto para
  misses, largo para hits por ISBN (la metadata canónica casi no cambia).
- **BISAC split puede generar categorías genéricas** ("Fiction") mezcladas con específicas →
  aceptable para v1; el merge con OL (D3 descartado) queda como mejora.
- **Inconsistencia ISBN-10/13** entre fuentes → normalizar a ISBN-13 como key de cache y de
  re-hospedaje cuando esté disponible.
