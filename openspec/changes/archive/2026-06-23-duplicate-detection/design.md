## Context

El catálogo (#12) tiene `books` y `copies` server-mediados; `books` hoy solo se consulta con
`orderBy("titleKey")` — no hay query por ISBN. El modelo (ADR-0007) separa `Book` (edición
canónica, ≈ un ISBN) de `Copy` (ejemplar físico). Enrichment (#13) aportó `toIsbn13` y los
slugs derivados `titleKey`/`authorKeys`, y un `scoreCandidate` en `services/enrichment/rank.ts`
que ya mide parecido título/autor. Firestore no hace fuzzy ni full-text. Este diseño detecta
duplicados al agregar y recomienda una acción, sin construir la UI que lo consume (#14/#21).

## Goals / Non-Goals

**Goals:**
- Dado un candidato (`isbn`, `title`, `authors`), encontrar `Book`s existentes que sean el
  mismo libro, clasificados EXACT (ISBN) o STRONG (título+autor).
- Recomendar una acción coherente con el modelo: mismo ISBN → copia, no nuevo `Book`.
- Hook puro y reusable por alta manual y alta por IA batch; endpoint de pre-chequeo para la UI.
- Reusar una sola definición de similitud título/autor (compartida con enrichment).

**Non-Goals:**
- **No** crea `Book`/`Copy`: solo detecta y recomienda; la ejecución usa endpoints existentes.
- **No** incluye tier WEAK (título similar sin autor) en v1.
- **No** hace fuzzy/full-text en Firestore; el "fuzzy" se puntúa en memoria sobre un candidato
  acotado por igualdad.
- **No** construye UI de alta (#14) ni el batch de IA (#21).
- **No** agrupa ediciones por `workKey` (#38) — se puede sugerir a futuro.

## Decisions

### D1 — Hook de servicio + endpoint de pre-chequeo (forma A)
`findBookDuplicates(candidate): DuplicateMatch[]` es el núcleo reusable (alta manual + IA
batch). `GET /api/books/duplicates?isbn=&title=&authors=` lo expone para que la UI pinte el
diálogo *antes* de guardar. Los `authors` se pasan repetidos (`?authors=a&authors=b`).
*Alternativa descartada:* guard dentro de `POST /api/books` — acopla, complica el flujo de
2 pasos y el batch de IA, y el criterio de aceptación pide *avisar y ofrecer*, no bloquear.

### D2 — Candidato barato por igualdad + scoring en memoria
Se unen tres queries baratas sobre `books` y se puntúan en memoria:

```
  isbn13   → where("isbn13","==", toIsbn13(isbn))         → tier EXACT
  titleKey → where("titleKey","==", slugify(title))       ┐ candidatos a STRONG
  autores  → where("authorKeys","array-contains", a0)     ┘ (se puntúan en memoria)
```
Todas son índices de campo único automáticos → sin índices compuestos. El array-contains usa
solo el primer `authorKey` para acotar; el solape real se evalúa en memoria.

### D3 — Reglas de tier (semántica de "mismo libro")
```
  EXACT   isbn13(candidato) == isbn13(book)                          → mismo edición
  STRONG  titleKey igual Y:
            ambos con autores y ≥1 authorKey en común                → match (score alto)
            un lado sin autores                                      → match degradado (score menor)
            ambos con autores y 0 solape                             → NO match (homónimo)
```
La distinción "duplicado real vs segundo ejemplar" no la decide el score: la decide el modelo
(ver D4). El score solo ordena y separa STRONG de "no match".

### D4 — `suggestedAction` derivado del modelo Book/Copy
```
  match EXACT (mismo ISBN)            → suggestedAction "add-copy"   (POST /api/copies {bookId})
  match STRONG con ISBN distinto      → "add-new-edition"           (POST /api/books; misma obra)
  match STRONG con ISBN ausente       → "review"                    (ambiguo: deja decidir)
  sin matches                         → recommendation "add-new"
```
Cada `DuplicateMatch` incluye `book` (resumen), `tier`, `score`, `existingCopies`
(`listCopiesByBook(bookId).length`, para "ya tienes N ejemplares") y `suggestedAction`. La
ejecución reusa endpoints de #12/#13 sin endpoint nuevo.

### D5 — Similitud compartida en `lib/text/similarity.ts`
Helper puro `titleAuthorSimilarity(a, b): number` (0–1) = combinación de Jaccard de tokens de
`titleKey` y solape de `authorKeys`. `services/enrichment/rank.ts` se refactoriza para
consumirlo (mismo comportamiento, cubierto por sus tests). El matcher de #16 lo usa para el
score STRONG. Una sola definición de "parecido título+autor".
*Alternativa descartada:* dejar `rank.ts` intacto y duplicar la lógica — dos definiciones que
divergen con el tiempo.

## Risks / Trade-offs

- **Solo el primer `authorKey` acota el array-contains** → un libro cuyo único autor coincidente
  no sea el primero del candidato podría no entrar por esa vía; mitigado porque el match por
  `titleKey` igual ya trae esos candidatos y el solape se evalúa completo en memoria.
- **`titleKey` exacto pierde erratas de título** (sin fuzzy en Firestore) → aceptable en v1
  (EXACT por ISBN cubre el caso común del alta con metadata); WEAK/erratas quedan fuera de
  alcance declarado.
- **Carrera al agregar concurrentemente** (dos altas del mismo libro casi a la vez) → el
  pre-chequeo no es transaccional; el riesgo real es bajo (un solo usuario por lector) y se
  acota con índice único lógico si más adelante hace falta.
- **Refactor del scorer de enrichment** podría alterar el orden de candidatos → se preserva el
  comportamiento y se confía en los tests existentes de `rank.test.ts` como red.
- **`existingCopies` agrega una lectura por match** → acotado (matches suelen ser 0–1); se
  puede omitir si el volumen creciera.
