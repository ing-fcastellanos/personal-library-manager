## Why

El issue #42 pide App Check + reCAPTCHA Enterprise + restricción de API key para producción. Investigando en explore: `firebase/firestore.rules` y `firebase/storage.rules` ya están en deny-by-default total (`allow read, write: if false`), con los únicos casos de cliente-directo que ADR-0009 planeó (#3 subida de fotos a Storage, #27 listeners de dashboard) dejados como stub comentado y nunca habilitados — la app terminó siendo 100% server-mediated. App Check en Firestore/Storage protegería hoy una puerta que ya está cerrada; se documenta como decisión diferida en vez de construirse ahora.

La única superficie cliente-directo viva es Identity Toolkit (Firebase Auth, vía el magic-link del login). El riesgo ahí es real pero acotado a molestia (spam de emails de "iniciá sesión", ruido de cuota) — no a toma de sesión, porque la membership cerrada (ADR-0012) rechaza cualquier email que no matchee un reader existente. Esta change cubre las mitigaciones de menor costo que sí valen la pena ahora, y deja un runbook documentado para cuando App Check completo sea necesario.

## What Changes

- **Rate-limiting en los endpoints de escritura de Express** (`requireAuth`-gated) con `express-rate-limit` — defensa en profundidad sobre el API que sirve todos los datos reales de la app (server-mediated, ADR-0009), independiente de cualquier decisión sobre Firebase App Check.
- **Runbook documentado** (`docs/security-hardening.md`) con los pasos manuales que el usuario debe ejecutar él mismo en GCP Console / Firebase Console: restricción de la API key web (referrer HTTP + APIs permitidas) y activación de la protección de abuso/enumeración de email ya integrada en Firebase Authentication (sin necesidad del SDK de App Check ni reCAPTCHA Enterprise).
- **Decisión diferida documentada**: por qué App Check + reCAPTCHA Enterprise completo no se construye en esta change, y cuándo reconsiderarlo (cuando #3 o una feature #27-shaped se construya realmente cliente-directo).

**Fuera de alcance** (recortado del issue #42 original): App Check + reCAPTCHA Enterprise (diferido); Firebase Authentication como capa adicional en los caminos de cliente directo (el issue lo marca opcional, y esos caminos hoy no existen); cualquier cambio a `firestore.rules`/`storage.rules` (ya están correctos).

## Capabilities

### New Capabilities

_(ninguna — sin comportamiento nuevo testeable del lado del sistema para el runbook, que es documentación/acciones manuales)_

### Modified Capabilities

- `app-platform`: agrega rate-limiting a las rutas de escritura de Express como una nueva responsabilidad del servidor, junto al resto de la infraestructura cross-cutting que ya cubre esta capability (health endpoint, puerto configurable, scripts reproducibles).

## Impact

- **Nuevo**: dependencia `express-rate-limit`; middleware de rate-limiting en `server/middleware/`; `docs/security-hardening.md`.
- **Modificado**: `server/index.ts` (o cada router de escritura) para aplicar el middleware; posiblemente `docs/deploy.md` (reemplazar el valor real de la API key por un placeholder, higiene menor — no es un fix de seguridad, el valor no es un secreto).
- **Sin cambios**: `firestore.rules`, `storage.rules`, ningún endpoint de lectura pública, ningún flujo de autenticación.
