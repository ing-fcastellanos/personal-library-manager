## 1. Íconos e instalabilidad

- [x] 1.1 Script de un solo uso (`sharp`) que genera desde `public/icon.svg`: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (180×180) en `public/`.
- [x] 1.2 Correr el script, commitear los PNG resultantes, borrar/no dejar el script como parte del build (uso único).
- [x] 1.3 Actualizar `public/manifest.webmanifest`: agregar las entradas de íconos 192/512 (`purpose: "any"`) y la maskable, manteniendo el SVG existente como fallback `any`.
- [x] 1.4 Agregar `<link rel="apple-touch-icon">` en `app/layout.tsx` (vía `metadata.icons.apple` si Next lo resuelve, si no un `<link>` manual en el `<head>`).

## 2. Service worker

- [x] 2.1 Crear `public/sw.js`: `install` con `self.skipWaiting()`, `activate` con `clients.claim()` + limpieza de caches con nombre distinto al actual (`plm-cache-v1`).
- [x] 2.2 Implementar el `fetch` handler: solo intercepta `GET` mismo-origen; intenta red, si responde `200` clona y guarda en cache, devuelve la respuesta de red; si la red falla, responde con `caches.match(request)` (si no hay match, deja pasar el error nativo).
- [x] 2.3 Ignorar explícitamente métodos no-GET (pasar directo a `fetch`, sin tocar cache).

## 3. Registro del service worker

- [x] 3.1 Crear `components/shell/sw-register.tsx` (client component): efecto que llama `navigator.serviceWorker.register("/sw.js")` una sola vez, con guard `if ("serviceWorker" in navigator)`, sin bloquear el render.
- [x] 3.2 Montarlo en `app/layout.tsx` (o dentro de `AppShell`) junto a los demás providers.

## 4. Verificación

- [x] 4.1 `npm run typecheck` / lint limpios.
- [x] 4.2 Verificación live: build de producción + emuladores. Registro del SW confirmado (`navigator.serviceWorker.controller` activo). Visitada `/catalogo` y el detalle de un libro real (datos seedeados) — ambas rutas y sus fetches de `/api/*` quedaron en `plm-cache-v1`. Offline simulado matando el proceso del servidor (falla de red real, no solo un mock): recargando `/libros/:id` la página renderizó completa desde cache (título, autores, ejemplares, lectura). Una ruta nunca visitada (`/prestamos`) falló por completo offline, como especifica el diseño (sin `offline.html` custom).
- [x] 4.3 Manifest servido con los 4 íconos (`icon.svg` any, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` maskable); los 4 PNG (+ apple-touch-icon) responden `200 image/png`; `<link rel="apple-touch-icon">` y `<link rel="manifest">` presentes en el `<head>`. (No se usó DevTools Application tab directamente — verificado por fetch directo, equivalente.)
- [x] 4.4 Confirmado con un PATCH real contra el servidor caído: la escritura falla con `TypeError: Failed to fetch` (error de red genuino, sin sustitución por cache) — el SW nunca la interceptó, así que cae en el manejo de errores/toast existente sin cambios.
