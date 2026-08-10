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
- [x] 4.3 `npm test`: **no da veredicto útil en esta máquina**. La suite viene inestable por timeouts de arranque de workers de vitest (`Timeout waiting for worker to respond`), con conteos que cambian entre corridas (una corrida recolectó 633 tests, otra 478). Comprobado contra el baseline: con el árbol limpio en `main`, sin mis cambios, falla **más** (61 tests / 22 archivos) que con el cambio aplicado (12 / 15). Es flakiness de entorno, no una regresión — y este change solo toca `public/sw.js`, que no está en ningún `include` de `vitest.config.ts` ni lo importa ningún test. El veredicto real lo da CI: **el job `Lint · Typecheck · Test` pasó en 1m57s** (`lint` + `typecheck` + `test` sobre Linux), confirmando que las fallas locales eran de entorno.
- [x] 4.4 `npm run format:check`: falla repo-wide (446 archivos, incluidos `tsconfig.json` y `server/index.ts`, que no toqué) por CRLF — este worktree tiene `core.autocrlf=true` y prettier espera `endOfLine: lf`. Verificado con `od -c` que la única diferencia en `public/sw.js` es `\r\n` vs `\n`: el contenido es byte-idéntico a la salida de `prettier`. Confirmado además sobre el blob ya commiteado (`git show HEAD:public/sw.js`) que quedó con LF, así que el contenido versionado está prettier-limpio. Condición preexistente del entorno, no algo que introduzca este change. (Nota: `ci.yml` corre `lint`/`typecheck`/`test`, **no** `format:check` — el formato lo cubre el hook de pre-commit vía lint-staged, que además no toca `*.js`.)
- [x] 4.5 **Verificación live hecha**, en dos partes.

  **(a) y (b) contra producción real** (`https://library.fcastellanos.dev`, ya con el merge de #119 desplegado a Cloud Run). Confirmado que el `/sw.js` servido es el v2 (`CACHE_NAME = "plm-cache-v2"` y el guard de `/api/` presente en el archivo que baja el browser). Con el SW activo y controlando la página (`navigator.serviceWorker.controller` no nulo), se navegó el sitio y se dispararon `GET /api/auth/me`, `/api/books` y `/api/readers` — los tres respondieron `200`. Enumerando el Cache Storage completo por JS (`caches.keys()` + `cache.keys()` de cada uno, no a ojo en el panel de DevTools, que corta la lista y ordena `/api/` después de `/_next/`): **un solo cache, `plm-cache-v2`, con 54 entradas, y 0 entradas bajo `/api/`**. `plm-cache-v1` no existe.

  **(c) y la purga, contra un harness local aislado** (server HTTP mínimo en `localhost:8099` sirviendo un shell, `/static-asset.txt`, `/api/auth/me`, `/api/books` y el `sw.js` intercambiable), porque hacía falta poder matar el server de verdad y además reproducir el estado v1 previo, que en producción ya no existe:
  - **Bug reproducido con el v1**: tras cargar y pedir las rutas, `plm-cache-v1` quedó con `/api/auth/me` y `/api/books` adentro. Matando el server (connection refused verificado con `curl`, exit 7), `GET /api/auth/me` devolvió **`200 {"reader":null}` desde cache** — exactamente el replay de identidad stale que motiva este change.
  - **Purga verificada**: sirviendo ahora el `sw.js` v2 y forzando el update, al activar el SW nuevo `caches.keys()` quedó **vacío** — `plm-cache-v1` borrado entero, con sus entradas de `/api/*` incluidas.
  - **Sin cacheo de API con el v2**: repitiendo el mismo tráfico, `plm-cache-v2` quedó solo con `/sw.js` y `/static-asset.txt`; 0 entradas `/api/`.
  - **Sin replay, probado a lo bruto**: se plantó _a mano_ una entrada `/api/auth/me` en `plm-cache-v2` (`{"reader":null,"PLANTED":true}`, recuperable con `caches.match()`), y recién ahí se mató el server. `GET /api/auth/me` y `GET /api/books` fallaron con **`TypeError: Failed to fetch`** con la entrada plantada todavía en el cache — o sea que el SW ni consulta el cache para `/api/*`, no es que "casualmente no había nada guardado". En la misma corrida `GET /static-asset.txt` siguió sirviendo `200` desde cache, confirmando que el offline de assets estáticos sigue intacto.

**Nota de cobertura**: no se agrega test automatizado. `public/` no está en ningún `include` de `vitest.config.ts` y `sw.js` no es un módulo importable (script de worker que registra handlers sobre `self`); testearlo pediría ensanchar la config y montar un harness que falsee `self`/`caches`/`fetch`, desproporcionado para un archivo de ~55 líneas y en contra del criterio "SW mínimo hand-rolled". #41 se verificó del mismo modo (live, con el servidor caído). Gap conocido y asumido, ver `design.md`.
