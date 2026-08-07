## Context

Servidor único Express + Next.js App Router (ADR-0003, `server/index.ts`): las rutas `/api/*` las maneja Express con routers propios, todo lo demás cae en el handler de Next (`app.all("*", handle)`). Next sirve `public/` automáticamente a través de ese mismo handler — un archivo en `public/sw.js` queda disponible en `/sw.js` sin tocar `server/index.ts`.

El manifest (`public/manifest.webmanifest`, linkeado desde `app/layout.tsx` vía `metadata.manifest`) y `appleWebApp.capable` ya existen (probablemente de un scaffold temprano), pero con un solo ícono SVG — sin PNG/maskable en los tamaños que Android e iOS realmente usan para el ícono de "Agregar a inicio". No hay service worker en ningún lado del repo hoy: cero cache, cero offline.

Los reads (`GET /api/*`) son públicos por ADR-0006 (ver `auth-session` spec) — no requieren sesión. Esto importa para la estrategia de cache: cachear una respuesta GET no implica cachear algo específico de un lector autenticado (con la excepción de `GET /api/auth/me`, ver Riesgos).

Las páginas del App Router (`app/catalogo/page.tsx` y similares) son shells de servidor livianos; la data real llega client-side vía `fetch` en client components (mismo patrón usado en #40 para Actividad). Esto simplifica el caching: cachear el HTML del shell (casi estático) + las respuestas `/api/*` que ese shell dispara cubre efectivamente "lo que el lector visitó".

## Goals / Non-Goals

**Goals:**
- La app es instalable con íconos correctos en Android/iOS (manifest completo + apple-touch-icon).
- Cualquier página/dato que el lector ya visitó con conexión sigue siendo legible sin conexión.
- Cero dependencias nuevas de producción, cero servicio nuevo (scheduler, push, etc).

**Non-Goals:**
- Push notifications / recordatorios (requieren VAPID + subscriptions + scheduler — no existen hoy, salto de complejidad aparte, issue futuro).
- Cola de escrituras offline con reintento/resolución de conflictos.
- Precache proactivo de todo el catálogo (sería costoso en un hogar con cientos/miles de libros y no es lo que pidió el issue).
- Página `offline.html` custom para rutas nunca visitadas.

## Decisions

**Service worker hand-rolled, sin Workbox/next-pwa.**
El servidor custom Express+Next (ADR-0003) no es el setup que estas librerías asumen (esperan Next standalone o export estático); integrarlas sería pelear contra esa arquitectura para un caso de uso simple. Un `public/sw.js` de ~40-60 líneas (install/activate/fetch) es suficiente y queda totalmente bajo control del repo, sin build step adicional.

**Estrategia: network-first, cache-on-visit, sin allowlist.**
El `fetch` handler del SW intercepta cualquier GET mismo-origen: intenta red primero; si responde 200, cachea una copia y devuelve esa respuesta; si la red falla (offline), sirve la copia cacheada si existe, si no, deja que el navegador muestre su página nativa de error. Nunca cache-first — nunca se sirve una copia vieja habiendo red, evitando el problema clásico de "vi datos desactualizados con wifi andando". Alternativa descartada: stale-while-revalidate (sirve cache instantáneo + revalida en background) — más rápido percibido, pero reintroduce la posibilidad de mostrar brevemente datos stale con red disponible, que no es el problema que este issue busca resolver (el problema es *sin* red, no *velocidad con* red).

**Sin allowlist de rutas — cachea todo GET mismo-origen exitoso.**
Alternativa considerada: lista explícita de rutas "offline-safe" (`/catalogo`, `/api/books`, etc). Se descarta: agrega mantenimiento (cada página nueva necesita agregarse) por un beneficio marginal — cachear de más solo cuesta espacio en el Cache Storage del browser, que en este uso (un hogar, cientos de libros, no miles de imágenes de alta resolución cacheadas repetidamente ya que las portadas son URLs externas de Storage, mismo-origen no las incluye) es insignificante.

**Escrituras: sin cambios, sin detección online/offline en UI.**
Un POST/PATCH/DELETE offline falla como cualquier otro error de red hoy — cae en el manejo de errores/toast existente. Agregar `navigator.onLine`/eventos `online`/`offline` para deshabilitar botones proactivamente es una mejora de UX real pero no evita nada (el fetch ya falla igual de bien) y no fue lo que se pidió — se deja fuera para no ensanchar el alcance.

**Versionado de cache: nombre estático, bump manual.**
Un solo string de versión en el nombre del Cache Storage (ej. `plm-cache-v1`). Como la estrategia es network-first, el contenido cacheado nunca se sirve teniendo red — no hace falta invalidación agresiva ligada al build. Si la estrategia de cacheo cambia (ej. se agrega un recurso a excluir), se bumpea el string a mano y el `activate` handler borra caches con nombre viejo.

**Íconos: generados una vez con `sharp`, commiteados como assets estáticos.**
`sharp` ya está disponible transitivamente (dependencia de Next para optimización de imágenes) — se usa en un script de un solo uso durante la implementación de este change, no queda como dependencia de producción nueva ni corre en cada build. Los PNG resultantes (192, 512, maskable, apple-touch-icon) se commitean en `public/`.

## Risks / Trade-offs

- **[Riesgo] `GET /api/auth/me` queda cacheado como cualquier otro GET** → si el dispositivo pasa a offline justo después de un logout, podría servirse una identidad vieja desde cache. Mitigación: es el mismo browser/sesión del propio lector (no hay fuga entre lectores — el Cache Storage es por origen+perfil de browser, no por sesión), y las escrituras (incluida cualquier acción sensible) igual requieren red + cookie de sesión válida, que el SW no puede fabricar. Se acepta como trade-off de "sin allowlist" en vez de agregar una excepción especial que complica el fetch handler para un caso borde de bajo impacto.
- **[Riesgo] Cache Storage crece sin límite** (cachea todo lo visitado, para siempre, sin expiración) → en el uso real (un hogar, uso normal de la app) el volumen es bajo; si se vuelve un problema, es un follow-up (LRU/expiración), no bloqueante para este change.
- **[Trade-off] Rutas nunca visitadas offline muestran el error nativo del navegador**, no una pantalla propia de la app → aceptado explícitamente en el alcance (issue #41 no lo pide) para no agregar una `offline.html` y su mantenimiento.
- **[Riesgo] Actualizaciones del SW mismo** → `skipWaiting()` en `install` + `clients.claim()` en `activate` aseguran que una nueva versión del SW tome control apenas se instala, sin esperar a que se cierren todas las pestañas — evita quedar pegado a una versión vieja del cacheo.

## Migration Plan

No hay migración de datos (sin cambios a Firestore). Deploy normal: el SW nuevo se registra en la primera visita post-deploy y reemplaza cualquier estado previo (no había SW antes, no hay que desregistrar nada). Sin rollback especial — revertir el commit deja de servir `/sw.js` con contenido nuevo; los clientes que ya lo registraron simplemente dejan de recibir actualizaciones de cache hasta que el navegador refresque el SW (comportamiento estándar, no requiere acción manual).

## Open Questions

Ninguna — alcance y estrategia confirmados en explore.
