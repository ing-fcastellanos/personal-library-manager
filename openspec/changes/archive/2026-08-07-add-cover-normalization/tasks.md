## 1. Dependencia y normalización compartida

- [x] 1.1 Agregar `sharp` como dependencia directa a `package.json` (hoy solo transitiva).
- [x] 1.2 `services/covers/normalize.ts`: `normalizeCoverImage(input: Buffer): Promise<Buffer>` — `sharp(input).resize({width: 600, withoutEnlargement: true}).webp({quality: 80}).toBuffer()`. Deja propagar la excepción de `sharp` si el buffer no es una imagen decodificable (no la atrapa).
- [x] 1.3 Tests de `normalizeCoverImage`: una imagen real más ancha que 600px queda achicada a 600px de ancho y en formato WebP; una imagen real más angosta que 600px NO se agranda (mantiene su ancho) y queda en WebP; un buffer no-imagen tira una excepción.

## 2. Subida manual (`uploadCover`)

- [x] 2.1 `services/covers/service.ts`: llamar a `normalizeCoverImage` antes de subir; el path pasa a `covers/<bookId>.webp` siempre; eliminar `extensionFor()` (ya no hace falta, la salida es siempre webp) y el `contentType` fijo a `image/webp` en el `save()`.
- [x] 2.2 Atrapar la excepción de `normalizeCoverImage` y remapearla a `CoverValidationError` (mismo tratamiento 400 que "tipo no soportado"/"imagen muy grande").
- [x] 2.3 `services/covers/service.test.ts`: reemplazar el fixture `Buffer.from("fake-png-bytes")` por una imagen real mínima generada con `sharp` (`sharp({create:{width,height,channels,background}}).png().toBuffer()`); actualizar las aserciones de path/contentType a `.webp`/`image/webp`; agregar un caso para un buffer no-imagen → `CoverValidationError`.

## 3. Re-hosting (`rehostCover`)

- [x] 3.1 `services/enrichment/cover.ts`: llamar a `normalizeCoverImage` sobre el buffer descargado antes de subir; el path pasa a `covers/<isbn13>.webp` siempre; eliminar `extensionFor()`; `contentType` fijo a `image/webp` en el `save()`.
- [x] 3.2 Envolver la normalización en el mismo `catch` que ya maneja un fallo de descarga/red — un buffer no decodificable también resulta en `return null` (el libro se persiste sin portada re-hosteada), sin cambiar la firma ni el comportamiento externo de la función.
- [x] 3.3 No existía cobertura de `rehostCover` (ni directa ni indirecta) — creado `services/enrichment/cover.test.ts` cubriendo: descarga+resize+normalización exitosa a `covers/<isbn13>.webp`; sin URL → `null`; descarga fallida → `null`; bytes no decodificables → `null` sin llamar a `save`.

## 4. Verificación

- [x] 4.1 `npm run typecheck` / lint limpios.
- [x] 4.2 `npm test` completo sin regresiones — 109/109 archivos, 671/671 tests. Corridas intermedias mostraron fallos por carga (timeouts en archivos no relacionados a este cambio, un subconjunto distinto en cada corrida — patrón de carga ya documentado varias veces esta sesión, no una regresión real); confirmado limpio tanto en aislamiento (muestra representativa + `intake.test.ts`) como en una corrida completa final sin ruido.
- [x] 4.3 Verificación live real (sesión autenticada vía el truco del REST del emulador de Auth): desde la UI real de edición de libro (botón "Cambiar" → input de archivo), se subió una imagen sintética real de 1200×800 (generada con `<canvas>`, PNG) contra un libro seedeado real. Resultado verificado cargando el objeto resultante y leyendo sus dimensiones/formato reales: `covers/hDM0qm6sQbNwOm7ytx6K.webp`, `content-type: image/webp`, **600×400** (aspect ratio 3:2 preservado). Repetido con una imagen de 300×200 (más angosta que 600px): resultado **300×200 sin agrandar**, también WebP. Ambos casos confirmados con datos reales, no simulados.
- [x] 4.4 Verificación live real del camino de re-hosting: `GET /api/enrich?isbn=9780143127550` devolvió un candidato real con portada externa de Open Library; persistido vía `POST /api/books/intake` (dispara `rehostCover`). El libro resultante quedó con `coverUrl` en `covers/9780143127550.webp`; verificado cargando el objeto: `content-type: image/webp`, 288×500 (la portada externa ya era más angosta que 600px, sin agrandar — comportamiento correcto). Datos de prueba limpiados después: portada original restaurada en el libro seedeado, libro+ejemplar del intake de prueba borrados — el dataset del emulador quedó igual que antes de la verificación (18 libros).
