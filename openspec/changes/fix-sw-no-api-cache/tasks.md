## 1. Excluir `/api/` del service worker

- [x] 1.1 `public/sw.js`: en el handler de `fetch`, reusar el `URL` ya construido para el guard de origen y agregar el guard `if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return;` — `return` sin `respondWith`, para que el request pase directo a la red sin que el SW lo toque.
- [x] 1.2 Comentar el porqué en el propio guard (respuestas session-shaped, persistencia más allá de la sesión, replay de `{"reader":null}` stale) para que no se "simplifique" de vuelta en el futuro.
- [x] 1.3 Actualizar el comentario de cabecera del archivo a "static assets only", manteniendo la nota de SW hand-rolled sin Workbox/next-pwa (ADR-0003).

## 2. Purgar lo ya cacheado por la v1

- [x] 2.1 `public/sw.js`: `CACHE_NAME` de `plm-cache-v1` a `plm-cache-v2`, con el comentario de por qué el bump es parte del fix y no cosmética (el `activate` handler existente borra los caches con nombre viejo; `caches.match()` busca en todos los caches del origen, así que dejar la v1 en disco la mantendría servible).
- [x] 2.2 Verificado que el handler de `activate` ya existente cubre la purga sin cambios: filtra por `name !== CACHE_NAME` y borra, así que el bump alcanza.

## 3. Spec

- [x] 3.1 Delta spec en `openspec/changes/fix-sw-no-api-cache/specs/offline-cache/spec.md`: MODIFIED del requirement de network-first (acotado a GETs no-API) + ADDED de "API requests are never cached or served from cache" y de "A cache strategy change purges responses cached under the previous strategy".
- [x] 3.2 `npx openspec validate fix-sw-no-api-cache --strict` limpio.

## 4. Verificación

- [x] 4.1 `npm run lint`: 0 errores. Queda 1 warning `no-console` preexistente en `app/auth/callback/page.tsx`, ajeno a este cambio.
- [x] 4.2 `npm run typecheck` limpio.
- [x] 4.3 `npm test`: **no da veredicto útil en esta máquina**. La suite viene inestable por timeouts de arranque de workers de vitest (`Timeout waiting for worker to respond`), con conteos que cambian entre corridas (una corrida recolectó 633 tests, otra 478). Comprobado contra el baseline: con el árbol limpio en `main`, sin mis cambios, falla **más** (61 tests / 22 archivos) que con el cambio aplicado (12 / 15). Es flakiness de entorno, no una regresión — y este change solo toca `public/sw.js`, que no está en ningún `include` de `vitest.config.ts` ni lo importa ningún test. El veredicto real lo da CI.
- [x] 4.4 `npm run format:check`: falla repo-wide (446 archivos, incluidos `tsconfig.json` y `server/index.ts`, que no toqué) por CRLF — este worktree tiene `core.autocrlf=true` y prettier espera `endOfLine: lf`. Verificado con `od -c` que la única diferencia en `public/sw.js` es `\r\n` vs `\n`: el contenido es byte-idéntico a la salida de `prettier`. Git normaliza a LF al commitear, así que en CI (Linux) queda limpio. Condición preexistente del entorno, no algo que introduzca este change.
- [ ] 4.5 **Pendiente de verificación live** (requiere build de producción + emuladores + un browser real, como se verificó #41): con la app cargada y el SW v2 activo, confirmar en DevTools → Application → Cache Storage que (a) existe `plm-cache-v2` y ya no existe `plm-cache-v1`, (b) tras navegar `/catalogo` y el detalle de un libro no hay ninguna entrada `/api/*` en el cache, y (c) con el servidor caído, un `GET /api/auth/me` falla con error de red en vez de devolver una respuesta cacheada.

**Nota de cobertura**: no se agrega test automatizado. `public/` no está en ningún `include` de `vitest.config.ts` y `sw.js` no es un módulo importable (script de worker que registra handlers sobre `self`); testearlo pediría ensanchar la config y montar un harness que falsee `self`/`caches`/`fetch`, desproporcionado para un archivo de ~55 líneas y en contra del criterio "SW mínimo hand-rolled". #41 se verificó del mismo modo (live, con el servidor caído). Gap conocido y asumido, ver `design.md`.
