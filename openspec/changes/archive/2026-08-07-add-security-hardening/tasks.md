## 1. Rate-limiting

- [x] 1.1 Agregar `express-rate-limit` a `package.json`.
- [x] 1.2 `server/middleware/rate-limit.ts`: middleware con `skip` para `GET`, límite generoso (600 req/min por IP — ~7-8x el dato empírico de ~80 llamadas/minuto de una restauración chica).
- [x] 1.3 Montar el middleware una sola vez en `server/index.ts`, antes de los routers, cubriendo todo `/api/*` no-GET (incluida `/api/auth/session`).
- [x] 1.4 Tests: requests bajo el límite pasan normal; requests por encima del límite devuelven `429`; un `GET` nunca cuenta contra el límite.

## 2. Runbook de hardening manual

- [x] 2.1 `docs/security-hardening.md`: pasos para restringir la API key web en GCP Console (referrer HTTP + APIs permitidas).
- [x] 2.2 En el mismo doc: pasos para activar la protección de abuso/enumeración de email en Firebase Authentication Console.
- [x] 2.3 Sección "Diferido: App Check completo" — por qué se pospone (Firestore/Storage ya en deny-by-default, protegería una puerta cerrada) y cuándo reconsiderarlo (si #3 o una feature #27-shaped se construye cliente-directo, App Check debe habilitarse antes de abrir esas rules).
- [x] 2.4 Revisado, decidido NO hacerlo: `docs/deploy.md` tiene varios valores públicos igual de reales al lado (`messagingSenderId`, `appId`) que quedarían como literales. Poner un placeholder solo en `apiKey` implicaría que esa key es distinta/más sensible que las demás — justo la idea que se corrigió en el explore de esta change. Se deja el bloque tal cual, consistente.

## 3. Verificación

- [x] 3.1 `npm run typecheck` / lint limpios.
- [x] 3.2 Tests de rate-limiting verdes (3/3).
- [x] 3.3 Verificación live real (sesión autenticada vía el truco del REST del emulador de Auth, mismo patrón que #93): se armó un backup sintético de 180 libros + 190 ejemplares (10x la biblioteca real de 18/19) y se restauró a través del `RestoreDialog` real contra los emuladores. Resultado: **~409 llamadas `POST`/`PATCH`/`DELETE` secuenciales en 674.6s (~11.2 min)** — "Restauración completa", sin grupo "Fallidos", limpieza completa de los 19 ejemplares + 18 libros + 1 estante originales. Revisando los ~500 requests capturados (incluida toda la fase de limpieza): **cero respuestas 429**. Tasa sostenida real: ~409 llamadas / 11.2 min ≈ 36 req/min — muy por debajo del límite de 600 req/min (16x de margen), confirmando la razón de diseño: la tasa está limitada por la latencia de red/Firestore, no por el volumen total, así que esto generaliza a bibliotecas aún más grandes sin acercarse al límite. Datos sintéticos limpiados después (biblioteca de prueba vuelta a 0 libros/ejemplares/estantes, los 2 readers reales intactos con sus mismos ids).
- [x] 3.4 `npm test` completo sin regresiones — 107/107 archivos, 659/659 tests, sin flakes.
