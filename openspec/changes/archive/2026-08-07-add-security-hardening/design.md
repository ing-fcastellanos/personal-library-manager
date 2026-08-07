## Context

`server/index.ts` monta cada router de entidad bajo `/api`, todos protegidos en sus rutas de escritura por `requireAuth` (cookie de sesión), con lecturas públicas por ADR-0006. No existe hoy ningún rate-limiting — ni general ni en escritura — y no hay precedente de la librería en `package.json`.

`firebase/firestore.rules` y `firebase/storage.rules` están en deny-by-default total; los dos casos de cliente-directo que ADR-0009 planeó (#3, #27) quedaron como stub comentado y nunca se habilitaron — confirmado por grep, `uploadBytes`/`onSnapshot` no aparecen en ningún lugar de `components/lib/app/services`. La única superficie Firebase cliente-directo viva es Identity Toolkit vía el magic-link de `lib/auth/client.ts`.

Un dato empírico de esta misma sesión: el flujo de restauración de backup (#93) ejecuta hasta ~80 llamadas `POST`/`PATCH`/`DELETE` secuenciales contra `/api/*` en menos de un minuto para una biblioteca de 18 libros — y una biblioteca más grande (el target de `data-model.md` es "cientos a pocos miles de libros") escalaría ese número considerablemente. Cualquier límite de rate-limiting tiene que ser generoso a propósito para no romper ese flujo legítimo (ni el import CSV, que tiene el mismo patrón de ráfaga secuencial).

## Goals / Non-Goals

**Goals:**
- Cortar loops de escritura descontrolados (accidentales o maliciosos) contra el API de Express con una capa barata y sin mantenimiento.
- Dejar un runbook claro y ejecutable para las acciones manuales de hardening que le corresponden al usuario (restricción de API key, protección de Auth) — sin intentar automatizarlas ni tocarlas yo mismo (modificar configuración de seguridad externa está fuera de lo que puedo hacer).
- Documentar la decisión de diferir App Check completo, con el motivo y la condición de reconsideración, para no repetir la investigación de este explore en el futuro.

**Non-Goals:**
- App Check + reCAPTCHA Enterprise (diferido — ver Decisiones).
- Cualquier cambio a `firestore.rules`/`storage.rules` (ya están correctos).
- Rate-limiting en lecturas públicas (`GET`) — fuera del alcance que pidió el issue, y esas rutas son intencionalmente públicas por ADR-0006.
- "Arreglar" el apiKey en `docs/deploy.md` como fix de seguridad — no lo es, es un identificador público.

## Decisions

**App Check completo: diferido, no construido en esta change.**
Protegería Firestore/Storage, que ya están en `allow read, write: if false` — cero superficie que abrir hoy. Construirlo ahora sería invertir esfuerzo real (reCAPTCHA Enterprise, SDK de App Check, debug tokens para el loop de emuladores, testing de que no rompa nada) en una capa que no cambia el postura de seguridad actual en absoluto. Se reconsidera el día que #3 (subida directa a Storage) o una feature #27-shaped (listeners de dashboard) se construyan realmente cliente-directo — en ese momento, App Check debería habilitarse ANTES de abrir esas rules, no después (ver Non-Goals de la #27/#3 originales).

**Rate-limiting: `express-rate-limit`, generoso a propósito, en todo `/api` no-GET.**
Alternativa considerada: limitar router por router (solo donde el issue dice "escritura"). Se descarta por duplicación — un único middleware montado una vez en `server/index.ts`, con un `skip` que deja pasar cualquier `GET`, cubre todas las rutas de escritura de todos los routers (incluida `/api/auth/session`, que también es una escritura y vale la pena cubrir) sin tocar cada router individualmente.

Límite elegido: generoso, pensado para nunca rozarse en uso normal — incluida una restauración de backup grande o un import CSV largo — y solo cortar loops descontrolados. Verificado contra el dato empírico de ~80 llamadas/minuto de una restauración chica; el límite debe tener margen holgado sobre eso incluso escalado a una biblioteca de varios miles de libros. Keying por IP (default de la librería) — a escala de un hogar de 2 lectores, compartir presupuesto por IP es aceptable y no vale la pena la complejidad de keying por sesión.

**Runbook manual, no automatizado.**
Restringir la API key en GCP Console y activar la protección de Auth en Firebase Console son acciones de configuración externa — ni el agente que implementa esta change ni ningún script del repo las ejecuta; quedan documentadas paso a paso en `docs/security-hardening.md` para que el usuario las haga desde las consolas correspondientes.

## Risks / Trade-offs

- **[Riesgo] Un límite mal calibrado corta un flujo legítimo** (restore de una biblioteca grande, import CSV largo) → mitigado eligiendo un límite deliberadamente generoso y verificando contra el dato empírico de esta sesión; tarea de verificación explícita en tasks.md para confirmar que restore/import no lo rozan.
- **[Riesgo] Rate-limiting por IP no protege a los readers entre sí ni contra un atacante con múltiples IPs** → aceptado, es defensa en profundidad de bajo costo, no una solución completa; el issue mismo lo enmarca como eso ("defensa en profundidad").
- **[Trade-off] El runbook depende de que el usuario lo ejecute** — nada en el código lo fuerza ni lo verifica → aceptado, son acciones fuera del alcance de lo que el código puede garantizar.

## Migration Plan

Sin migración de datos. El middleware de rate-limiting es aditivo y no cambia comportamiento salvo al superar el límite (caso que no debería ocurrir en uso normal). El runbook no tiene "deploy" — son pasos que el usuario ejecuta cuando pueda, sin bloquear nada del código.

## Open Questions

Ninguna — alcance y decisiones confirmados en explore.
