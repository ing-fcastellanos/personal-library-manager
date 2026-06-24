## 1. Similitud compartida

- [x] 1.1 Crear `lib/text/similarity.ts` con `titleAuthorSimilarity(a, b): number` (0–1), puro: Jaccard de tokens de `titleKey` + solape de `authorKeys`
- [x] 1.2 Unit tests de `titleAuthorSimilarity` (determinismo, título+autor > solo título, sin autores)
- [x] 1.3 Refactor `services/enrichment/rank.ts` para consumir el helper; confirmar que `rank.test.ts` sigue verde (sin cambio de comportamiento)

## 2. Queries de repositorio (books)

- [x] 2.1 `findBooksByIsbn13(isbn13)` en `services/books/repository.ts` (`where("isbn13","==")`, limit)
- [x] 2.2 `findBooksByTitleKey(titleKey)` (`where("titleKey","==")`)
- [x] 2.3 `findBooksByAuthorKey(authorKey)` (`where("authorKeys","array-contains")`)
- [x] 2.4 Integration tests de las queries (emulador): match y no-match

## 3. Matcher puro

- [x] 3.1 Definir tipos: `DuplicateCandidate` (isbn/title/authors), `DuplicateMatch` (book, tier, score, existingCopies, suggestedAction), `recommendation`
- [x] 3.2 `classifyMatch(candidate, book)` puro: EXACT por ISBN; STRONG por `titleKey`+autor según reglas (solape, sin autores, homónimo → no match)
- [x] 3.3 Derivar `suggestedAction`/`recommendation` desde el modelo (add-copy / add-new-edition / review / add-new)
- [x] 3.4 Unit tests del matcher (EXACT, STRONG con solape, sin autores degradado, homónimo descartado, suggestedAction)

## 4. Servicio (hook reusable)

- [x] 4.1 `findBookDuplicates(candidate)` en `services/duplicates/service.ts`: une candidatos por isbn/titleKey/authorKey, dedup por bookId, clasifica con el matcher
- [x] 4.2 Adjuntar `existingCopies` vía `listCopiesByBook` (#12) por match
- [x] 4.3 Inyectabilidad de las queries para tests sin red/emulador donde aplique
- [x] 4.4 Integration test del hook (emulador): siembra books/copies y verifica matches + recommendation

## 5. Endpoint y wiring

- [x] 5.1 `server/routes/` — `GET /api/books/duplicates?isbn=&title=&authors=` (authors repetibles), 400 si falta isbn y title
- [x] 5.2 Mapear el resultado del hook al JSON de respuesta (matches + recommendation)
- [x] 5.3 Montar la ruta en `server/index.ts` (antes del catch-all de Next)
- [x] 5.4 Tests del endpoint (lane node, servicio mockeado): 200 con matches, 400 sin query, ramas isbn/title

## 6. Cierre

- [x] 6.1 Pasar lint, typecheck y test suite (unit + integration)
- [x] 6.2 Verificar criterios de aceptación del #16 contra los scenarios del spec (avisa y ofrece omitir/copia/editar)
