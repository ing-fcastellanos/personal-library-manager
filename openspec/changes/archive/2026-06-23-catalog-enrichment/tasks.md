## 1. Estructura del servicio

- [x] 1.1 Crear `services/enrichment/` con tipos compartidos para un "candidato" (alias del `Book` parcial + `source`)
- [x] 1.2 Definir el contrato interno del servicio (`enrichByIsbn`, `searchByText`) que los clientes y la ruta consumen

## 2. Clientes de fuentes externas

- [x] 2.1 Cliente Google Books: lookup por ISBN y búsqueda por texto, con timeout y manejo de error
- [x] 2.2 Cliente Open Library: lookup por ISBN y portada (covers API), con timeout y manejo de error
- [x] 2.3 Degradación con elegancia: si una fuente falla, usar la otra; si ambas fallan, propagar vacío/502 sin romper

## 3. Normalización al modelo Book

- [x] 3.1 Normalizador Google Books → `Book`, reusando `slugify`/`arraySlugs` para `titleKey`/`authorKeys`/`categoryKeys`
- [x] 3.2 Split BISAC por `/` → `categories[]` (display) + `categoryKeys[]` (slugs dedup)
- [x] 3.3 Normalizador Open Library → `Book` (autores, portada, campos faltantes)
- [x] 3.4 Normalizar ISBN a ISBN-13 cuando esté disponible (key canónica)
- [x] 3.5 Unit tests del normalizador (sin emulador): slugs, BISAC, source

## 4. Merge de fuentes

- [x] 4.1 Merge GB-primario por campo (título/año/editorial/descripción: GB → OL si vacío)
- [x] 4.2 Unir autores GB+OL con dedup por `authorKey`
- [x] 4.3 Elegir portada de mayor resolución entre GB y OL
- [x] 4.4 Unit tests del merge (huecos rellenados, una fuente caída)

## 5. Ranking de candidatos (camino ?q=)

- [x] 5.1 Función pura de score determinista (titleKey exacto/parcial, authorKey, isbn13, portada, año)
- [x] 5.2 Descartar candidatos sin título o sin autores; desempate por orden de la fuente; top 5
- [x] 5.3 Unit tests del ranking (exacto > parcial, pureza/repetibilidad, descarte)

## 6. Cache Firestore

- [x] 6.1 Repositorio `enrichmentCache` (key `isbn:<isbn13>` / `q:<slug>`, `expiresAt`)
- [x] 6.2 Lectura: cache hit vigente sirve sin pegar a fuentes
- [x] 6.3 Escritura: cachear hits y "miss" con TTL corto para negativos
- [x] 6.4 Índice/estrategia de expiración por `expiresAt` (firestore.indexes.json si aplica)
- [x] 6.5 Integration test del cache (segundo hit no llama a las fuentes)

## 7. Re-hospedaje de portada

- [x] 7.1 Descargar portada de la fuente y subirla a Storage vía admin SDK (ruta determinista `covers/<isbn13>`)
- [x] 7.2 Devolver URL interna de Storage para `Book.coverUrl` al persistir
- [x] 7.3 Asegurar que el camino `?q=` NO re-hospeda (solo preview con URL externa)

## 8. Endpoint y wiring

- [x] 8.1 `server/routes/enrich.ts`: `GET /api/enrich`, validación de params mutuamente excluyentes (`isbn` xor `q` → 400)
- [x] 8.2 Ramificar a `enrichByIsbn` (0..1) vs `searchByText` (top 5)
- [x] 8.3 Montar la ruta en `server/index.ts`
- [x] 8.4 Integration tests del endpoint (ISBN único, búsqueda rankeada, 400 params, 200 vacío)

## 9. Cierre

- [x] 9.1 Pasar lint, typecheck y test suite (unit + integration)
- [x] 9.2 Verificar criterios de aceptación del #13 contra los scenarios del spec
