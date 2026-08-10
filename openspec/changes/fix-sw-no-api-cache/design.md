## Context

`public/sw.js` (de #41) tiene un solo handler de `fetch` con dos guards de bypass: no-GET y cross-origin. Todo lo que pasa esos dos guards entra a la estrategia network-first cache-on-visit, que guarda cualquier `response.ok` en `plm-cache-v1` y lo re-sirve desde `caches.match(request)` si un `fetch` posterior tira.

En el servidor (ADR-0003, `server/index.ts`) Express monta absolutamente todos sus routers bajo `/api` (`app.use("/api", …)` × ~15) y todo lo demás cae en el handler de Next (`app.all("*", handle)`), que también sirve `public/`. O sea que el split "API vs. resto" es exactamente el split de path `/api/*` vs. todo lo demás — no hace falta ninguna lista de rutas para separarlos.

De los GET bajo `/api`, solo dos llevan identidad detrás: `GET /api/auth/me` (deriva el lector de la cookie de sesión) y `GET /api/ai/settings` (único GET con `requireAuth`). El resto de las lecturas son públicas por ADR-0006. Las escrituras ya estaban fuera del alcance del SW por el guard de no-GET.

## Goals / Non-Goals

**Goals:**

- Que ninguna respuesta de `/api/*` se escriba en el Cache Storage.
- Que ninguna respuesta de `/api/*` se pueda servir desde cache ante un fallo de red.
- Que lo ya cacheado por la v1 en dispositivos reales se purgue solo, sin acción manual del lector.
- No tocar el offline de los assets estáticos, que es lo que sigue teniendo sentido cachear.

**Non-Goals:**

- Recuperar el offline de datos por otra vía (allowlist de GETs no-sesión, IndexedDB con TTL, purga en logout). Otro diseño, otro issue.
- Adoptar Workbox/next-pwa: sigue valiendo el argumento de #41 (el custom server de ADR-0003 no es el setup que esas libs asumen) y este change achica el SW, no lo agranda.
- Tocar el registro del SW, el manifest o los íconos.
- Cualquier cambio server-side (headers `Cache-Control`, `Vary`, etc.).

## Decisions

**Bypass total (`return` sin `respondWith`), no "cachear pero no servir".**
El handler puede salir de dos formas: sin llamar a `respondWith` (el browser resuelve el request nativamente, el SW queda afuera) o interceptando y haciendo el `fetch` él mismo. Se elige lo primero, igual que los guards de no-GET y cross-origin que ya existen — es la única variante en la que el SW deja de ser parte del camino de la request. Una alternativa era seguir interceptando pero saltear solo el `cache.put`: descartada porque deja al SW en el medio (proxyeando cada llamada a la API a través del ciclo de vida del worker) sin ningún beneficio a cambio, y porque un bug futuro en esa rama vuelve a poner respuestas de API en cache. Menos superficie es mejor: los requests de API vuelven a comportarse exactamente como si no hubiera SW.

**Guard por `URL.pathname`, con `/api` exacto además del prefijo `/api/`.**
Se chequea `pathname === "/api" || pathname.startsWith("/api/")` sobre el `URL` ya construido para el guard de origen (se reusa el objeto en vez de construirlo dos veces). Se usa `pathname` y no `request.url` a secas para que un querystring o un fragmento no puedan hacer que el match falle o acierte por accidente. El caso `/api` exacto no matchea ningún router hoy, pero incluirlo evita que el guard dependa de ese detalle.

**Blocklist de `/api/`, no allowlist de assets estáticos.**
La alternativa era invertirlo: cachear solo lo que matchee una allowlist (extensiones estáticas, `/_next/static/…`). Se descarta porque el HTML de las rutas del App Router no tiene extensión y es justamente lo que hay que seguir cacheando para que el shell abra offline — una allowlist basada en extensión lo dejaría afuera, y una que lo incluya termina siendo "todo lo que no es `/api`", o sea la misma blocklist escrita al revés y con más piezas. Dado que el split de paths del servidor es limpio (todo Express bajo `/api`, todo lo demás Next), la blocklist expresa la regla real con una línea. Ver Riesgos por lo que esto asume.

**Bump de `CACHE_NAME` a `plm-cache-v2` como mecanismo de purga.**
El fix del handler evita escrituras nuevas pero no borra nada: los dispositivos que ya corrieron la v1 tienen respuestas de `/api/*` en `plm-cache-v1`, y mientras ese cache siga existiendo `caches.match()` las puede devolver (`caches.match` sin `cacheName` busca en **todos** los caches del origen, no solo en el actual — así que ni siquiera alcanzaría con abrir solo el cache nuevo). El `activate` handler ya borra todo cache cuyo nombre no sea `CACHE_NAME`, así que el bump purga la v1 entera en la primera activación post-deploy. Se pierden también las entradas estáticas de la v1, que se recachean solas en la primera visita con red — costo irrelevante frente a dejar datos de sesión en disco. Esto es literalmente el uso previsto que documentó el `design.md` de #41 para el versionado manual del nombre.

**Sin test automatizado; verificación live, como en #41.**
`public/` no está en ningún `include` de `vitest.config.ts` (los proyectos cubren `{lib,server,services,scripts}` y `{app,components}`), y `sw.js` no es un módulo importable: es un script de worker que se registra por efectos sobre `self`. Testearlo exigiría o bien ensanchar la config de vitest y montar un harness que falsee `self`/`caches`/`fetch` para un archivo de ~50 líneas, o bien una dependencia de service-worker-mock — desproporcionado para el tamaño del archivo y en contra del criterio "SW mínimo hand-rolled". #41 se verificó igual: live, con el servidor caído para producir un fallo de red real. Se mantiene ese método, que además es el único que prueba lo que importa acá (que el browser realmente no guarde nada en Cache Storage). Queda anotado como gap conocido, no como olvido.

## Risks / Trade-offs

- **[Trade-off, el grande] El offline de datos de #41 se pierde.** Las páginas del App Router son shells y la data llega client-side, así que sin `/api/*` en cache, offline el shell renderiza y la data no: se ve el estado de error/vacío, no el catálogo. El caso de uso textual de #41 ("seguir viendo lo último visitado sin señal") queda reducido a la cáscara. Aceptado: servir identidad de sesión stale es peor que no mostrar datos, y una falla visible es mejor que datos viejos que parecen actuales. Recuperarlo bien es otro diseño (allowlist de GETs no-sesión o IndexedDB con TTL + purga en logout) y otro issue.
- **[Riesgo] La blocklist asume que nada fuera de `/api/` es específico de la sesión.** Hoy es cierto: los shells del App Router no personalizan por lector (la data la piden client-side). Si alguna vez una página pasa a renderizar server-side algo derivado de la cookie de sesión, volvería a caer en el cache por default y reintroduciría el problema 1 en otro path. No hay nada en el repo que lo prevenga automáticamente; queda como algo a mirar si el patrón de rendering cambia.
- **[Riesgo] Los lectores con la v1 instalada siguen expuestos hasta que el SW nuevo active.** Entre el deploy y la primera visita que instale y active la v2, `plm-cache-v1` sigue en disco con lo que ya tenía. `skipWaiting()` + `clients.claim()` (ya presentes) hacen que eso sea la primera carga post-deploy, no "cuando se cierren todas las pestañas". No hay forma de purgar antes sin que el dispositivo se conecte.
- **[Trade-off] Sin cobertura automatizada, una regresión futura en el handler no la agarra CI.** Mitigado en parte por el tamaño del archivo y por que el guard es una sola condición junto a los otros dos, no lógica dispersa.

## Migration Plan

Sin migración de datos: no se toca Firestore ni ningún contrato de API. El único estado afectado vive en el Cache Storage de cada browser y lo resuelve el propio SW — deploy normal, y en la primera visita post-deploy el SW nuevo instala (`skipWaiting`), activa, borra `plm-cache-v1` completo y toma control (`clients.claim`).

Rollback: revertir el commit hace que se sirva el `sw.js` viejo, que al activarse borra `plm-cache-v2` y vuelve a cachear `/api/*` como antes. No requiere acción manual, pero **reintroduce el defecto** — si hiciera falta revertir por otro motivo, conviene revertir el guard del `fetch` handler y no el bump de `CACHE_NAME`.

## Open Questions

Ninguna. El alcance (solo `/api/*`, sin sustituto para el offline de datos) viene fijado en #118.
