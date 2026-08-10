## Why

El service worker de #41 (`public/sw.js`) cachea sin allowlist: intercepta todo GET mismo-origen y hace `cache.put(request, response.clone())` ante cualquier `response.ok`. Eso mete `/api/*` en el Cache Storage del navegador (en disco) y lo habilita a re-servirse desde `caches.match(request)` cuando la red falla. Issue #118, encontrado al diagnosticar el problema de login de `library.fcastellanos.dev` (#114–#117) — defecto real aparte, **no** la causa de ese bug.

Dos problemas distintos:

1. **Datos de sesión persistidos fuera del control de la sesión.** `GET /api/auth/me` (el lector firmado) y `GET /api/ai/settings` — los dos únicos GET con identidad/sesión detrás — quedan en disco y no se limpian al cerrar sesión: el Cache Storage es por origen, no por sesión, así que sobreviven al logout y a la expiración de la cookie. Los demás GET (`/api/books`, `/api/readers`, `/api/copies`, `/api/reading-events`) son lecturas públicas por ADR-0006, pero siguen siendo datos del hogar persistidos en disco sin nada que los expire.

2. **Replay de estado stale ante un corte de red.** Un blip momentáneo hace que se sirva la respuesta de un estado anterior. El caso feo es `GET /api/auth/me`: un `{"reader":null}` cacheado de cuando el lector estaba deslogueado se re-sirve ante cualquier fallo de red y la app muestra sesión cerrada aunque la cookie sea válida; simétricamente puede re-servir un lector viejo después del logout.

El `design.md` de #41 **anticipó y aceptó** el punto 1 para `/api/auth/me`, argumentando que no hay fuga entre lectores (mismo browser/perfil) y que las escrituras igual exigen red + cookie válida. Ese razonamiento sigue siendo cierto y sigue siendo el motivo por el que esto no es una vulnerabilidad. Lo que no cubrió es el punto 2: el replay de estado stale es un problema de **correctitud**, no de confidencialidad, y no lo tapa ninguna de esas dos mitigaciones. Esta change revierte a conciencia aquel trade-off documentado.

## What Changes

- `public/sw.js`: el handler de `fetch` saltea cualquier request cuyo path sea `/api` o empiece con `/api/` — `return` sin `respondWith`, de modo que el browser la resuelve nativamente y el SW no la toca (no la cachea ni la puede servir desde cache). Es el mismo mecanismo de bypass que ya se usa para no-GET y para cross-origin.
- `public/sw.js`: `CACHE_NAME` pasa de `plm-cache-v1` a `plm-cache-v2`. Sin esto el fix solo evita escrituras **nuevas**: las entradas `/api/*` ya guardadas en los dispositivos que corrieron la v1 seguirían en disco y seguirían siendo servibles. El handler de `activate` que ya existe borra todo cache con nombre distinto al actual, así que el bump las purga en la primera activación post-deploy. Es exactamente el mecanismo que el `design.md` de #41 dejó previsto para "si la estrategia de cacheo cambia, se bumpea el string a mano".
- Se mantiene todo lo demás igual: network-first cache-on-visit para los assets estáticos reales, `skipWaiting()`/`clients.claim()`, y el SW hand-rolled mínimo sin Workbox/next-pwa (ADR-0003 y el comentario al tope del archivo).

**Fuera de alcance**: recuperar el offline de datos por otra vía (allowlist de GETs no-sesión, IndexedDB con TTL y purga en logout) — ver el costo consciente abajo; es otro diseño y otro issue. Tampoco se toca `components/shell/sw-register.tsx`, el manifest, ni ningún endpoint.

## Costo consciente: se achica el offline de #41

El `design.md` de #41 observó que las páginas del App Router son shells livianos y que la data real llega client-side vía `fetch` — o sea que cachear `/api/*` era justamente lo que hacía funcionar "ver el catálogo sin señal". Sacándolo, offline el shell de `/catalogo` o `/libros/:id` renderiza pero la data no llega: se ve el estado de error/vacío del componente, no la lista de libros. El caso de uso textual de #41 queda reducido a la cáscara de la app.

Se acepta: servir identidad de sesión stale desde disco es peor que no mostrar datos, y el modo de falla que queda es honesto (falla visible) en vez de silencioso (datos viejos que parecen actuales). Queda registrado acá y en `design.md` para que la próxima persona que lea la spec de `offline-cache` no crea que el offline de catálogo sigue en pie.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `offline-cache`: acota el requirement de network-first cache-on-visit a los assets estáticos (deja de aplicar a `/api/*`), agrega el requirement de que los requests de API pasan de largo sin ser interceptados, y agrega el requirement de que un cambio en la estrategia de cacheo purga lo cacheado por la estrategia anterior.

## Impact

- **Modificado**: `public/sw.js` (el guard nuevo en el handler de `fetch` + el bump de `CACHE_NAME`).
- **Modificado**: `openspec/specs/offline-cache/spec.md` (vía delta spec).
- **Sin cambios**: `components/shell/sw-register.tsx`, `public/manifest.webmanifest`, los íconos, cualquier ruta de Express o de la API, cualquier colección de Firestore, y las dependencias (cero nuevas).
- **Sin migración de datos.** El único estado afectado vive en el Cache Storage de cada browser y lo purga el `activate` del SW nuevo por el bump de nombre.
