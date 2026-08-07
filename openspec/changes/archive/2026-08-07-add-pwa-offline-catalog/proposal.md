## Why

La app ya se sirve como PWA instalable a medias (`manifest.webmanifest` + un solo ícono SVG, sin service worker) pero en la práctica el catálogo no es usable sin conexión, ni la instalación se siente completa (sin íconos PNG/maskable en los tamaños que Android/iOS esperan). El hogar la usa desde el celular en la biblioteca física, donde el wifi es poco confiable — poder seguir viendo lo último que se visitó (catálogo, detalle de un libro) sin señal es el caso de uso real. Issue #41.

## What Changes

- Generar íconos PNG (192×192, 512×512, maskable) + apple-touch-icon a partir del `public/icon.svg` existente y referenciarlos desde `manifest.webmanifest` y el `<head>` (apple-touch-icon).
- Agregar un service worker mínimo, hand-rolled (`public/sw.js`), registrado desde un client component montado una vez en el shell de la app.
- Estrategia de cache **network-first, cache-on-visit**: cualquier GET mismo-origen exitoso (200) se cachea; el cache solo se sirve si la red falla. Sin allowlist de rutas — se autoextiende a lo que el lector visite. Sin precache proactivo de todo el catálogo.
- Escrituras (POST/PATCH/DELETE) sin cambios: si fallan offline, caen en el manejo de errores/toast que ya existe hoy. Sin cola de reintento ni detección online/offline en la UI.
- Sin página `offline.html` custom: una ruta nunca visitada offline muestra la página nativa "sin conexión" del navegador.

**Fuera de alcance** (recortado del issue #41 original, que menciona notificaciones): push notifications / recordatorios de metas de lectura — requieren VAPID keys, una colección de subscriptions y un scheduler que hoy no existe en ningún lugar del repo; sería la primera vez que la app dispara algo sin el lector con la app abierta. Se deja para un issue aparte si se decide encararlo.

## Capabilities

### New Capabilities

- `pwa-install`: manifest completo (íconos en todos los tamaños requeridos, maskable) + meta apple-touch-icon, para que el navegador ofrezca "Agregar a la pantalla de inicio" con el ícono correcto en Android e iOS.
- `offline-cache`: service worker con estrategia network-first cache-on-visit para GETs mismo-origen (HTML y `/api/*`), de forma que lo último visitado siga disponible sin conexión.

### Modified Capabilities

_(ninguna — `app-platform` cubre el servidor Express/Next, no el manifest/PWA; no hay requisitos existentes que cambien)_

## Impact

- **Nuevo**: `public/sw.js`, `components/shell/sw-register.tsx`, íconos PNG en `public/` (192, 512, maskable, apple-touch-icon), un script de generación de íconos (uso único, no queda como dependencia del build).
- **Modificado**: `public/manifest.webmanifest` (nuevos tamaños de ícono), `app/layout.tsx` (monta el registro del SW; apple-touch-icon si Next `metadata` no alcanza).
- **Sin cambios**: ninguna colección Firestore, ningún endpoint de API, ninguna dependencia nueva de producción (los PNG se generan una vez con `sharp`, ya presente transitivamente, y se commitean como assets estáticos).
